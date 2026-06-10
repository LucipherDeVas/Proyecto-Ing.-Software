import { supabase } from '../lib/supabase';
import { evaluarPedido } from '../utils/clienteDeuda';

/**
 * Obtiene los datos más recientes del cliente desde Supabase.
 */
export async function obtenerClientePorId(clienteId) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .maybeSingle();

  if (error) throw new Error(`Error consultando cliente: ${error.message}`);
  return data;
}

/**
 * Crea un pedido evaluando deuda y umbral en el servidor de datos.
 * Guarda estado pendiente/cancelado en BD. Solo procesa detalle y deuda si es aceptado (pendiente).
 */
export async function crearPedidoConValidacion({
  clienteId,
  productosPedidos,
  cantidades,
  calcularSubtotal,
  observaciones,
  total,
}) {
  const cliente = await obtenerClientePorId(clienteId);
  if (!cliente) {
    throw new Error('Cliente no encontrado.');
  }

  const evaluacion = evaluarPedido(cliente, total);

  const pedidoData = {
    fecha: new Date().toISOString(),
    cliente_id: clienteId,
    observaciones: observaciones?.trim() || null,
    total,
    estado: evaluacion.estado,
  };

  const { data: pedidoInsert, error: errorPedido } = await supabase
    .from('pedidos')
    .insert([pedidoData])
    .select();

  if (errorPedido) {
    throw new Error(`Error en pedidos: ${errorPedido.message}`);
  }

  const pedido = pedidoInsert[0];

  if (!evaluacion.aceptado) {
    return {
      pedido,
      evaluacion,
      procesado: false,
    };
  }

  const detalles = productosPedidos.map((prod) => ({
    pedido_id: pedido.id,
    producto: prod.nombre,
    cantidad: cantidades[prod.id],
    precio_unitario: prod.precio_unitario,
    subtotal: calcularSubtotal(prod),
  }));

  const { error: errorDetalles } = await supabase
    .from('detalle_pedido')
    .insert(detalles);

  if (errorDetalles) {
    throw new Error(`Error en detalles: ${errorDetalles.message}`);
  }

  const nuevaDeuda = Number(cliente.deuda_actual ?? 0) + total;
  const { error: errorDeuda } = await supabase
    .from('clientes')
    .update({ deuda_actual: nuevaDeuda })
    .eq('id', clienteId);

  if (errorDeuda) {
    throw new Error(`Error actualizando deuda: ${errorDeuda.message}`);
  }

  return {
    pedido,
    evaluacion,
    procesado: true,
    deudaActualizada: nuevaDeuda,
  };
}
