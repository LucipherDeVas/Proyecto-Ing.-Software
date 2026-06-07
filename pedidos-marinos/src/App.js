// src/App.js
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'; // ← corregido
import { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import PedidosForm from './pages/pedidosForm';
import ProductosForm from './pages/productosForm';
import Inicio from './pages/inicio';
// import RegistroCliente from './pages/RegistroCliente'; // ya no se usa aquí
import ListaClientes from './pages/ListaClientes'; // nuevo componente
import DashboardClientesDeuda from './pages/DashboardClientesDeuda';
import ReporteContable from './pages/ReporteContable';
import Login from './pages/login';
import Register from './pages/RegistroCliente'; // para el registro autónomo
import './App.css';

// Componente interno para la sección de clientes (con toggle)
function ClientesSection() {
  const [vista, setVista] = useState('lista'); // cambiar valor inicial a 'lista'
  return (
    <>
      <nav className="app-nav">
        <button className={`app-nav-btn ${vista === 'lista' ? 'activo' : ''}`} onClick={() => setVista('lista')}>
          Lista de clientes
        </button>
        <button className={`app-nav-btn ${vista === 'dashboard' ? 'activo' : ''}`} onClick={() => setVista('dashboard')}>
          Dashboard de deuda
        </button>
      </nav>
      {vista === 'lista' && <ListaClientes />}
      {vista === 'dashboard' && <DashboardClientesDeuda />}
    </>
  );
}

// Componente principal que decide qué mostrar según autenticación
function AppContent() {
  const { session, cliente, signOut, cargando } = useAuth();

  if (cargando) {
    return <div className="form-container">Cargando sesión...</div>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const nombreMostrar = cliente
    ? `${cliente.nombre} ${cliente.apellido}`
    : session.user.email;

  return (
    <>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0f0f0', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">Inicio</Link>
          <Link to="/pedidos">Pedidos</Link>
          <Link to="/productos">Productos</Link>
          <Link to="/clientes">Clientes</Link>
          <Link to="/reportes">Reportes</Link>
        </div>
        <div>
          <button onClick={signOut} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 10px' }}>
            Cerrar sesión {nombreMostrar}
          </button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/pedidos" element={<PedidosForm />} />
        <Route path="/productos" element={<ProductosForm />} />
        <Route path="/clientes" element={<ClientesSection />} />
        <Route path="/reportes" element={<ReporteContable />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;