# Configuracion de Supabase

Los scripts de `migrations/` deben ejecutarse en orden numerico desde el
**SQL Editor** del proyecto de Supabase.

## Antes de comenzar

1. Crea un proyecto en Supabase.
2. Abre **Authentication > Providers > Email**.
3. Para este flujo de desarrollo, desactiva temporalmente la confirmacion de
   correo. El registro inserta el cliente inmediatamente despues de `signUp`.
4. Configura `pedidos-marinos/.env` con la URL y la clave publica del proyecto.

## Orden de ejecucion

1. `001_esquema_base.sql`
   Crea `clientes`, `productos`, `pedidos` y `detalle_pedido`.
   Este archivo elimina primero las tablas existentes y todos sus datos.
2. `002_funciones_y_triggers.sql`
   Agrega `updated_at` automatico y ajusta deuda/fecha de pago cuando cambia
   el estado de un pedido.
3. `003_politicas_rls_desarrollo.sql`
   Activa RLS y concede los permisos que necesita la aplicacion actual.
4. `004_datos_ejemplo.sql`
   Opcional. Inserta tres productos para pruebas.
5. `005_verificacion.sql`
   No modifica datos. Comprueba tablas, columnas, RLS, politicas y productos.

## Ejecucion en Supabase

Para cada archivo:

1. Abre **SQL Editor**.
2. Selecciona **New query**.
3. Copia el contenido completo del archivo correspondiente.
4. Pulsa **Run**.
5. Comprueba que aparezca `Success` antes de continuar con el siguiente.

Al terminar, revisa **Table Editor**. Deben aparecer las cuatro tablas.
El archivo `005` debe mostrar `rls_activo = true` para todas ellas.

## Verificacion rapida

Ejecuta esta consulta en SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clientes', 'productos', 'pedidos', 'detalle_pedido')
ORDER BY table_name;
```

Luego inicia la aplicacion:

```bash
cd pedidos-marinos
npm start
```

## Advertencias

- No EJECTUTAR `001_esquema_base.sql` sobre una base con datos que conservar.

- La aplicacion suma la deuda al crear pedidos. Por eso estos scripts no
  incluyen el trigger de insercion del archivo `sql_supabase.txt`, que habria
  sumado el monto dos veces.
