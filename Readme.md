========================================
REGISTRO DE CLIENTES — QUÉ CONFIGURAR
========================================


--- BASE DE DATOS (Supabase) ---

Ejecutar este SQL en el SQL Editor del proyecto:

CREATE TABLE clientes (
  id              BIGSERIAL PRIMARY KEY,
  tipo            TEXT NOT NULL CHECK (tipo IN ('empresa', 'persona')),
  rut             TEXT NOT NULL UNIQUE,
  correo          TEXT,
  telefono        TEXT,
  direccion       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  razon_social    TEXT,
  giro            TEXT,
  nombre_contacto TEXT,
  cargo_contacto  TEXT,
  nombre          TEXT,
  apellido        TEXT
);


--- CÓDIGO (RegistroCliente.js) ---

Línea 4 — cambiar false por true:

  const USAR_SUPABASE = true;

Eso es todo. El formulario empieza a guardar en Supabase.