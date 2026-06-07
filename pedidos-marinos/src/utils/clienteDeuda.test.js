import {
  calcularEstado,
  estaClienteBloqueado,
  evaluarPedido,
  porcentajeUsado,
  nombreCliente,
} from '../utils/clienteDeuda';

describe('estaClienteBloqueado()', () => {
  test('cliente null → bloqueado', () => {
    expect(estaClienteBloqueado(null)).toBe(true);
  });

  test('activo false → bloqueado', () => {
    expect(estaClienteBloqueado({ activo: false, deuda_actual: 0, limite_deuda: 1000 })).toBe(true);
  });

  test('moroso → bloqueado', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    expect(
      estaClienteBloqueado({
        activo: true,
        deuda_actual: 100,
        limite_deuda: 1000,
        fecha_vencimiento_deuda: ayer.toISOString().slice(0, 10),
      })
    ).toBe(true);
  });

  test('límite superado → bloqueado', () => {
    expect(
      estaClienteBloqueado({ activo: true, deuda_actual: 1000, limite_deuda: 1000 })
    ).toBe(true);
  });

  test('con deuda normal → no bloqueado', () => {
    expect(
      estaClienteBloqueado({ activo: true, deuda_actual: 100, limite_deuda: 1000 })
    ).toBe(false);
  });
});

describe('evaluarPedido()', () => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 7);

  test('pedido dentro del umbral → aceptado', () => {
    const result = evaluarPedido(
      { activo: true, deuda_actual: 100, limite_deuda: 1000 },
      200
    );
    expect(result).toEqual({ aceptado: true, estado: 'pendiente', motivo: '' });
  });

  test('pedido que supera umbral → rechazado', () => {
    const result = evaluarPedido(
      { activo: true, deuda_actual: 900, limite_deuda: 1000 },
      200
    );
    expect(result.aceptado).toBe(false);
    expect(result.estado).toBe('cancelado');
    expect(result.motivo).toMatch(/supera el umbral/i);
  });

  test('cliente moroso → rechazado', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const result = evaluarPedido(
      {
        activo: true,
        deuda_actual: 100,
        limite_deuda: 1000,
        fecha_vencimiento_deuda: ayer.toISOString().slice(0, 10),
      },
      50
    );
    expect(result.estado).toBe('cancelado');
    expect(result.motivo).toMatch(/moroso/i);
  });

  test('cliente inactivo → rechazado', () => {
    const result = evaluarPedido(
      { activo: false, deuda_actual: 0, limite_deuda: 1000 },
      100
    );
    expect(result.estado).toBe('cancelado');
    expect(result.motivo).toMatch(/bloqueado/i);
  });
});

describe('helpers reexportados', () => {
  test('calcularEstado sin deuda', () => {
    expect(calcularEstado({ deuda_actual: 0, limite_deuda: 1000 })).toBe('Sin deuda');
  });

  test('porcentajeUsado', () => {
    expect(porcentajeUsado({ deuda_actual: 250, limite_deuda: 1000 })).toBe(25);
  });

  test('nombreCliente persona', () => {
    expect(nombreCliente({ tipo: 'persona', nombre: 'Ana', apellido: 'López' })).toBe('Ana López');
  });
});
