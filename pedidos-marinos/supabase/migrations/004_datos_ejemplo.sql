-- Datos opcionales para probar el formulario de productos.

INSERT INTO public.productos (nombre, precio_unitario)
VALUES
  ('Salmon fresco', 15000),
  ('Merluza entera', 8000),
  ('Camaron grande', 25000)
ON CONFLICT (nombre) DO UPDATE
SET precio_unitario = EXCLUDED.precio_unitario;
