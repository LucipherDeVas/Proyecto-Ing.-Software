import { useState } from 'react';
import './App.css';
import { supabase } from './lib/supabase';

function App() {
  const catalogo = [
    { id: 1, nombre: 'Reineta', precioUnitario: 5000 },
    { id: 2, nombre: 'Jaiba', precioUnitario: 1500 },
    { id: 3, nombre: 'Salmón', precioUnitario: 8000 },
    { id: 4, nombre: 'Atún', precioUnitario: 7000 },
    { id: 5, nombre: 'Camarón (kg)', precioUnitario: 12000 },
    { id: 6, nombre: 'Mejillón (kg)', precioUnitario: 4000 },
    { id: 7, nombre: 'Langosta', precioUnitario: 15000 }
  ];

  const [cantidades, setCantidades] = useState(
    catalogo.reduce((acc, prod) => {
      acc[prod.id] = 0;
      return acc;
    }, {})
  );

  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  
  // Nuevos estados
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [correoEmpresa, setCorreoEmpresa] = useState('');

  // Fecha actual (no editable, se actualiza al cargar el componente)
  const fechaPedido = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
    return cantidad * producto.precioUnitario;
  };

  const totalGeneral = catalogo.reduce((total, producto) => {
    return total + calcularSubtotal(producto);
  }, 0);

const handleEnviarPedido = async () => {
  // --- Validaciones (sin cambios) ---
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

  const productosPedidos = catalogo.filter(prod => (cantidades[prod.id] || 0) > 0);
  if (productosPedidos.length === 0) {
    setMensaje('No has ingresado ninguna cantidad. Agrega al menos un producto.');
    return;
  }

  // Preparar datos del pedido
  const pedidoData = {
    fecha: new Date().toISOString(),
    nombre_empresa: nombreEmpresa.trim(),
    correo_empresa: correoEmpresa.trim(),
    observaciones: observaciones.trim() || null,
    total: totalGeneral
  };

  // --- DEPURACIÓN: Mostrar lo que se va a enviar ---
  console.log('🔍 Datos a insertar en tabla "pedidos":', pedidoData);
  console.log('🔍 Tipos de datos:', {
    fecha: typeof pedidoData.fecha,
    nombre_empresa: typeof pedidoData.nombre_empresa,
    correo_empresa: typeof pedidoData.correo_empresa,
    observaciones: typeof pedidoData.observaciones,
    total: typeof pedidoData.total
  });

  try {
    // 1. Insertar el pedido (solo esta tabla primero)
    const { data: pedidoInsert, error: errorPedido } = await supabase
      .from('pedidos')
      .insert([pedidoData])
      .select();

    if (errorPedido) {
      console.error('❌ Error completo de Supabase (pedidos):', errorPedido);
      // Mostrar detalles adicionales
      console.error('Código:', errorPedido.code);
      console.error('Mensaje:', errorPedido.message);
      console.error('Detalle:', errorPedido.details);
      console.error('Pista:', errorPedido.hint);
      throw new Error(`Error en pedidos: ${errorPedido.message} (${errorPedido.code})`);
    }

    const pedidoId = pedidoInsert[0].id;
    console.log('✅ Pedido insertado con ID:', pedidoId);

    // 2. Preparar detalles
    const detalles = productosPedidos.map(prod => ({
      pedido_id: pedidoId,
      producto: prod.nombre,
      cantidad: cantidades[prod.id],
      precio_unitario: prod.precioUnitario,
      subtotal: calcularSubtotal(prod)
    }));

    console.log('🔍 Detalles a insertar en "detalle_pedido":', detalles);

    // 3. Insertar detalles
    const { error: errorDetalles } = await supabase
      .from('detalle_pedido')
      .insert(detalles);

    if (errorDetalles) {
      console.error('❌ Error completo de Supabase (detalles):', errorDetalles);
      throw new Error(`Error en detalles: ${errorDetalles.message} (${errorDetalles.code})`);
    }

    setMensaje(`✅ Pedido #${pedidoId} guardado correctamente. Total: $${totalGeneral.toLocaleString()}`);
    
    // Opcional: limpiar formulario (descomenta si quieres)
    // setNombreEmpresa('');
    // setCorreoEmpresa('');
    // setObservaciones('');
    // setCantidades(catalogo.reduce((acc, prod) => { acc[prod.id] = 0; return acc; }, {}));

  } catch (error) {
    console.error('🚨 Error general capturado:', error);
    setMensaje(`❌ Error: ${error.message}`);
  }
};

  return (
    <div className="form-container">
      <h1>🐟 Formulario De Pedidos 🐟</h1>
      <p>Ingresa las cantidades deseadas en la columna "Cantidad". El precio se calcula automáticamente.</p>

      {/* Nuevos campos de empresa y fecha */}
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
            {catalogo.map(producto => (
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

export default App;