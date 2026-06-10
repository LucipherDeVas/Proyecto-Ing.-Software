-- Este script no modifica datos. Muestra el estado final de la instalacion.

SELECT
  t.table_name,
  c.relrowsecurity AS rls_activo
FROM information_schema.tables t
JOIN pg_catalog.pg_class c
  ON c.relname = t.table_name
JOIN pg_catalog.pg_namespace n
  ON n.oid = c.relnamespace
 AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'clientes',
    'productos',
    'pedidos',
    'detalle_pedido'
  )
ORDER BY t.table_name;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'clientes',
    'productos',
    'pedidos',
    'detalle_pedido'
  )
ORDER BY table_name, ordinal_position;

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'clientes',
    'productos',
    'pedidos',
    'detalle_pedido'
  )
ORDER BY tablename, policyname;

SELECT id, nombre, precio_unitario
FROM public.productos
ORDER BY id;
