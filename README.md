# Versión 1.1

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

## Funcionalidades generales

- Registro de clientes asociado a Supabase Authentication.
- Inicio y cierre de sesión.
- Creación, edición, listado y eliminación de productos.
- Creación de pedidos con detalle de productos.
- Administración y consulta de clientes.
- Edición de límites y datos financieros.
- Dashboard de clientes y deuda.
- Restricciones de pedidos según deuda y estado del cliente.
- Reportes contables con exportación PDF y CSV.
- Persistencia de datos en Supabase.
- Políticas Row Level Security para el entorno de desarrollo.

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

Los archivos están en `pedidos-marinos/supabase/migrations/`.

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
