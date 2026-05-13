import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Aislamos App de las vistas reales (que importan Supabase)
jest.mock('./views/RegistroCliente', () => () => <div>VISTA_REGISTRO</div>);
jest.mock('./views/DashboardClientesDeuda', () => () => <div>VISTA_DASHBOARD</div>);

describe('App - navegación', () => {
  test('muestra la vista de registro por defecto', () => {
    render(<App />);
    expect(screen.getByText('VISTA_REGISTRO')).toBeInTheDocument();
    expect(screen.queryByText('VISTA_DASHBOARD')).not.toBeInTheDocument();
  });

  test('al hacer click en "Dashboard de deuda" cambia la vista', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /dashboard de deuda/i }));
    expect(screen.getByText('VISTA_DASHBOARD')).toBeInTheDocument();
    expect(screen.queryByText('VISTA_REGISTRO')).not.toBeInTheDocument();
  });

  test('al volver a "Registro de clientes" vuelve a la primera vista', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /dashboard de deuda/i }));
    fireEvent.click(screen.getByRole('button', { name: /registro de clientes/i }));
    expect(screen.getByText('VISTA_REGISTRO')).toBeInTheDocument();
  });
});
