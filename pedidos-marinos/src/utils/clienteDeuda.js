/**
 * Reglas compartidas de deuda, bloqueo y evaluación de pedidos.
 * Prioridad de estado: Moroso > Límite superado > Cercano al límite > Con deuda > Sin deuda.
 */

export function calcularEstado(cliente) {
  const deuda = Number(cliente.deuda_actual ?? 0);
  const limite = Number(cliente.limite_deuda ?? 0);

  if (deuda <= 0) return 'Sin deuda';

  if (cliente.fecha_vencimiento_deuda) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(cliente.fecha_vencimiento_deuda);
    venc.setHours(0, 0, 0, 0);
    if (venc.getTime() < hoy.getTime()) return 'Moroso';
  }

  if (limite > 0 && deuda >= limite) return 'Límite superado';

  if (limite > 0 && deuda / limite >= 0.8 && deuda < limite) {
    return 'Cercano al límite';
  }

  return 'Con deuda';
}

export function porcentajeUsado(cliente) {
  const deuda = Number(cliente.deuda_actual ?? 0);
  const limite = Number(cliente.limite_deuda ?? 0);
  if (limite <= 0) return null;
  return (deuda / limite) * 100;
}

export function nombreCliente(c) {
  if (c.tipo === 'empresa') return c.razon_social || '—';
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || '—';
}

/**
 * Un cliente está bloqueado si está inactivo o en estado Moroso / Límite superado.
 */
export function estaClienteBloqueado(cliente) {
  if (!cliente) return true;
  if (cliente.activo === false) return true;

  const estado = calcularEstado(cliente);
  return estado === 'Moroso' || estado === 'Límite superado';
}

/**
 * Evalúa si un pedido puede procesarse según deuda y umbral disponible.
 * @returns {{ aceptado: boolean, estado: 'pendiente'|'cancelado', motivo: string }}
 */
export function evaluarPedido(cliente, totalPedido) {
  if (!cliente) {
    return { aceptado: false, estado: 'cancelado', motivo: 'Cliente no encontrado.' };
  }

  if (cliente.activo === false) {
    return { aceptado: false, estado: 'cancelado', motivo: 'Cliente bloqueado (cuenta inactiva).' };
  }

  const deuda = Number(cliente.deuda_actual ?? 0);
  const limite = Number(cliente.limite_deuda ?? 0);
  const total = Number(totalPedido ?? 0);

  if (total <= 0) {
    return { aceptado: false, estado: 'cancelado', motivo: 'El total del pedido debe ser mayor a cero.' };
  }

  const estadoFinanciero = calcularEstado(cliente);

  if (estadoFinanciero === 'Moroso') {
    return {
      aceptado: false,
      estado: 'cancelado',
      motivo: 'Cliente moroso: la deuda tiene fecha de vencimiento vencida.',
    };
  }

  if (estadoFinanciero === 'Límite superado') {
    return {
      aceptado: false,
      estado: 'cancelado',
      motivo: 'Cliente con límite de deuda superado.',
    };
  }

  if (limite > 0 && deuda + total > limite) {
    const disponible = Math.max(limite - deuda, 0);
    return {
      aceptado: false,
      estado: 'cancelado',
      motivo: `El pedido supera el umbral disponible. Crédito restante: $${disponible.toLocaleString('es-CL')}.`,
    };
  }

  return { aceptado: true, estado: 'pendiente', motivo: '' };
}
