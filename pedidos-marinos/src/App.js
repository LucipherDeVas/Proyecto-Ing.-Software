// src/App.js
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import PedidosForm from './pages/pedidosForm';
import ProductosForm from './pages/productosForm';
import Inicio from './pages/inicio';
import RegistroCliente from './pages/RegistroCliente';
import DashboardClientesDeuda from './pages/DashboardClientesDeuda';
import Login from './pages/login';
import Register from './pages/RegistroCliente'; // si usas el mismo componente para registro
import './App.css';




// Componente interno para la sección de clientes (con toggle)
function ClientesSection() {
  const [vista, setVista] = useState('registro');
  return (
    <>
      <nav className="app-nav">
        <button className={`app-nav-btn ${vista === 'registro' ? 'activo' : ''}`} onClick={() => setVista('registro')}>
          Registro de clientes
        </button>
        <button className={`app-nav-btn ${vista === 'dashboard' ? 'activo' : ''}`} onClick={() => setVista('dashboard')}>
          Dashboard de deuda
        </button>
      </nav>
      {vista === 'registro' && <RegistroCliente />}
      {vista === 'dashboard' && <DashboardClientesDeuda />}
    </>
  );
}

// Componente principal que decide qué mostrar según autenticación
function AppContent() {
  const { session, cliente, signOut, cargando } = useAuth(); // ← incluye cargando

  // Mientras se carga la sesión o el cliente, muestra un mensaje
  if (cargando) {
    return <div className="form-container">Cargando sesión...</div>;
  }

  // Si no hay sesión, mostrar solo login/registro
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Ahora session existe y cargando es false, cliente puede ser null si no existe en BD
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