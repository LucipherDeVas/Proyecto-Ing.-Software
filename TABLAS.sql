-- ============================================================
-- TABLAS.sql — estructura para Supabase
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- cuando tengas acceso a la base de datos.
-- ============================================================

-- ── clientes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo                    TEXT    NOT NULL DEFAULT 'persona', -- 'persona' | 'empresa'
  rut                     TEXT    NOT NULL UNIQUE,
  nombre                  TEXT,
  apellido                TEXT,
  razon_social            TEXT,
  giro                    TEXT,
  nombre_contacto         TEXT,
  correo                  TEXT    UNIQUE,
  telefono                TEXT,
  direccion               TEXT,
  limite_deuda            NUMERIC(12,2) DEFAULT 0,
  deuda_actual            NUMERIC(12,2) DEFAULT 0,
  fecha_vencimiento_deuda DATE,
  activo                  BOOLEAN DEFAULT TRUE,
  auth_user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── productos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.productos (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre          TEXT    NOT NULL UNIQUE,
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0),
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── pedidos ──────────────────────────────────────────────────
-- Esta es la tabla principal que lee la vista de Reportes.
CREATE TABLE IF NOT EXISTS public.pedidos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id    BIGINT REFERENCES public.clientes(id) ON DELETE SET NULL,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── detalle_pedido ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.detalle_pedido (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id       BIGINT NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto        TEXT   NOT NULL,
  cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha      ON public.pedidos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON public.pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos (cliente_id);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_pedido ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer todo
CREATE POLICY "leer_clientes"       ON public.clientes       FOR SELECT TO authenticated USING (true);
CREATE POLICY "leer_productos"      ON public.productos      FOR SELECT TO authenticated USING (true);
CREATE POLICY "leer_pedidos"        ON public.pedidos        FOR SELECT TO authenticated USING (true);
CREATE POLICY "leer_detalle"        ON public.detalle_pedido FOR SELECT TO authenticated USING (true);

-- Solo el propio cliente puede insertar pedidos
CREATE POLICY "insertar_pedido_propio" ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (
    cliente_id IN (
      SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()
    )
  );
