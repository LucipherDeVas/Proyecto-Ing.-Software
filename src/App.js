import { useState } from 'react';
import RegistroCliente from './views/RegistroCliente';
import DashboardClientesDeuda from './views/DashboardClientesDeuda';
import './App.css';

function App() {
  const [vista, setVista] = useState('registro');

  return (
    <>
      <nav className="app-nav">
        <button
          className={`app-nav-btn ${vista === 'registro' ? 'activo' : ''}`}
          onClick={() => setVista('registro')}
        >
          Registro de clientes
        </button>
        <button
          className={`app-nav-btn ${vista === 'dashboard' ? 'activo' : ''}`}
          onClick={() => setVista('dashboard')}
        >
          Dashboard de deuda
        </button>
      </nav>

      {vista === 'registro' && <RegistroCliente />}
      {vista === 'dashboard' && <DashboardClientesDeuda />}
    </>
  );
}

export default App;
