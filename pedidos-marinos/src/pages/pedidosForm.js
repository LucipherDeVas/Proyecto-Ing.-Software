// src/pages/PedidosForm.js
import { useState, useEffect } from 'react';
import '../App.css';
import { supabase } from '../lib/supabase';

export default function PedidosForm() {
  const [productos, setProductos] = useState([]); // productos desde BD
  const [cargando, setCargando] = useState(true);
  const [cantidades, setCantidades] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [correoEmpresa, setCorreoEmpresa] = useState('');

  const fechaPedido = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Cargar productos al montar
  useEffect(() => {
    const cargarProductos = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, precio_unitario')
        .order('nombre'); // o por id

      if (error) {
        console.error(error);
        setMensaje('Error al cargar productos: ' + error.message);
        setProductos([]);
      } else {
        setProductos(data || []);
        // Inicializar cantidades en 0 para cada producto
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
    // Validaciones
    if (!nombreEmpresa.trim()) {
      setMensaje('Por favor ingresa el nombre de la empresa.');
      return;
    }
    if (!correoEmpresa.trim()) {
      setMensaje('Por favor ingresa el correo de la empresa.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoEmpresa.trim())) {
      setMensaje('Ingresa un correo electrónico válido.');
      return;
    }

    const productosPedidos = productos.filter(prod => (cantidades[prod.id] || 0) > 0);
    if (productosPedidos.length === 0) {
      setMensaje('No has ingresado ninguna cantidad. Agrega al menos un producto.');
      return;
    }

    const pedidoData = {
      fecha: new Date().toISOString(),
      nombre_empresa: nombreEmpresa.trim(),
      correo_empresa: correoEmpresa.trim(),
      observaciones: observaciones.trim() || null,
      total: totalGeneral
    };

    try {
      // 1. Insertar pedido
      const { data: pedidoInsert, error: errorPedido } = await supabase
        .from('pedidos')
        .insert([pedidoData])
        .select();

      if (errorPedido) throw new Error(`Error en pedidos: ${errorPedido.message} (${errorPedido.code})`);

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

      if (errorDetalles) throw new Error(`Error en detalles: ${errorDetalles.message} (${errorDetalles.code})`);

      setMensaje(`✅ Pedido #${pedidoId} guardado correctamente. Total: $${totalGeneral.toLocaleString()}`);
      
      // Opcional: limpiar formulario
      // setNombreEmpresa('');
      // setCorreoEmpresa('');
      // setObservaciones('');
      // const resetCantidades = {};
      // productos.forEach(prod => { resetCantidades[prod.id] = 0; });
      // setCantidades(resetCantidades);
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
      <p>Ingresa las cantidades deseadas en la columna "Cantidad". El precio se calcula automáticamente.</p>

      <div className="datos-empresa" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="form-group" style={{ flex: '1 1 200px' }}>
          <label htmlFor="nombreEmpresa">Nombre Empresa *</label>
          <input
            type="text"
            id="nombreEmpresa"
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            placeholder="Ej: Pesquera del Sur"
          />
        </div>
        <div className="form-group" style={{ flex: '1 1 200px' }}>
          <label htmlFor="correoEmpresa">Correo empresa *</label>
          <input
            type="email"
            id="correoEmpresa"
            value={correoEmpresa}
            onChange={(e) => setCorreoEmpresa(e.target.value)}
            placeholder="ventas@pesquera.cl"
          />
        </div>
        <div className="form-group" style={{ flex: '1 1 200px' }}>
          <label htmlFor="fechaPedido">Fecha del pedido</label>
          <input
            type="text"
            id="fechaPedido"
            value={fechaPedido}
            readOnly
            disabled
            style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
          />
        </div>
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