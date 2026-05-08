import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PedidosForm from './pages/pedidosForm';
import ProductosForm from './pages/productosForm';
import Inicio from './pages/inicio';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/pedidos">Pedidos</Link>
        <Link to="/productos">Productos</Link>
      </nav>
      <Routes>
        <Route path="/pedidos" element={<PedidosForm />} />
        <Route path="/productos" element={<ProductosForm />} />
        <Route path="/" element={< Inicio/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;