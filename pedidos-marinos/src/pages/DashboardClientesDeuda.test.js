import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DashboardClientesDeuda, {
  calcularEstado,
  porcentajeUsado,
  nombreCliente,
} from './DashboardClientesDeuda';

// Mock del servicio para no tocar Supabase
jest.mock('../services/clientesService', () => ({
  listarClientes: jest.fn(),
}));
// eslint-disable-next-line import/first
import { listarClientes } from '../../../src/services/clientesService';

// ============================================================
// 1. Helpers de cálculo
// ============================================================
describe('nombreCliente()', () => {
  test('empresa → razon_social', () => {
    expect(nombreCliente({ tipo: 'empresa', razon_social: 'ACME SA' })).toBe('ACME SA');
  });

  test('persona → "nombre apellido"', () => {
    expect(nombreCliente({ tipo: 'persona', nombre: 'Juan', apellido: 'Pérez' })).toBe('Juan Pérez');
  });

  test('valores faltantes → "—"', () => {
    expect(nombreCliente({ tipo: 'empresa' })).toBe('—');
    expect(nombreCliente({ tipo: 'persona' })).toBe('—');
  });
});

describe('porcentajeUsado()', () => {
  test('límite > 0 → calcula % correcto', () => {
    expect(porcentajeUsado({ deuda_actual: 50, limite_deuda: 200 })).toBe(25);
  });

  test('límite = 0 → null (sin división por cero)', () => {
    expect(porcentajeUsado({ deuda_actual: 100, limite_deuda: 0 })).toBeNull();
  });

  test('límite negativo o no definido → null', () => {
    expect(porcentajeUsado({ deuda_actual: 100 })).toBeNull();
    expect(porcentajeUsado({ deuda_actual: 100, limite_deuda: -10 })).toBeNull();
  });
});

describe('calcularEstado() - reglas de negocio', () => {
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const isoAyer  = ayer.toISOString().slice(0, 10);
  const isoMana  = manana.toISOString().slice(0, 10);

  test('deuda 0 → "Sin deuda"', () => {
    expect(calcularEstado({ deuda_actual: 0, limite_deuda: 1000 })).toBe('Sin deuda');
  });

  test('deuda negativa → "Sin deuda"', () => {
    expect(calcularEstado({ deuda_actual: -5, limite_deuda: 1000 })).toBe('Sin deuda');
  });

  test('deuda < 80% del límite y no vencida → "Con deuda"', () => {
    expect(calcularEstado({
      deuda_actual: 100, limite_deuda: 1000, fecha_vencimiento_deuda: isoMana,
    })).toBe('Con deuda');
  });

  test('deuda exactamente 80% del límite → "Cercano al límite"', () => {
    expect(calcularEstado({
      deuda_actual: 800, limite_deuda: 1000, fecha_vencimiento_deuda: isoMana,
    })).toBe('Cercano al límite');
  });

  test('deuda 90% del límite → "Cercano al límite"', () => {
    expect(calcularEstado({
      deuda_actual: 900, limite_deuda: 1000, fecha_vencimiento_deuda: isoMana,
    })).toBe('Cercano al límite');
  });

  test('deuda >= límite y límite > 0 → "Límite superado"', () => {
    expect(calcularEstado({
      deuda_actual: 1200, limite_deuda: 1000, fecha_vencimiento_deuda: isoMana,
    })).toBe('Límite superado');
  });

  test('deuda > 0 y fecha vencida → "Moroso" (prioridad sobre límite)', () => {
    expect(calcularEstado({
      deuda_actual: 1200, limite_deuda: 1000, fecha_vencimiento_deuda: isoAyer,
    })).toBe('Moroso');
  });

  test('límite = 0 con deuda > 0 → "Con deuda" (evita div por cero)', () => {
    expect(calcularEstado({
      deuda_actual: 50, limite_deuda: 0, fecha_vencimiento_deuda: isoMana,
    })).toBe('Con deuda');
  });

  test('sin fecha de vencimiento, deuda < 80% → "Con deuda"', () => {
    expect(calcularEstado({ deuda_actual: 100, limite_deuda: 1000 })).toBe('Con deuda');
  });
});

// ============================================================
// 2. Vista renderizada
// ============================================================
const CLIENTES_FAKE = [
  { id: 1, tipo: 'empresa',  rut: '11.111.111-1', correo: 'a@a.cl', telefono: '+56911111111',
    razon_social: 'ACME SA',   giro: 'Pesca', nombre_contacto: 'X',
    deuda_actual: 0, limite_deuda: 1000000, fecha_vencimiento_deuda: null },
  { id: 2, tipo: 'persona',  rut: '22.222.222-2', correo: 'b@b.cl', telefono: '+56922222222',
    nombre: 'Juan', apellido: 'Pérez',
    deuda_actual: 900000, limite_deuda: 1000000,
    fecha_vencimiento_deuda: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10) },
  { id: 3, tipo: 'empresa',  rut: '33.333.333-3', correo: 'c@c.cl', telefono: '+56933333333',
    razon_social: 'Morosa SpA', giro: 'X', nombre_contacto: 'Y',
    deuda_actual: 500000, limite_deuda: 1000000,
    fecha_vencimiento_deuda: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
];

describe('<DashboardClientesDeuda /> integración', () => {
  beforeEach(() => {
    listarClientes.mockReset();
  });

  test('llama a listarClientes() al montar y renderiza las filas', async () => {
    listarClientes.mockResolvedValueOnce(CLIENTES_FAKE);
    render(<DashboardClientesDeuda />);
    await waitFor(() => expect(listarClientes).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('ACME SA')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Morosa SpA')).toBeInTheDocument();
  });

  test('aplica los estados correctos por fila', async () => {
    listarClientes.mockResolvedValueOnce(CLIENTES_FAKE);
    const { container } = render(<DashboardClientesDeuda />);
    await screen.findByText('ACME SA');
    // Filtramos a los badges (las options del select también contienen estos textos)
    const badges = Array.from(container.querySelectorAll('.dc-badge')).map(b => b.textContent);
    expect(badges).toContain('Sin deuda');
    expect(badges).toContain('Cercano al límite');
    expect(badges).toContain('Moroso');
  });

  test('formatea montos en CLP', async () => {
    listarClientes.mockResolvedValueOnce(CLIENTES_FAKE);
    render(<DashboardClientesDeuda />);
    await screen.findByText('ACME SA');
    // Intl.NumberFormat es-CL produce p.ej. "$1.000.000"
    const montos = screen.getAllByText(/\$\s?1\.000\.000/);
    expect(montos.length).toBeGreaterThan(0);
  });

  test('buscador filtra por nombre / RUT / correo', async () => {
    listarClientes.mockResolvedValueOnce(CLIENTES_FAKE);
    render(<DashboardClientesDeuda />);
    await screen.findByText('ACME SA');

    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: 'pérez' },
    });
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByText('ACME SA')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: '33.333' },
    });
    expect(screen.getByText('Morosa SpA')).toBeInTheDocument();
    expect(screen.queryByText('ACME SA')).not.toBeInTheDocument();
  });

  test('filtro por estado oculta filas que no coinciden', async () => {
    listarClientes.mockResolvedValueOnce(CLIENTES_FAKE);
    render(<DashboardClientesDeuda />);
    await screen.findByText('ACME SA');

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Moroso' } });
    expect(screen.getByText('Morosa SpA')).toBeInTheDocument();
    expect(screen.queryByText('ACME SA')).not.toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
  });

  test('botón Recargar invoca listarClientes() de nuevo', async () => {
    listarClientes.mockResolvedValue(CLIENTES_FAKE);
    render(<DashboardClientesDeuda />);
    await screen.findByText('ACME SA');
    expect(listarClientes).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /recargar/i }));
    await waitFor(() => expect(listarClientes).toHaveBeenCalledTimes(2));
  });

  test('muestra banner de error si listarClientes() falla', async () => {
    listarClientes.mockRejectedValueOnce(new Error('relation "public.clientes" does not exist'));
    render(<DashboardClientesDeuda />);
    expect(await screen.findByText(/relation .* does not exist/i)).toBeInTheDocument();
  });

  test('muestra mensaje "No hay clientes" cuando la lista está vacía', async () => {
    listarClientes.mockResolvedValueOnce([]);
    render(<DashboardClientesDeuda />);
    expect(await screen.findByText(/no hay clientes registrados/i)).toBeInTheDocument();
  });

  test('% usado muestra "—" si limite_deuda es 0', async () => {
    listarClientes.mockResolvedValueOnce([{
      id: 99, tipo: 'persona', rut: '9-9', correo: 'z@z.cl', telefono: '+56999',
      nombre: 'Sin', apellido: 'Limite',
      deuda_actual: 100, limite_deuda: 0, fecha_vencimiento_deuda: null,
    }]);
    render(<DashboardClientesDeuda />);
    const fila = (await screen.findByText('Sin Limite')).closest('tr');
    // El % usado es la 3ª celda con clase dc-num (deuda, límite, %)
    const numCells = fila.querySelectorAll('.dc-num');
    expect(numCells[2].textContent).toBe('—');
  });
});
