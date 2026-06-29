// src/App.js
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'; // ← corregido
import { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import PedidosForm from './pages/pedidosForm';
import ProductosForm from './pages/productosForm';
import Inicio from './pages/inicio';
import ListaClientes from './pages/ListaClientes';
import DashboardClientesDeuda from './pages/DashboardClientesDeuda';
import NotificacionesAdmin from './pages/NotificacionesAdmin';
import GestionPedidos from './pages/GestionPedidos';
import ReporteContable from './pages/ReporteContable';
import Login from './pages/login';
import Register from './pages/RegistroCliente';
import CambiarPassword from './pages/CambiarPassword';
import './App.css';

// Componente interno para la sección de clientes (con toggle)
function ClientesSection() {
  const [vista, setVista] = useState('dashboard'); // por defecto abre el Dashboard de deuda
  return (
    <>
      <nav className="app-nav">
        <button className={`app-nav-btn ${vista === 'dashboard' ? 'activo' : ''}`} onClick={() => setVista('dashboard')}>
          Dashboard de deuda
        </button>
        <button className={`app-nav-btn ${vista === 'lista' ? 'activo' : ''}`} onClick={() => setVista('lista')}>
          Lista de clientes
        </button>
      </nav>
      {vista === 'dashboard' && <DashboardClientesDeuda />}
      {vista === 'lista' && <ListaClientes />}
    </>
  );
}

// Componente principal que decide qué mostrar según autenticación
function AppContent() {
  const { session, cliente, signOut, cargando, esAdmin } = useAuth();

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
      {/* Notificaciones en vivo (toast + sonido) para el admin, activas en
          toda la app independientemente de la vista actual. */}
      {esAdmin && <NotificacionesAdmin />}

      {/* Nav superior.
          Rutas, handlers y textos SIN CAMBIOS; solo se reemplazan los
          estilos inline por classNames de presentación. */}
      <nav className="topnav">
        <div className="topnav-group">
          <Link className="topnav-link" to="/">Inicio</Link>
          <Link className="topnav-link" to="/pedidos">Pedidos</Link>
          {/* Vistas de administración: solo visibles para rol admin */}
          {esAdmin && (
            <>
              <Link className="topnav-link" to="/gestion-pedidos">Gestión pedidos</Link>
              <Link className="topnav-link" to="/productos">Productos</Link>
              <Link className="topnav-link" to="/clientes">Clientes</Link>
              <Link className="topnav-link" to="/reportes">Reportes</Link>
            </>
          )}
        </div>
        <div className="topnav-cuenta">
          <Link className="topnav-link" to="/cambiar-password">Cambiar contraseña</Link>
          <button onClick={signOut} className="topnav-logout">
            Cerrar sesión {nombreMostrar}
          </button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/pedidos" element={<PedidosForm />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        {/* Rutas de administración protegidas por rol */}
        <Route path="/gestion-pedidos" element={esAdmin ? <GestionPedidos /> : <Navigate to="/" replace />} />
        <Route path="/productos" element={esAdmin ? <ProductosForm /> : <Navigate to="/" replace />} />
        <Route path="/clientes" element={esAdmin ? <ClientesSection /> : <Navigate to="/" replace />} />
        <Route path="/reportes" element={esAdmin ? <ReporteContable /> : <Navigate to="/" replace />} />
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