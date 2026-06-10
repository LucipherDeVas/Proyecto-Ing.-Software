-- Politicas para el funcionamiento del proyecto academico actual.
-- Los usuarios autenticados pueden administrar los datos compartidos.
-- Antes de produccion se deben separar permisos de cliente y administrador.

BEGIN;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_pedido ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clientes FROM anon, authenticated;
REVOKE ALL ON public.productos FROM anon, authenticated;
REVOKE ALL ON public.pedidos FROM anon, authenticated;
REVOKE ALL ON public.detalle_pedido FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- El formulario consulta id por RUT/correo antes de crear la cuenta.
GRANT SELECT (id, rut, correo) ON public.clientes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;

GRANT SELECT ON public.productos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detalle_pedido TO authenticated;

DROP POLICY IF EXISTS clientes_consulta_registro ON public.clientes;
CREATE POLICY clientes_consulta_registro
ON public.clientes
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS clientes_acceso_autenticado ON public.clientes;
CREATE POLICY clientes_acceso_autenticado
ON public.clientes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS productos_lectura_publica ON public.productos;
CREATE POLICY productos_lectura_publica
ON public.productos
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS productos_gestion_autenticada ON public.productos;
CREATE POLICY productos_gestion_autenticada
ON public.productos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS pedidos_acceso_autenticado ON public.pedidos;
CREATE POLICY pedidos_acceso_autenticado
ON public.pedidos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS detalle_pedido_acceso_autenticado
  ON public.detalle_pedido;
CREATE POLICY detalle_pedido_acceso_autenticado
ON public.detalle_pedido
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
