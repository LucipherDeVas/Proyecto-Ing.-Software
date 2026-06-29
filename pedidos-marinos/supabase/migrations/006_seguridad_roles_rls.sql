-- ============================================================
-- 006_seguridad_roles_rls.sql
-- Seguridad: validación de crédito en el servidor (RPC),
-- helper de rol de administrador y RLS endurecida.
--
-- Reemplaza las políticas permisivas de 003 (USING(true)).
-- Requiere haber ejecutado 001–003 antes.
--
-- ROL ADMIN: un usuario es administrador si su metadata de auth
-- tiene rol = 'admin'.
-- ============================================================

BEGIN;

-- ── Helper: ¿el usuario actual es administrador? ────────────
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'admin',
    false
  );
$$;

-- ── Helper: ¿la fila de cliente pertenece al usuario actual? ─
CREATE OR REPLACE FUNCTION public.es_mi_cliente(p_cliente_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = p_cliente_id
      AND c.auth_user_id = auth.uid()
  );
$$;

-- ── RPC: crear pedido validado en el servidor ───────────────
-- Reimplementa utils/clienteDeuda.js:evaluarPedido del lado servidor
-- para que la validación de crédito NO dependa del cliente.
CREATE OR REPLACE FUNCTION public.crear_pedido_validado(
  p_cliente_id    bigint,
  p_total         numeric,
  p_observaciones text DEFAULT NULL,
  p_detalles      jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente   public.clientes%ROWTYPE;
  v_estado    text := 'pendiente';
  v_motivo    text := '';
  v_aceptado  boolean := true;
  v_pedido_id bigint;
  v_disp      numeric;
  d           jsonb;
BEGIN
  SELECT * INTO v_cliente FROM public.clientes WHERE id = p_cliente_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('aceptado', false, 'estado', 'cancelado',
                              'motivo', 'Cliente no encontrado.', 'deuda_actual', 0);
  END IF;

  -- total <= 0: no se registra pedido (constraint total > 0)
  IF coalesce(p_total, 0) <= 0 THEN
    RETURN jsonb_build_object('aceptado', false, 'estado', 'cancelado',
      'motivo', 'El total del pedido debe ser mayor a cero.',
      'deuda_actual', v_cliente.deuda_actual);
  END IF;

  -- Reglas de bloqueo / crédito (espejo de evaluarPedido)
  IF v_cliente.activo = false THEN
    v_aceptado := false; v_estado := 'cancelado';
    v_motivo := 'Cliente bloqueado (cuenta inactiva).';
  ELSIF v_cliente.deuda_actual > 0
        AND v_cliente.fecha_vencimiento_deuda IS NOT NULL
        AND v_cliente.fecha_vencimiento_deuda < current_date THEN
    v_aceptado := false; v_estado := 'cancelado';
    v_motivo := 'Cliente moroso: la deuda tiene fecha de vencimiento vencida.';
  ELSIF v_cliente.limite_deuda > 0
        AND v_cliente.deuda_actual >= v_cliente.limite_deuda THEN
    v_aceptado := false; v_estado := 'cancelado';
    v_motivo := 'Cliente con límite de deuda superado.';
  ELSIF v_cliente.limite_deuda > 0
        AND (v_cliente.deuda_actual + p_total) > v_cliente.limite_deuda THEN
    v_aceptado := false; v_estado := 'cancelado';
    v_disp := greatest(v_cliente.limite_deuda - v_cliente.deuda_actual, 0);
    v_motivo := 'El pedido supera el umbral disponible. Crédito restante: $'
                || to_char(v_disp, 'FM999G999G999');
  END IF;

  -- Registra el pedido (pendiente o cancelado)
  INSERT INTO public.pedidos (cliente_id, observaciones, total, estado)
  VALUES (
    p_cliente_id,
    nullif(btrim(coalesce(p_observaciones, '')), ''),
    p_total,
    v_estado
  )
  RETURNING id INTO v_pedido_id;

  -- Solo si fue aceptado: detalle + suma de deuda
  IF v_aceptado THEN
    FOR d IN SELECT * FROM jsonb_array_elements(coalesce(p_detalles, '[]'::jsonb))
    LOOP
      INSERT INTO public.detalle_pedido
        (pedido_id, producto, cantidad, precio_unitario, subtotal)
      VALUES (
        v_pedido_id,
        d->>'producto',
        (d->>'cantidad')::numeric,
        (d->>'precio_unitario')::numeric,
        (d->>'subtotal')::numeric
      );
    END LOOP;

    UPDATE public.clientes
    SET deuda_actual = deuda_actual + p_total
    WHERE id = p_cliente_id
    RETURNING deuda_actual INTO v_cliente.deuda_actual;
  END IF;

  RETURN jsonb_build_object(
    'aceptado', v_aceptado,
    'estado', v_estado,
    'motivo', v_motivo,
    'pedido_id', v_pedido_id,
    'deuda_actual', v_cliente.deuda_actual
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_pedido_validado(bigint, numeric, text, jsonb)
  TO authenticated;

-- ============================================================
-- RLS ENDURECIDA — reemplaza las políticas permisivas de 003
-- ============================================================

-- ── clientes ────────────────────────────────────────────────
DROP POLICY IF EXISTS clientes_acceso_autenticado ON public.clientes;

-- El cliente ve su propia fila; el admin ve todas. (anon conserva
-- la política de consulta para el registro, definida en 003.)
DROP POLICY IF EXISTS clientes_select_propio ON public.clientes;
CREATE POLICY clientes_select_propio
ON public.clientes FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR public.es_admin());

-- Alta de la propia ficha durante el registro (o admin).
DROP POLICY IF EXISTS clientes_insert_propio ON public.clientes;
CREATE POLICY clientes_insert_propio
ON public.clientes FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid() OR public.es_admin());

-- Modificar deuda/límite/activo/etc.: SOLO admin.
DROP POLICY IF EXISTS clientes_update_admin ON public.clientes;
CREATE POLICY clientes_update_admin
ON public.clientes FOR UPDATE TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS clientes_delete_admin ON public.clientes;
CREATE POLICY clientes_delete_admin
ON public.clientes FOR DELETE TO authenticated
USING (public.es_admin());

-- ── productos ───────────────────────────────────────────────
-- Lectura pública (catálogo); escritura solo admin.
DROP POLICY IF EXISTS productos_gestion_autenticada ON public.productos;
DROP POLICY IF EXISTS productos_escritura_admin ON public.productos;
CREATE POLICY productos_escritura_admin
ON public.productos FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ── pedidos ─────────────────────────────────────────────────
DROP POLICY IF EXISTS pedidos_acceso_autenticado ON public.pedidos;

-- El cliente ve sus pedidos; el admin ve todos.
DROP POLICY IF EXISTS pedidos_select ON public.pedidos;
CREATE POLICY pedidos_select
ON public.pedidos FOR SELECT TO authenticated
USING (public.es_mi_cliente(cliente_id) OR public.es_admin());

-- INSERT/UPDATE/DELETE directos: solo admin.
-- El cliente crea pedidos vía la RPC crear_pedido_validado (SECURITY DEFINER).
DROP POLICY IF EXISTS pedidos_escritura_admin ON public.pedidos;
CREATE POLICY pedidos_escritura_admin
ON public.pedidos FOR INSERT TO authenticated
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS pedidos_update_admin ON public.pedidos;
CREATE POLICY pedidos_update_admin
ON public.pedidos FOR UPDATE TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS pedidos_delete_admin ON public.pedidos;
CREATE POLICY pedidos_delete_admin
ON public.pedidos FOR DELETE TO authenticated
USING (public.es_admin());

-- ── detalle_pedido ──────────────────────────────────────────
DROP POLICY IF EXISTS detalle_pedido_acceso_autenticado ON public.detalle_pedido;

DROP POLICY IF EXISTS detalle_select ON public.detalle_pedido;
CREATE POLICY detalle_select
ON public.detalle_pedido FOR SELECT TO authenticated
USING (
  public.es_admin()
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = detalle_pedido.pedido_id
      AND public.es_mi_cliente(p.cliente_id)
  )
);

DROP POLICY IF EXISTS detalle_escritura_admin ON public.detalle_pedido;
CREATE POLICY detalle_escritura_admin
ON public.detalle_pedido FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

COMMIT;
