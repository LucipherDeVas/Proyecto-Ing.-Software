// src/pages/PedidosForm.js
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { crearPedidoConValidacion } from '../services/pedidosService';
import {
  calcularEstado,
  estaClienteBloqueado,
  evaluarPedido,
} from '../utils/clienteDeuda';
import '../App.css';

export default function PedidosForm() {
  const { cliente } = useAuth();
  const [clienteActualizado, setClienteActualizado] = useState(cliente);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [cantidades, setCantidades] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');

  const fechaPedido = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    setClienteActualizado(cliente);
  }, [cliente]);

  useEffect(() => {
    if (!cliente?.id) return;

    const recargarCliente = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', cliente.id)
        .maybeSingle();

      if (!error && data) {
        setClienteActualizado(data);
      }
    };

    recargarCliente();
  }, [cliente?.id]);

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
        (data || []).forEach((prod) => {
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

  const clienteBloqueado = useMemo(
    () => estaClienteBloqueado(clienteActualizado),
    [clienteActualizado]
  );

  const evaluacionPedido = useMemo(() => {
    if (!clienteActualizado || totalGeneral <= 0) return null;
    return evaluarPedido(clienteActualizado, totalGeneral);
  }, [clienteActualizado, totalGeneral]);

  const botonDeshabilitado =
    enviando ||
    !clienteActualizado ||
    clienteBloqueado ||
    totalGeneral <= 0 ||
    (evaluacionPedido && !evaluacionPedido.aceptado);

  const handleAceptarPedido = async () => {
    if (!clienteActualizado) {
      setMensaje('Debes iniciar sesión para hacer un pedido.');
      return;
    }

    if (clienteBloqueado) {
      setMensaje('❌ No puedes aceptar pedidos: tu cuenta está bloqueada.');
      return;
    }

    const productosPedidos = productos.filter((prod) => (cantidades[prod.id] || 0) > 0);
    if (productosPedidos.length === 0) {
      setMensaje('No has ingresado ninguna cantidad. Agrega al menos un producto.');
      return;
    }

    setEnviando(true);
    setMensaje('');

    try {
      const resultado = await crearPedidoConValidacion({
        clienteId: clienteActualizado.id,
        productosPedidos,
        cantidades,
        calcularSubtotal,
        observaciones,
        total: totalGeneral,
      });

      if (resultado.procesado) {
        setMensaje(
          `✅ Pedido #${resultado.pedido.id} aceptado. Total: $${totalGeneral.toLocaleString()}`
        );
        setClienteActualizado((prev) => ({
          ...prev,
          deuda_actual: resultado.deudaActualizada,
        }));

        const resetCantidades = {};
        productos.forEach((prod) => {
          resetCantidades[prod.id] = 0;
        });
        setCantidades(resetCantidades);
        setObservaciones('');
      } else {
        setMensaje(
          `❌ Pedido #${resultado.pedido.id} rechazado: ${resultado.evaluacion.motivo}`
        );
      }
    } catch (error) {
      console.error(error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <div className="form-container">Cargando catálogo...</div>;
  }

  if (productos.length === 0 && !cargando) {
    return (
      <div className="form-container">
        No hay productos disponibles. Por favor, agrega productos desde el panel de administración.
      </div>
    );
  }

  const estadoFinanciero = clienteActualizado ? calcularEstado(clienteActualizado) : null;

  return (
    <div className="form-container">
      <h1>🐟 Formulario De Pedidos 🐟</h1>
      <p>Ingresa las cantidades deseadas. El pedido se asociará automáticamente a tu cuenta.</p>

      <div
        className="datos-cliente"
        style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '12px' }}
      >
        <p>
          <strong>Cliente:</strong> {clienteActualizado?.nombre} {clienteActualizado?.apellido}
        </p>
        <p>
          <strong>RUT:</strong> {clienteActualizado?.rut}
        </p>
        <p>
          <strong>Correo:</strong> {clienteActualizado?.correo}
        </p>
        <p>
          <strong>Deuda actual:</strong> ${Number(clienteActualizado?.deuda_actual ?? 0).toLocaleString()}
        </p>
        <p>
          <strong>Límite de deuda:</strong> ${Number(clienteActualizado?.limite_deuda ?? 0).toLocaleString()}
        </p>
        {estadoFinanciero && (
          <p>
            <strong>Estado financiero:</strong> {estadoFinanciero}
          </p>
        )}
        <p>
          <strong>Fecha del pedido:</strong> {fechaPedido}
        </p>
      </div>

      {clienteBloqueado && (
        <div className="mensaje" style={{ background: '#fee2e2', color: '#991b1b', marginBottom: '1rem' }}>
          Tu cuenta está bloqueada. No puedes aceptar pedidos en este momento.
        </div>
      )}

      {!clienteBloqueado && evaluacionPedido && !evaluacionPedido.aceptado && totalGeneral > 0 && (
        <div className="mensaje" style={{ background: '#fef3c7', color: '#92400e', marginBottom: '1rem' }}>
          {evaluacionPedido.motivo}
        </div>
      )}

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
            {productos.map((producto) => (
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
                <td className="precio-columna">${calcularSubtotal(producto).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                Total general:
              </td>
              <td style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                ${totalGeneral.toLocaleString()}
              </td>
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

      {!clienteBloqueado && (
        <button
          onClick={handleAceptarPedido}
          className="submit-btn"
          disabled={botonDeshabilitado}
        >
          {enviando ? 'Procesando...' : 'Aceptar pedido'}
        </button>
      )}

      {mensaje && <div className="mensaje">{mensaje}</div>}
    </div>
  );
}
