/**
 * Utilidades de rango de fechas para reportes contables.
 */

function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Lunes de la semana ISO de la fecha dada */
function inicioDeSemana(fecha) {
  const d = inicioDelDia(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

function finDeSemana(fecha) {
  const inicio = inicioDeSemana(fecha);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  return finDelDia(fin);
}

function inicioDeMes(fecha) {
  const d = inicioDelDia(fecha);
  d.setDate(1);
  return d;
}

function finDeMes(fecha) {
  const d = inicioDeMes(fecha);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return finDelDia(d);
}

function parseFechaLocal(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {'dia'|'semana'|'mes'|'personalizado'} tipo
 * @param {{ fechaDesde?: string, fechaHasta?: string, referencia?: Date }} opts
 * @returns {{ inicio: Date, fin: Date, etiqueta: string }}
 */
export function calcularRangoFechas(tipo, opts = {}) {
  const ref = opts.referencia ? new Date(opts.referencia) : new Date();

  switch (tipo) {
    case 'dia': {
      const inicio = inicioDelDia(ref);
      const fin = finDelDia(ref);
      return {
        inicio,
        fin,
        etiqueta: inicio.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      };
    }
    case 'semana': {
      const inicio = inicioDeSemana(ref);
      const fin = finDeSemana(ref);
      return {
        inicio,
        fin,
        etiqueta: `${inicio.toLocaleDateString('es-CL')} — ${fin.toLocaleDateString('es-CL')}`,
      };
    }
    case 'mes': {
      const inicio = inicioDeMes(ref);
      const fin = finDeMes(ref);
      return {
        inicio,
        fin,
        etiqueta: inicio.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      };
    }
    case 'personalizado': {
      if (!opts.fechaDesde || !opts.fechaHasta) {
        throw new Error('Debes seleccionar fecha desde y fecha hasta.');
      }
      const inicio = inicioDelDia(parseFechaLocal(opts.fechaDesde));
      const fin = finDelDia(parseFechaLocal(opts.fechaHasta));
      if (inicio > fin) {
        throw new Error('La fecha desde no puede ser posterior a la fecha hasta.');
      }
      return {
        inicio,
        fin,
        etiqueta: `${inicio.toLocaleDateString('es-CL')} — ${fin.toLocaleDateString('es-CL')}`,
      };
    }
    default:
      throw new Error(`Tipo de rango no válido: ${tipo}`);
  }
}

export function estaEnRango(fechaIso, inicio, fin) {
  if (!fechaIso) return false;
  const f = new Date(fechaIso);
  return f >= inicio && f <= fin;
}
