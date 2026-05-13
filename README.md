# Rama-Sebastian
## Modificación 1: Control de deuda en clientes

Esta rama parte del proyecto de Vicente (`Carpeta-Vicente`, `RegistroCliente`) y agrega control de deuda a la tabla `clientes`.

## Campos nuevos en `clientes`

| Campo | Tipo | Regla |
|---|---|---|
| `limite_deuda` | NUMERIC(12,2) | **Obligatorio** desde el formulario, >= 0 |
| `deuda_actual` | NUMERIC(12,2) | Default `0`, no negativo. Siempre arranca en 0 al registrar |
| `fecha_vencimiento_deuda` | DATE | Opcional. Requerido si `deuda_actual > 0` |
| `activo` | BOOLEAN | Default `TRUE` |

## Archivos modificados / agregados

- [src/views/RegistroCliente.js](src/views/RegistroCliente.js) — nueva sección "Control de deuda", validación de `limite_deuda` obligatorio, `deuda_actual` forzado a 0 al insertar, checkbox `activo`, render de los campos en la lista demo.
- [sql/00_clientes_tabla_base.sql](sql/00_clientes_tabla_base.sql) — creación de la tabla `clientes` con todos los campos (empresa + persona).
- [sql/01_clientes_control_deuda.sql](sql/01_clientes_control_deuda.sql) — migración con `ALTER TABLE` + CHECK constraints + índices.
- [sql/02_clientes_unicidad.sql](sql/02_clientes_unicidad.sql) — índices únicos para `rut` y `LOWER(correo)`.
- [src/services/clientesService.js](src/services/clientesService.js) — servicio reutilizable con `buscarClientePorRut`, `buscarClientePorCorreo`, `validarClienteDuplicado` y `listarClientes`.
- [package.json](package.json) — renombrado a `registro-clientes-deuda`.

## Modificación 2 — Validaciones del componente

Reglas implementadas en `validar()` y en `handleEnviar()`:

| Regla | Dónde |
|---|---|
| `rut` obligatorio | `validar()` |
| `tipo` ∈ {empresa, persona} | `validar()` |
| Empresa: `razon_social`, `giro`, `nombre_contacto` obligatorios | `validar()` |
| Persona: `nombre`, `apellido`, `correo` obligatorios | `validar()` |
| `correo` con formato válido si está presente | `validar()` |
| `limite_deuda` obligatorio y ≥ 0 | `validar()` |
| `deuda_actual = 0` al insertar (no se pide) | `handleEnviar()` |
| RUT único — demo: en memoria. Supabase: SELECT previo + índice `uq_clientes_rut` | `validar()` + `handleEnviar()` + SQL |
| Correo único (si no está vacío) — demo: en memoria. Supabase: SELECT previo + índice parcial `uq_clientes_correo` | `validar()` + `handleEnviar()` + SQL |

Mensajes de error específicos: *"Ya existe un cliente con ese RUT."* / *"Ya existe un cliente con ese correo."*

## Modificación 3 — Servicio reutilizable de duplicados

Archivo: [src/services/clientesService.js](src/services/clientesService.js)

```js
buscarClientePorRut(rut)        // → cliente | null
buscarClientePorCorreo(correo)  // → cliente | null  (no consulta si correo vacío)
validarClienteDuplicado({ rut, correo })
// → { duplicado: boolean, campo: 'rut' | 'correo' | null, mensaje: string }
listarClientes()                // → Array<cliente>  (usado por el Dashboard)
```

`RegistroCliente.handleEnviar` delega el chequeo en `validarClienteDuplicado` antes de insertar el cliente cuando `USAR_SUPABASE = true`.

## Modificación 4 — Variables de entorno (.env)

- [.env](.env) — credenciales reales (no se sube al repo).
- [.env.example](.env.example) — plantilla.
- [.gitignore](.gitignore) — incluye `.env`.

Variables esperadas:
```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=...
```

[src/lib/supabase.js](src/lib/supabase.js) ya las consume vía `process.env`.

## Modificación 5 — Reorganización en carpetas

```
src/
├── lib/
│   └── supabase.js
├── services/
│   └── clientesService.js
└── views/
    ├── RegistroCliente.js / .css
    └── DashboardClientesDeuda.js / .css
```

[src/App.js](src/App.js) agrega una barra de navegación con dos botones (`Registro de clientes` / `Dashboard de deuda`) en lugar de `react-router` para mantener cero dependencias nuevas.

## Modificación 6 — Vista DashboardClientesDeuda

Archivo: [src/views/DashboardClientesDeuda.js](src/views/DashboardClientesDeuda.js)

Tabla con 10 columnas (cliente, tipo, RUT, correo, teléfono, deuda, límite, % usado, vencimiento, estado).

**Reglas de estado financiero** (prioridad: la primera que matchea gana):

1. `deuda_actual <= 0` → **Sin deuda**
2. `fecha_vencimiento_deuda` pasada y `deuda > 0` → **Moroso** (prioridad sobre límite)
3. `limite > 0 && deuda >= limite` → **Límite superado**
4. `limite > 0 && deuda / limite >= 0.8 && deuda < limite` → **Cercano al límite**
5. resto → **Con deuda**

**División por cero**: cuando `limite_deuda = 0`, `% usado` muestra `—` y las reglas 3/4 se saltan (cae a "Con deuda" o "Sin deuda" según corresponda).

**Funcionalidades:**
- Buscador por nombre / RUT / correo (case-insensitive).
- Filtro por estado financiero (dropdown con los 5 estados).
- Botón `↻ Recargar` → re-ejecuta `listarClientes()`.
- Montos en formato CLP (`Intl.NumberFormat('es-CL', { style: 'currency' })`).
- Empresa → muestra `razon_social`; persona → `nombre + apellido`.
- Badges con colores por estado (verde, azul, amarillo, rojo, negro).

## Modificación 7 — Formato estricto de RUT, teléfono y fecha

[src/views/RegistroCliente.js](src/views/RegistroCliente.js)

| Campo | Regla | Mensaje de error |
|---|---|---|
| **RUT** | Regex `/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/` — acepta 7 u 8 dígitos. DV puede ser `0-9` o `K`. | *"El RUT debe tener el formato x.xxx.xxx-x o xx.xxx.xxx-x (ej: 12.345.678-9)."* |
| **Teléfono** *(opcional)* | Regex `/^\+\d{8,15}$/` — empieza con `+` y solo dígitos. | *"El teléfono debe comenzar con + y contener solo dígitos (ej: +56912345678)."* |
| **Fecha vencimiento** *(opcional)* | `> hoy` a medianoche local. Input HTML también lleva `min={mañana}`. | *"La fecha de vencimiento debe ser mayor al día actual."* |

### Auto-formateo del RUT al escribir

Helper exportado [`formatearRut()`](src/views/RegistroCliente.js) ejecutado en cada `onChange`. El usuario escribe el número crudo y los puntos / guion / mayúscula aparecen solos.

| Lo que digita el usuario | Lo que aparece en el campo |
|---|---|
| `211845923` | `21.184.592-3` |
| `41234563` | `4.123.456-3` |
| `12345678k` | `12.345.678-K` |
| `4 123 456 3` (al pegar) | `4.123.456-3` |
| `12` (mid-typing) | `1-2` |

Lógica: limpia todo lo que no sea dígito o `K`, mayúsculiza la K, toma el último carácter como dígito verificador y agrupa el cuerpo en bloques de 3 desde la derecha.

## Modificación 8 — Tests automatizados

Suite con **49 tests** en 3 archivos. Ejecutar con `npm test -- --watchAll=false`.

| Archivo | Tests | Cubre |
|---|---|---|
| [src/App.test.js](src/App.test.js) | 3 | Navegación entre vistas (mockeando las hijas para no tocar Supabase) |
| [src/views/RegistroCliente.test.js](src/views/RegistroCliente.test.js) | 22 | Helper `formatearRut()`, formato RUT (7/8 dígitos, K, auto-formateo), formato teléfono, fecha vencimiento futura |
| [src/views/DashboardClientesDeuda.test.js](src/views/DashboardClientesDeuda.test.js) | 24 | Helpers `calcularEstado` / `porcentajeUsado` / `nombreCliente`, render de tabla, buscador, filtro por estado, botón recargar, manejo de error, formato CLP, división por cero |

**Resultado:** `Tests: 49 passed, 49 total`.

El servicio `clientesService` se mockea con `jest.mock` en los tests del Dashboard para evitar llamadas reales a Supabase.

## Cómo aplicar en Supabase

1. Crear las claves en [.env](.env) (`REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_PUBLISHABLE_KEY`).
2. Ejecutar en el SQL editor del proyecto Supabase, en orden:
   - `sql/00_clientes_tabla_base.sql`
   - `sql/01_clientes_control_deuda.sql`
   - `sql/02_clientes_unicidad.sql`
3. Verificar que [src/views/RegistroCliente.js](src/views/RegistroCliente.js#L4) tiene `USAR_SUPABASE = true`.
4. `npm install && npm start` → abrir http://localhost:3000.
