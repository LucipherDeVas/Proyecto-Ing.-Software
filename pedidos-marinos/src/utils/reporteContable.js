import { estaEnRango } from './fechasReporte';
import { nombreCliente } from './clienteDeuda';

/**
 * Calcula métricas contables a partir de pedidos y clientes.
 * @param {Array} pedidos
 * @param {Array} clientes
 * @param {{ inicio: Date, fin: Date, etiqueta: string }} rango
 */
export function calcularMetricasReporte(pedidos, clientes, rango) {
  const mapaClientes = new Map(clientes.map((c) => [c.id, c]));
  const { inicio, fin } = rango;

  const pedidosVendidos = (pedidos || []).filter((p) => {
    if (p.estado === 'cancelado') return false;
    return estaEnRango(p.fecha, inicio, fin);
  });

  const totalVendido = pedidosVendidos.reduce(
    (sum, p) => sum + Number(p.total ?? 0),
    0
  );

  const pedidosCobrados = (pedidos || []).filter((p) => {
    if (p.estado !== 'pagado') return false;
    const fechaRef = p.fecha_pago || p.fecha;
    return estaEnRango(fechaRef, inicio, fin);
  });

  const totalCobrado = pedidosCobrados.reduce(
    (sum, p) => sum + Number(p.total ?? 0),
    0
  );

  const totalDeudas = (clientes || []).reduce(
    (sum, c) => sum + Number(c.deuda_actual ?? 0),
    0
  );

  const pendienteCobro = pedidosVendidos
    .filter((p) => p.estado === 'pendiente')
    .reduce((sum, p) => sum + Number(p.total ?? 0), 0);

  const filasDetalle = pedidosVendidos
    .map((p) => {
      const cliente = mapaClientes.get(p.cliente_id);
      return {
        id: p.id,
        fecha: p.fecha,
        cliente: cliente ? nombreCliente(cliente) : `Cliente #${p.cliente_id}`,
        total: Number(p.total ?? 0),
        estado: p.estado,
        fechaPago: p.fecha_pago || null,
      };
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return {
    totalVendido,
    totalCobrado,
    totalDeudas,
    pendienteCobro,
    cantidadPedidos: pedidosVendidos.length,
    cantidadCobrados: pedidosCobrados.length,
    filasDetalle,
    rango,
  };
}

export const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function formatoFechaReporte(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
