# Versión 1.3

Aplicación web para administrar clientes, productos, pedidos, deuda y reportes
contables.

## Cambios incorporados

### Restricciones y bloqueos por deuda

Se incorporó la implementación de restricciones y bloqueos según los umbrales
de deuda:

- Evaluación del estado financiero de cada cliente.
- Bloqueo de clientes inactivos, morosos o con el límite de deuda superado.
- Validación del crédito disponible antes de aceptar un pedido.
- Registro de pedidos cancelados cuando no cumplen las reglas.
- Actualización de la deuda al procesar pedidos aceptados.
- Dashboard con deuda, límite utilizado y estado del cliente.
- Servicios y pruebas automatizadas para las reglas de deuda.

### Reportes contables

Se incorporó la generación de reportes contables:

- Filtros por día, semana, mes o rango personalizado.
- Cálculo de total vendido, total cobrado y deuda acumulada.
- Cálculo de montos pendientes de cobro.
- Detalle de pedidos por cliente, fecha, total y estado.
- Exportación del reporte en PDF.
- Exportación en CSV compatible con Excel.
- Pruebas automatizadas para los cálculos del reporte.

### Gestión de deuda en el Dashboard de clientes

Se incorporaron mejoras al listado de clientes del Dashboard:

- Indicador visual de "bloqueado" en el listado de clientes del Dashboard:
  cada cliente bloqueado (inactivo, moroso o con el límite de deuda superado)
  se resalta con una insignia "🔒 Bloqueado" y una franja en su fila.
- Actualizar Deuda Post-Pedido: acción por cliente que permite editar la deuda
  actual desde el Dashboard y guardarla en Supabase; el estado financiero y el
  bloqueo se recalculan automáticamente tras el cambio.

### Gestión de pedidos, bloqueo y seguridad

- Pantalla de Gestión de pedidos: listado real de pedidos con filtros y acciones
  para registrar el pago, anular o reabrir; la deuda del cliente se actualiza
  automáticamente vía trigger.
- Bloqueo/desbloqueo manual de clientes y edición de la fecha de vencimiento de la
  deuda desde el Dashboard (habilita el estado "Moroso").
- Validación de crédito en el servidor mediante la función `crear_pedido_validado`.
- Roles de administrador vs cliente: las vistas de administración solo se muestran
  al rol `admin` y la base de datos aplica RLS por rol.
- Solicitudes de aumento de crédito: el cliente pide un nuevo límite desde la vista
  de pedidos y el administrador puede aprobarla (sube el límite) o rechazarla desde
  el panel del Dashboard.
- Notificaciones en vivo para el administrador (Supabase Realtime): al llegar una
  solicitud aparece un aviso emergente con sonido en cualquier vista de la
  aplicación, además de una notificación del navegador si se concede el permiso.

## Funcionalidades generales

- Registro de clientes asociado a Supabase Authentication.
- Inicio y cierre de sesión.
- Creación, edición, listado y eliminación de productos.
- Creación de pedidos con detalle de productos.
- Administración y consulta de clientes.
- Edición de límites y datos financieros.
- Dashboard de clientes y deuda.
- Indicador visual de clientes bloqueados en el Dashboard.
- Actualización de la deuda de un cliente desde el Dashboard (post-pedido).
- Gestión de pedidos con registro de pago, anulación y reapertura.
- Solicitudes de aumento de crédito con notificación en vivo al administrador.
- Roles de administrador y cliente con control de acceso por rol.
- Restricciones de pedidos según deuda y estado del cliente.
- Reportes contables con exportación PDF y CSV.
- Persistencia de datos en Supabase.
- Políticas Row Level Security (desarrollo y endurecidas por rol).

## Tecnologías

- React 19
- React Router
- Supabase
- PostgreSQL
- jsPDF
- jsPDF AutoTable
- Jest y Testing Library

## Estructura principal

```text
pedidos-marinos/
├── src/
│   ├── context/       Autenticación
│   ├── lib/           Cliente de Supabase
│   ├── pages/         Vistas de la aplicación
│   ├── services/      Consultas a Supabase
│   └── utils/         Deuda, fechas, reportes y exportaciones
└── supabase/
    ├── migrations/    Scripts SQL numerados
    └── README.md      Instrucciones detalladas de la base de datos
```

## Instalación

```bash
git clone https://github.com/LucipherDeVas/Proyecto-Ing.-Software.git
cd Proyecto-Ing.-Software/pedidos-marinos
npm install
```

## Configuración de Supabase

Se debe crear `pedidos-marinos/.env` con la URL y la clave pública del proyecto:

```env
REACT_APP_SUPABASE_URL=https://TU-PROYECTO.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

La clave `service_role` no debe utilizarse en el frontend y el archivo `.env`
no debe subirse a GitHub.

En Supabase, se debe abrir **SQL Editor** y ejecutar estos archivos en orden:

1. `001_esquema_base.sql`
2. `002_funciones_y_triggers.sql`
3. `003_politicas_rls_desarrollo.sql`
4. `004_datos_ejemplo.sql` (opcional)
5. `005_verificacion.sql`
6. `006_seguridad_roles_rls.sql`
7. `007_solicitudes_credito.sql`

Los archivos están en `pedidos-marinos/supabase/migrations/`.

`007_solicitudes_credito.sql` crea la tabla de solicitudes y la agrega a la
publicación de **Realtime**, para que las solicitudes lleguen en vivo al panel
del administrador.

### Rol de administrador

Las vistas de administración (Gestión de pedidos, Productos, Clientes y Reportes)
y la escritura en la base de datos quedan restringidas al rol `admin` tras ejecutar
`006_seguridad_roles_rls.sql`. La creación de pedidos del cliente se valida en el
servidor mediante la función `crear_pedido_validado`.

Para marcar un usuario como administrador, en **Supabase → Authentication → Users**,
editar su *User Metadata* con:

```json
{ "rol": "admin" }
```

o por SQL:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"rol":"admin"}'
WHERE email = 'admin@ejemplo.com';
```

El usuario debe cerrar e iniciar sesión para que el token refleje el nuevo rol.

> `001_esquema_base.sql` elimina las tablas existentes. No debe ejecutarse si
> hay datos que se necesiten conservar.

Para el flujo de registro actual, en desarrollo se debe desactivar
temporalmente **Confirm email** desde:

**Supabase → Authentication → Providers → Email**

![Configuración de Confirm email en Supabase](https://github.com/user-attachments/assets/3cb5f7c0-b69f-4782-b60f-9912574e2c6c)

La guía completa está en
[`pedidos-marinos/supabase/README.md`](pedidos-marinos/supabase/README.md).

## Ejecución

```bash
cd pedidos-marinos
npm start
```

La aplicación quedará disponible en:

```text
http://localhost:3000
```

Cuando se modifique `.env`, se debe detener y volver a ejecutar `npm start`.

## Comandos de validación

```bash
cd pedidos-marinos
npm test -- --runInBand
npm run build
```

Durante la integración local:

- Los merges de Ariel y Daniela se completaron sin conflictos de Git.


## Consideraciones

- Los usuarios de `auth.users` y los registros de `public.clientes` son
  entidades distintas. Si el registro falla después de crear la cuenta, puede
  quedar un usuario en Authentication sin su fila correspondiente en
  `clientes`.

- La aplicación actual actualiza la deuda al crear un pedido; las migraciones
  evitan agregar otro trigger de inserción que duplique ese monto.
