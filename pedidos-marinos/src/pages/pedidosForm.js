// src/pages/PedidosForm.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import '../App.css';

export default function PedidosForm() {
  const { cliente } = useAuth(); // obtener cliente logueado
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cantidades, setCantidades] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');

  const fechaPedido = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Cargar productos
  useEffect(() => {
    const cargarProductos = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, precio_unitario')
        .order('nombre');

      if (error) {
        console.error(error);
        setMensaje('Error al cargar productos: ' + error.message);
        setProductos([]);
      } else {
        setProductos(data || []);
        const initialCantidades = {};
        (data || []).forEach(prod => {
          initialCantidades[prod.id] = 0;
        });
        setCantidades(initialCantidades);
      }
      setCargando(false);
    };

    cargarProductos();
  }, []);

  const handleCantidadChange = (id, value) => {
    let cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleaned !== '' && !cleaned.startsWith('0.')) {
      cleaned = cleaned.replace(/^0+/, '');
    }
    if (cleaned === '') {
      setCantidades({ ...cantidades, [id]: 0 });
      return;
    }
    let num = parseFloat(cleaned);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    setCantidades({ ...cantidades, [id]: num });
  };

  const calcularSubtotal = (producto) => {
    const cantidad = cantidades[producto.id] || 0;
    return cantidad * producto.precio_unitario;
  };

  const totalGeneral = productos.reduce((total, producto) => {
    return total + calcularSubtotal(producto);
  }, 0);

  const handleEnviarPedido = async () => {
    // Validar que haya cliente logueado
    if (!cliente) {
      setMensaje('Debes iniciar sesión para hacer un pedido.');
      return;
    }

    const productosPedidos = productos.filter(prod => (cantidades[prod.id] || 0) > 0);
    if (productosPedidos.length === 0) {
      setMensaje('No has ingresado ninguna cantidad. Agrega al menos un producto.');
      return;
    }

    // Datos del pedido (ahora con cliente_id)
    const pedidoData = {
      fecha: new Date().toISOString(),
      cliente_id: cliente.id,
      observaciones: observaciones.trim() || null,
      total: totalGeneral,
      estado: 'pendiente'   // por defecto
    };

    try {
      // 1. Insertar pedido
      const { data: pedidoInsert, error: errorPedido } = await supabase
        .from('pedidos')
        .insert([pedidoData])
        .select();

      if (errorPedido) throw new Error(`Error en pedidos: ${errorPedido.message}`);

      const pedidoId = pedidoInsert[0].id;

      // 2. Preparar detalles
      const detalles = productosPedidos.map(prod => ({
        pedido_id: pedidoId,
        producto: prod.nombre,
        cantidad: cantidades[prod.id],
        precio_unitario: prod.precio_unitario,
        subtotal: calcularSubtotal(prod)
      }));

      // 3. Insertar detalles
      const { error: errorDetalles } = await supabase
        .from('detalle_pedido')
        .insert(detalles);

      if (errorDetalles) throw new Error(`Error en detalles: ${errorDetalles.message}`);

      setMensaje(`✅ Pedido #${pedidoId} guardado correctamente. Total: $${totalGeneral.toLocaleString()}`);

      // Limpiar cantidades y observaciones
      const resetCantidades = {};
      productos.forEach(prod => { resetCantidades[prod.id] = 0; });
      setCantidades(resetCantidades);
      setObservaciones('');
    } catch (error) {
      console.error(error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  if (cargando) {
    return <div className="form-container">Cargando catálogo...</div>;
  }

  if (productos.length === 0 && !cargando) {
    return <div className="form-container">No hay productos disponibles. Por favor, agrega productos desde el panel de administración.</div>;
  }

  return (
    <div className="form-container">
      <h1>🐟 Formulario De Pedidos 🐟</h1>
      <p>Ingresa las cantidades deseadas. El pedido se asociará automáticamente a tu cuenta.</p>

      {/* Datos del cliente (solo informativo) */}
      <div className="datos-cliente" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '12px' }}>
        <p><strong>Cliente:</strong> {cliente?.nombre} {cliente?.apellido}</p>
        <p><strong>RUT:</strong> {cliente?.rut}</p>
        <p><strong>Correo:</strong> {cliente?.correo}</p>
        <p><strong>Fecha del pedido:</strong> {fechaPedido}</p>
      </div>

      <div className="tabla-pedido">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(producto => (
              <tr key={producto.id}>
                <td>{producto.nombre}</td>
                <td>
                  <input
                    type="text"
                    value={cantidades[producto.id] === 0 ? '' : cantidades[producto.id]}
                    onChange={(e) => handleCantidadChange(producto.id, e.target.value)}
                    placeholder="0"
                    className="cantidad-input"
                  />
                </td>
                <td className="precio-columna">
                  ${calcularSubtotal(producto).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total general:</td>
              <td style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>${totalGeneral.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="form-group">
        <label htmlFor="observaciones">Observaciones generales (opcional):</label>
        <textarea
          id="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows="3"
          placeholder="Ej: Entregar con hielo, factura, etc."
        />
      </div>

      <button onClick={handleEnviarPedido} className="submit-btn">Enviar pedido</button>
      {mensaje && <div className="mensaje">{mensaje}</div>}
    </div>
  );
}