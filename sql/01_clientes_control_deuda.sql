-- ============================================================
-- (Rama-Sebastian): Control de deuda en tabla clientes
-- ============================================================
-- Agrega los campos necesarios para llevar el control de deuda
-- de cada cliente registrado en el sistema.
--
-- Campos:
--   - limite_deuda           : monto máximo de deuda permitido (obligatorio)
--   - deuda_actual           : deuda acumulada actual (default 0)
--   - fecha_vencimiento_deuda: fecha límite de pago (opcional)
--   - activo                 : indica si el cliente está habilitado
-- ============================================================

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS limite_deuda             NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deuda_actual             NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_deuda  DATE          NULL,
  ADD COLUMN IF NOT EXISTS activo                   BOOLEAN       NOT NULL DEFAULT TRUE;

-- Reglas mínimas de integridad
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_limite_deuda_no_negativo;
ALTER TABLE clientes
  ADD CONSTRAINT clientes_limite_deuda_no_negativo
  CHECK (limite_deuda >= 0);

ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_deuda_actual_no_negativa;
ALTER TABLE clientes
  ADD CONSTRAINT clientes_deuda_actual_no_negativa
  CHECK (deuda_actual >= 0);

-- Si hay deuda, debe poder registrarse una fecha de vencimiento.
-- (No es obligatoria, pero si se llena, no puede ir vacía cuando deuda > 0).
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_fecha_vencimiento_si_deuda;
ALTER TABLE clientes
  ADD CONSTRAINT clientes_fecha_vencimiento_si_deuda
  CHECK (
    deuda_actual = 0
    OR fecha_vencimiento_deuda IS NOT NULL
  );

-- Índice útil para listar morosos / clientes activos
CREATE INDEX IF NOT EXISTS idx_clientes_activo          ON clientes (activo);
CREATE INDEX IF NOT EXISTS idx_clientes_vencimiento     ON clientes (fecha_vencimiento_deuda);
