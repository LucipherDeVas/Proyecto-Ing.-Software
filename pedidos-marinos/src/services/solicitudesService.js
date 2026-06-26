import { supabase } from '../lib/supabase';
import { nombreCliente } from '../utils/clienteDeuda';

// Error cuando la tabla aun no existe 007 no esta en supa
export function tablaNoMigrada(error) {
  return error?.code === '42P01' || /solicitudes_credito/.test(error?.message || '');
}

/**
 * El cliente solicita un aumento de su límite de crédito.
 */
export async function crearSolicitudCredito({ clienteId, limiteActual, limiteSolicitado, mensaje }) {
  const { data, error } = await supabase
    .from('solicitudes_credito')
    .insert([{
      cliente_id: clienteId,
      limite_actual: limiteActual ?? 0,
      limite_solicitado: limiteSolicitado,
      mensaje: mensaje?.trim() || null,
    }])
    .select()
    .single();

  if (error) throw new Error(`Error enviando la solicitud: ${error.message}`);
  return data;
}

/**
 * Solicitud pendiente más reciente del cliente (o null).
 */
export async function obtenerMiSolicitudPendiente(clienteId) {
  const { data, error } = await supabase
    .from('solicitudes_credito')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Lista las solicitudes pendientes con datos del cliente (para el admin).
 */
export async function listarSolicitudesPendientes() {
  const { data, error } = await supabase
    .from('solicitudes_credito')
    .select(`
      id, cliente_id, limite_actual, limite_solicitado, mensaje, estado, created_at,
      clientes ( id, tipo, nombre, apellido, razon_social, rut )
    `)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((s) => ({
    ...s,
    cliente: s.clientes ? nombreCliente(s.clientes) : `Cliente #${s.cliente_id}`,
    rut: s.clientes?.rut ?? '—',
  }));
}

/**
 * Aprueba o rechaza una solicitud (solo admin, vía RPC atómica).
 */
export async function resolverSolicitud(id, aprobar) {
  const { data, error } = await supabase.rpc('resolver_solicitud_credito', {
    p_id: id,
    p_aprobar: aprobar,
  });
  if (error) throw new Error(`Error resolviendo la solicitud: ${error.message}`);
  return data;
}

/**
 * Suscripción Realtime a cambios en las solicitudes.
 * @param {Function} onCambio  callback con el payload del cambio
 * @param {object}  [opts]
 * @param {string}  [opts.nombreCanal]  nombre único del canal (varios suscriptores)
 * @param {string}  [opts.evento]        'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * Devuelve una función para cancelar la suscripción.
 */
export function suscribirSolicitudes(onCambio, opts = {}) {
  const { nombreCanal = 'solicitudes_credito_canal', evento = '*' } = opts;
  const canal = supabase
    .channel(nombreCanal)
    .on(
      'postgres_changes',
      { event: evento, schema: 'public', table: 'solicitudes_credito' },
      onCambio
    )
    .subscribe();

  return () => { supabase.removeChannel(canal); };
}
