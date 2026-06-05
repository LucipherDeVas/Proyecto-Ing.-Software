# Vista de Reportes — Pedidos Marinos

Módulo autónomo de React que muestra el **histórico de pedidos** con filtros interactivos. Funciona completamente en memoria (modo demo) y está preparado para conectarse a Supabase cuando se tenga acceso a la base de datos (actualmente no tengo acceso a la base, así que no me puedo conectar xdxd).

---

## Contenido del proyecto

```
pedidos-reportes/
├── package.json                  Dependencias y scripts npm
├── TABLAS.sql                    SQL para crear las tablas en Supabase
├── public/
│   └── index.html                HTML base de la app
└── src/
    ├── index.js                  Punto de entrada React
    ├── App.js                    Componente raíz (monta la vista)
    ├── App.css                   Estilos globales y clases base (rc-*, dc-*)
    └── pages/
        ├── Reportes.jsx          Vista principal de reportes
        └── css/
            └── Reportes.css     Estilos específicos de la vista
```

---

## Qué hace la vista

La vista de **Reportes** es un histórico de pedidos que permite al equipo revisar y analizar el comportamiento de ventas. Incluye:

### Tarjetas de métricas
En la parte superior hay 5 tarjetas que se actualizan en tiempo real conforme se aplican filtros:

- **Pedidos** — cantidad total de pedidos visibles
- **Total facturado** — suma de los montos en pantalla (formato CLP)
- **Entregados** — cantidad de pedidos con estado `entregado`
- **Pendientes** — cantidad de pedidos con estado `pendiente`
- **Cancelados** — cantidad de pedidos con estado `cancelado`

### Filtros
Cuatro filtros combinables entre sí:

| Filtro | Descripción |
|---|---|
| **Buscar** | Texto libre: filtra por nombre de cliente, RUT o número de pedido |
| **Estado** | Desplegable: Todos / Pendiente / Entregado / Cancelado |
| **Desde** | Fecha mínima del rango (incluye el día seleccionado) |
| **Hasta** | Fecha máxima del rango (incluye el día seleccionado hasta las 23:59) |

El botón **✕ Limpiar** aparece automáticamente cuando hay algún filtro activo y restablece todos a su valor por defecto.

### Tabla de pedidos
Columnas: N° pedido, Fecha, Hora, Cliente, RUT, Estado, Total, Observaciones.

- Franja de color lateral por fila según estado (verde / amarillo / rojo)
- Badges de estado con colores diferenciados
- Observaciones expandibles (botón **▼ Ver** / **▲ Ocultar**)
- Botón **↻ Recargar** para volver a cargar los datos

### Pie de tabla
Muestra cuántos pedidos se están mostrando del total, e indica si hay filtros activos y el monto total visible.

---

## Cómo ejecutarlo (modo demo)

No requiere conexión a ninguna base de datos. Los datos de prueba están incluidos directamente en `Reportes.jsx`.

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

El modo demo incluye **15 pedidos de prueba** distribuidos en los últimos 40 días, con los siguientes clientes y estados:

| Cliente | Estado |
|---|---|
| Juan Pérez | entregado, pendiente, cancelado |
| ACME Pesca SA | entregado, cancelado |
| Morosa SpA | entregado, cancelado |
| Sur Marino Ltda | entregado, pendiente |

---

## Cómo conectarlo a Supabase

Cuando se tenga acceso al proyecto de Supabase, se deben seguir estos pasos en orden.

### Paso 1 — Crear las tablas en la base de datos

Hay que pegar el contenido del archivo `TABLAS.sql` y ejecutarlo.

Esto creará las siguientes tablas:

- `clientes` — datos de los clientes (persona o empresa)
- `productos` — catálogo de productos con precio unitario
- `pedidos` — registro de cada pedido con estado, total y observaciones
- `detalle_pedido` — líneas individuales de cada pedido (producto, cantidad, subtotal)

También crea los índices de rendimiento y las políticas de seguridad (Row Level Security) necesarias para que los usuarios autenticados puedan leer y registrar pedidos.

### Paso 2 — Instalar el cliente de Supabase

Si aún no está instalado en el proyecto:

```bash
npm install @supabase/supabase-js
```

### Paso 3 — Agregar las credenciales

Crear el archivo `src/lib/supabase.js` con el siguiente contenido, reemplazando los valores con los de tu proyecto (los encuentras en **Project Settings → API** dentro del dashboard de Supabase):

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
### Paso 4 — Activar el modo Supabase en Reportes.jsx

Abre `src/pages/Reportes.jsx` y realiza dos cambios:

**Cambio 1** — en la línea 17, cambia el valor de la constante:

```js
// Antes:
const USAR_SUPABASE = false;

// Después:
const USAR_SUPABASE = true;
```

**Cambio 2** — en la línea 20, descomenta la importación:

```js
// Antes:
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient('TU_URL', 'TU_ANON_KEY');

// Después:
import { supabase } from '../lib/supabase';
```

El bloque de la función `fetchPedidos()` que hace la consulta real ya está escrito y comentado en el archivo. Una vez que descomentes el import, también descomenta ese bloque (líneas ~55–75) y comenta o elimina la línea `return PEDIDOS_DEMO`.

### Paso 5 — Verificar

Reinicia el servidor si estaba corriendo:

```bash
npm start
```

La vista cargará los pedidos reales desde tu base de datos. Las tarjetas de métricas y los filtros seguirán funcionando de la misma manera, ahora con datos reales.

---


*si se acopla al proyecto principal, no deberia de haber problema con las creaciones de tablas, ya que ya deberian estar creadas*





## Estructura de las tablas relevantes para esta vista

La consulta que hace `Reportes.jsx` a Supabase une las tablas `pedidos` y `clientes`:

```
pedidos
  id            → número de pedido
  fecha         → timestamp del pedido
  estado        → 'pendiente' | 'entregado' | 'cancelado'
  total         → monto total en CLP
  observaciones → texto libre (opcional)
  cliente_id ───┐
                ↓
clientes
  id
  nombre / apellido   → para clientes tipo 'persona'
  razon_social        → para clientes tipo 'empresa'
  rut
```

---