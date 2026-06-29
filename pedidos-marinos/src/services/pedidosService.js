import { supabase } from '../lib/supabase';
import { evaluarPedido, nombreCliente } from '../utils/clienteDeuda';

/**
 * Lista los pedidos con los datos del cliente asociado (nombre y RUT),
 * ordenados por fecha descendente. Para la pantalla de Gestión de pedidos.
 */
export async function listarPedidosConCliente() {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id, fecha, estado, total, observaciones, fecha_pago, cliente_id,
      clientes ( id, tipo, nombre, apellido, razon_social, rut )
    `)
    .order('fecha', { ascending: false });

  if (error) throw new Error(`Error obteniendo pedidos: ${error.message}`);

  return (data || []).map((p) => ({
    id: p.id,
    fecha: p.fecha,
    estado: p.estado,
    total: Number(p.total ?? 0),
    observaciones: p.observaciones,
    fecha_pago: p.fecha_pago,
    cliente_id: p.cliente_id,
    cliente: p.clientes ? nombreCliente(p.clientes) : `Cliente #${p.cliente_id}`,
    rut: p.clientes?.rut ?? '—',
  }));
}

/**
 * Cambia el estado de un pedido (pendiente | pagado | cancelado).
 * El trigger `sincronizar_pago_y_deuda` ajusta `deuda_actual` y `fecha_pago`.
 */
export async function actualizarEstadoPedido(id, estado) {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando el pedido: ${error.message}`);
  return data;
}

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
 * Crea un pedido validando el crédito en el SERVIDOR vía la RPC
 * `crear_pedido_validado` (migración 006). Si la RPC no está disponible
 * (migración aún no aplicada), cae al flujo legacy del lado del cliente.
 */
export async function crearPedidoConValidacion(args) {
  const { clienteId, productosPedidos, cantidades, calcularSubtotal, observaciones, total } = args;

  const detalles = productosPedidos.map((prod) => ({
    producto: prod.nombre,
    cantidad: cantidades[prod.id],
    precio_unitario: prod.precio_unitario,
    subtotal: calcularSubtotal(prod),
  }));

  const { data, error } = await supabase.rpc('crear_pedido_validado', {
    p_cliente_id: clienteId,
    p_total: total,
    p_observaciones: observaciones?.trim() || null,
    p_detalles: detalles,
  });

  if (error) {
    // Fallback: la RPC no existe todavía → usar el flujo legacy.
    if (error.code === 'PGRST202' || /crear_pedido_validado/.test(error.message || '')) {
      console.warn('RPC crear_pedido_validado no disponible; usando flujo legacy. Aplica la migración 006 para validar en el servidor.');
      return crearPedidoLegacy(args);
    }
    throw new Error(`Error creando el pedido: ${error.message}`);
  }

  return {
    pedido: { id: data.pedido_id, estado: data.estado, total },
    evaluacion: { aceptado: data.aceptado, estado: data.estado, motivo: data.motivo },
    procesado: data.aceptado,
    deudaActualizada: Number(data.deuda_actual ?? 0),
  };
}

/**
 * Flujo legacy (cliente): evalúa y escribe directamente en las tablas.
 * Inseguro frente a RLS permisiva; se mantiene solo como respaldo.
 */
async function crearPedidoLegacy({
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
