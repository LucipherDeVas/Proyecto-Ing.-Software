-- ============================================================
--  (Rama-Sebastian): Unicidad de RUT y correo en clientes
-- ============================================================
-- Refuerza a nivel BD las validaciones que ya hace el formulario,
-- para que dos clientes no puedan compartir RUT ni correo.
--
-- Notas:
--   - El índice de correo es parcial: solo aplica cuando hay valor,
--     porque correo es opcional para empresas.
--   - El RUT se considera siempre obligatorio en el formulario.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_rut
  ON clientes (rut);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_correo
  ON clientes (LOWER(correo))
  WHERE correo IS NOT NULL AND correo <> '';
