-- ============================================================
-- Crear tabla base `clientes` (ejecutar ANTES de 01 y 02)
-- ============================================================
-- Esquema mínimo para el formulario RegistroCliente:
-- soporta empresas y personas en la misma tabla (campos por tipo nulables).
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('empresa', 'persona')),

  rut             TEXT NOT NULL,
  correo          TEXT NULL,
  telefono        TEXT NULL,
  direccion       TEXT NULL,

  -- Solo empresa
  razon_social    TEXT NULL,
  giro            TEXT NULL,
  nombre_contacto TEXT NULL,
  cargo_contacto  TEXT NULL,

  -- Solo persona
  nombre          TEXT NULL,
  apellido        TEXT NULL
);

-- Coherencia mínima de campos por tipo
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_campos_por_tipo;
ALTER TABLE clientes
  ADD CONSTRAINT clientes_campos_por_tipo
  CHECK (
    (tipo = 'empresa' AND razon_social IS NOT NULL AND giro IS NOT NULL AND nombre_contacto IS NOT NULL)
    OR
    (tipo = 'persona' AND nombre IS NOT NULL AND apellido IS NOT NULL AND correo IS NOT NULL)
  );
