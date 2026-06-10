-- Validación server-side de pedidos en Supabase (ejecutar en SQL Editor).
-- Evalúa deuda/umbral y persiste estado pendiente o cancelado (según pedidos_estado_check).

CREATE OR REPLACE FUNCTION public.crear_pedido_validado(
  p_cliente_id bigint,
  p_total numeric,
  p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente clientes%ROWTYPE;
  v_estado text;
  v_motivo text;
  v_pedido_id bigint;
  v_deuda numeric;
  v_limite numeric;
BEGIN
  SELECT * INTO v_cliente FROM clientes WHERE id = p_cliente_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  v_deuda := COALESCE(v_cliente.deuda_actual, 0);
  v_limite := COALESCE(v_cliente.limite_deuda, 0);

  IF v_cliente.activo IS FALSE THEN
    v_estado := 'cancelado';
    v_motivo := 'Cliente bloqueado (cuenta inactiva).';
  ELSIF v_cliente.fecha_vencimiento_deuda IS NOT NULL
        AND v_cliente.fecha_vencimiento_deuda < CURRENT_DATE
        AND v_deuda > 0 THEN
    v_estado := 'cancelado';
    v_motivo := 'Cliente moroso.';
  ELSIF v_limite > 0 AND v_deuda >= v_limite THEN
    v_estado := 'cancelado';
    v_motivo := 'Cliente con límite de deuda superado.';
  ELSIF v_limite > 0 AND (v_deuda + p_total) > v_limite THEN
    v_estado := 'cancelado';
    v_motivo := 'El pedido supera el umbral disponible.';
  ELSE
    v_estado := 'pendiente';
    v_motivo := '';
  END IF;

  INSERT INTO pedidos (fecha, cliente_id, observaciones, total, estado)
  VALUES (now(), p_cliente_id, p_observaciones, p_total, v_estado)
  RETURNING id INTO v_pedido_id;

  IF v_estado = 'pendiente' THEN
    UPDATE clientes
    SET deuda_actual = v_deuda + p_total
    WHERE id = p_cliente_id;
  END IF;

  RETURN jsonb_build_object(
    'pedido_id', v_pedido_id,
    'estado', v_estado,
    'motivo', v_motivo,
    'procesado', v_estado = 'pendiente'
  );
END;
$$;
