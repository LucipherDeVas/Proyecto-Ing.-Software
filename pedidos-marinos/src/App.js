import { useState } from 'react';
import './App.css';

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

  const handleEnviarPedido = () => {
    const productosPedidos = catalogo.filter(prod => (cantidades[prod.id] || 0) > 0);
    if (productosPedidos.length === 0) {
      setMensaje('No has ingresado ninguna cantidad. Agrega al menos un producto.');
      return;
    }

    const pedido = {
      items: productosPedidos.map(prod => ({
        nombre: prod.nombre,
        cantidad: cantidades[prod.id],
        precioUnitario: prod.precioUnitario,
        subtotal: calcularSubtotal(prod)
      })),
      observaciones: observaciones,
      total: totalGeneral,
      fecha: new Date().toLocaleString()
    };
    console.log('Pedido enviado:', pedido);
    setMensaje(`Pedido enviado. Total: $${totalGeneral.toLocaleString()}`);
  };

  return (
    <div className="form-container">
      <h1>🐟 Formulario De Pedidos 🐟</h1>
      <p>Ingresa las cantidades deseadas en la columna "Cantidad". El precio se calcula automáticamente.</p>

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