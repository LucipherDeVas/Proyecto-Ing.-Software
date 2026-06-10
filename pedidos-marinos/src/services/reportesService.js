import { supabase } from '../lib/supabase';
import { calcularRangoFechas } from '../utils/fechasReporte';
import { calcularMetricasReporte } from '../utils/reporteContable';

export async function obtenerPedidosParaReporte() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, fecha, total, estado, cliente_id, fecha_pago, observaciones')
    .order('fecha', { ascending: false });

  if (error) throw new Error(`Error obteniendo pedidos: ${error.message}`);
  return data || [];
}

export async function obtenerClientesParaReporte() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, tipo, nombre, apellido, deuda_actual, rut, correo');

  if (error) throw new Error(`Error obteniendo clientes: ${error.message}`);
  return data || [];
}

/**
 * Genera el reporte contable completo para un rango de fechas.
 */
export async function generarReporteContable(tipoRango, opciones = {}) {
  const rango = calcularRangoFechas(tipoRango, opciones);
  const [pedidos, clientes] = await Promise.all([
    obtenerPedidosParaReporte(),
    obtenerClientesParaReporte(),
  ]);

  const metricas = calcularMetricasReporte(pedidos, clientes, rango);

  return {
    ...metricas,
    generadoEn: new Date().toISOString(),
    tipoRango,
  };
}
