import { render, screen, fireEvent } from '@testing-library/react';
import RegistroCliente, { formatearRut } from './RegistroCliente';

// Limpiar localStorage entre tests (modo demo)
beforeEach(() => {
  localStorage.clear();
});

// Helpers
function setInput(label, value) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  return input;
}

function clickRegistrar() {
  fireEvent.click(screen.getByRole('button', { name: /registrar/i }));
}

function getMensajeError() {
  return document.querySelector('.rc-mensaje.rc-error');
}

// Llena los campos mínimos válidos de una empresa (sin tocar el campo que se va a probar)
function llenarEmpresaValida({ rut = '12.345.678-9', telefono = '', fecha = '' } = {}) {
  setInput(/RUT/, rut);
  if (telefono) setInput(/Teléfono/, telefono);
  setInput(/Razón social/, 'ACME SA');
  setInput(/Giro/, 'Pesca');
  setInput(/Nombre contacto/, 'Juan');
  setInput(/Límite de deuda/, '1000');
  if (fecha) setInput(/Fecha vencimiento deuda/, fecha);
}

describe('formatearRut() - helper', () => {
  test('vacío → ""', () => {
    expect(formatearRut('')).toBe('');
  });

  test('un solo dígito → tal cual', () => {
    expect(formatearRut('5')).toBe('5');
  });

  test('8 dígitos crudos → xx.xxx.xxx-x', () => {
    expect(formatearRut('211845923')).toBe('21.184.592-3');
  });

  test('7 dígitos crudos → x.xxx.xxx-x', () => {
    expect(formatearRut('41234563')).toBe('4.123.456-3');
  });

  test('elimina caracteres no válidos', () => {
    expect(formatearRut('21.184.592-3')).toBe('21.184.592-3');
    expect(formatearRut('21 184 592 3')).toBe('21.184.592-3');
    expect(formatearRut('21abc184592X3')).toBe('21.184.592-3');
  });

  test('acepta K como dígito verificador (lo normaliza a mayúscula)', () => {
    expect(formatearRut('12345678k')).toBe('12.345.678-K');
    expect(formatearRut('1234567k')).toBe('1.234.567-K');
  });

  test('input parcial se formatea progresivamente', () => {
    expect(formatearRut('12')).toBe('1-2');
    expect(formatearRut('1234')).toBe('123-4');
  });
});

describe('RegistroCliente - formato de RUT', () => {
  test('rechaza RUT sin dígitos suficientes (queda como 12-3)', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ rut: '123' });
    clickRegistrar();
    expect(getMensajeError().textContent).toMatch(/formato/i);
  });

  test('acepta RUT de 7 dígitos como 4.123.456-3', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ rut: '4.123.456-3' });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/formato/i);
  });

  test('acepta RUT crudo 211845923 (auto-formateado a 21.184.592-3)', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ rut: '211845923' });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/formato/i);
  });

  test('acepta RUT con K como dígito verificador', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ rut: '12.345.678-K' });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/formato/i);
  });

  test('el input muestra el RUT formateado a medida que el usuario escribe', () => {
    render(<RegistroCliente />);
    const input = screen.getByLabelText(/RUT/);
    fireEvent.change(input, { target: { value: '211845923' } });
    expect(input.value).toBe('21.184.592-3');
  });

  test('el input formatea cuando se pegan caracteres con puntos/espacios', () => {
    render(<RegistroCliente />);
    const input = screen.getByLabelText(/RUT/);
    fireEvent.change(input, { target: { value: '4 123 456 3' } });
    expect(input.value).toBe('4.123.456-3');
  });
});

describe('RegistroCliente - formato de teléfono', () => {
  test('rechaza teléfono sin signo + al inicio', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ telefono: '56912345678' });
    clickRegistrar();
    expect(getMensajeError().textContent).toMatch(/comenzar con \+/i);
  });

  test('rechaza teléfono con caracteres no numéricos', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ telefono: '+56 9 1234 5678' });
    clickRegistrar();
    expect(getMensajeError().textContent).toMatch(/comenzar con \+/i);
  });

  test('rechaza teléfono demasiado corto (< 8 dígitos)', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ telefono: '+5691' });
    clickRegistrar();
    expect(getMensajeError().textContent).toMatch(/comenzar con \+/i);
  });

  test('acepta teléfono +xxxxxxxxxxx correcto', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ telefono: '+56912345678' });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/comenzar con \+/i);
  });

  test('teléfono vacío es aceptado (opcional)', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ telefono: '' });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/comenzar con \+/i);
  });
});

describe('RegistroCliente - fecha de vencimiento', () => {
  // Fechas en formato YYYY-MM-DD basado en TZ local (no UTC)
  const localISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const isoHoy = localISO(new Date());
  const isoAyer = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return localISO(d); })();
  const isoMana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return localISO(d); })();

  test('rechaza fecha igual al día actual', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ fecha: isoHoy });
    clickRegistrar();
    expect(getMensajeError().textContent).toMatch(/mayor al día actual/i);
  });

  test('rechaza fecha anterior al día actual', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ fecha: isoAyer });
    clickRegistrar();
    expect(getMensajeError().textContent).toMatch(/mayor al día actual/i);
  });

  test('acepta fecha posterior al día actual', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ fecha: isoMana });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/mayor al día actual/i);
  });

  test('fecha vacía es aceptada (opcional)', () => {
    render(<RegistroCliente />);
    llenarEmpresaValida({ fecha: '' });
    clickRegistrar();
    const err = getMensajeError();
    if (err) expect(err.textContent).not.toMatch(/mayor al día actual/i);
  });
});
