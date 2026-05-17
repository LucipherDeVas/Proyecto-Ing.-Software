import { supabase } from '../lib/supabase';

/**
 * Lista todos los clientes de la tabla `clientes`.
 * @returns {Promise<Array<object>>}
 */
export async function listarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error listando clientes: ${error.message}`);
  return data || [];
}

/**
 * Busca un cliente por RUT en la tabla `clientes` de Supabase.
 * @param {string} rut
 * @returns {Promise<object|null>} El cliente si existe, null si no existe.
 */
export async function buscarClientePorRut(rut) {
  const valor = (rut || '').trim();
  if (!valor) return null;

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('rut', valor)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error consultando RUT: ${error.message}`);
  return data || null;
}

/**
 * Busca un cliente por correo. Solo consulta si el correo no está vacío.
 * @param {string} correo
 * @returns {Promise<object|null>} El cliente si existe, null si no existe o si correo viene vacío.
 */
export async function buscarClientePorCorreo(correo) {
  const valor = (correo || '').trim();
  if (!valor) return null;

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('correo', valor)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error consultando correo: ${error.message}`);
  return data || null;
}

/**
 * Valida si ya existe un cliente con el mismo RUT o correo.
 * Prioriza el RUT por sobre el correo cuando ambos están duplicados.
 *
 * @param {{rut: string, correo?: string}} params
 * @returns {Promise<{duplicado: boolean, campo: 'rut'|'correo'|null, mensaje: string}>}
 */
export async function validarClienteDuplicado({ rut, correo }) {
  const porRut = await buscarClientePorRut(rut);
  if (porRut) {
    return {
      duplicado: true,
      campo: 'rut',
      mensaje: 'Ya existe un cliente con ese RUT.',
    };
  }

  const porCorreo = await buscarClientePorCorreo(correo);
  if (porCorreo) {
    return {
      duplicado: true,
      campo: 'correo',
      mensaje: 'Ya existe un cliente con ese correo.',
    };
  }

  return { duplicado: false, campo: null, mensaje: '' };
}