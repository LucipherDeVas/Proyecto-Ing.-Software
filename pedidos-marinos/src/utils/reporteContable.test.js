import { calcularRangoFechas, estaEnRango } from './fechasReporte';
import { calcularMetricasReporte } from './reporteContable';

describe('calcularRangoFechas()', () => {
  const ref = new Date('2026-06-15T12:00:00');

  test('dia → mismo día', () => {
    const r = calcularRangoFechas('dia', { referencia: ref });
    expect(r.inicio.getDate()).toBe(15);
    expect(r.fin.getDate()).toBe(15);
    expect(r.fin.getHours()).toBe(23);
  });

  test('semana → lunes a domingo', () => {
    const r = calcularRangoFechas('semana', { referencia: ref });
    expect(r.inicio.getDay()).toBe(1);
    expect(r.fin.getDay()).toBe(0);
  });

  test('mes → junio 2026', () => {
    const r = calcularRangoFechas('mes', { referencia: ref });
    expect(r.inicio.getMonth()).toBe(5);
    expect(r.inicio.getDate()).toBe(1);
    expect(r.fin.getMonth()).toBe(5);
    expect(r.fin.getDate()).toBe(30);
  });

  test('personalizado valida rango', () => {
    expect(() =>
      calcularRangoFechas('personalizado', { fechaDesde: '2026-06-10', fechaHasta: '2026-06-01' })
    ).toThrow(/posterior/i);
  });

  test('personalizado OK', () => {
    const r = calcularRangoFechas('personalizado', {
      fechaDesde: '2026-06-01',
      fechaHasta: '2026-06-15',
    });
    expect(r.inicio.getDate()).toBe(1);
    expect(r.fin.getDate()).toBe(15);
  });
});

describe('calcularMetricasReporte()', () => {
  const rango = calcularRangoFechas('mes', { referencia: new Date('2026-06-15') });

  const clientes = [
    { id: 1, tipo: 'persona', nombre: 'Ana', apellido: 'López', deuda_actual: 50000 },
    { id: 2, tipo: 'persona', nombre: 'Luis', apellido: 'Pérez', deuda_actual: 30000 },
  ];

  const pedidos = [
    { id: 1, fecha: '2026-06-05T10:00:00Z', total: 100000, estado: 'pendiente', cliente_id: 1 },
    { id: 2, fecha: '2026-06-10T10:00:00Z', total: 80000, estado: 'pagado', cliente_id: 2, fecha_pago: '2026-06-12T10:00:00Z' },
    { id: 3, fecha: '2026-06-08T10:00:00Z', total: 50000, estado: 'cancelado', cliente_id: 1 },
    { id: 4, fecha: '2026-05-01T10:00:00Z', total: 99999, estado: 'pagado', cliente_id: 1 },
  ];

  test('calcula totales del periodo', () => {
    const m = calcularMetricasReporte(pedidos, clientes, rango);
    expect(m.totalVendido).toBe(180000);
    expect(m.totalCobrado).toBe(80000);
    expect(m.totalDeudas).toBe(80000);
    expect(m.pendienteCobro).toBe(100000);
    expect(m.cantidadPedidos).toBe(2);
    expect(m.filasDetalle).toHaveLength(2);
  });

  test('excluye cancelados y fuera de rango', () => {
    const m = calcularMetricasReporte(pedidos, clientes, rango);
    expect(m.filasDetalle.find((f) => f.id === 3)).toBeUndefined();
    expect(m.filasDetalle.find((f) => f.id === 4)).toBeUndefined();
  });
});

describe('estaEnRango()', () => {
  test('fecha dentro del rango', () => {
    const inicio = new Date('2026-06-01T00:00:00');
    const fin = new Date('2026-06-30T23:59:59');
    expect(estaEnRango('2026-06-15T12:00:00Z', inicio, fin)).toBe(true);
    expect(estaEnRango('2026-05-15T12:00:00Z', inicio, fin)).toBe(false);
  });
});
