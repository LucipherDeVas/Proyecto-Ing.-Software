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
import SolicitarCredito from './SolicitarCredito';
import '../App.css';
import './css/Pedidos.css';

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

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

  const productosSeleccionados = productos.filter(
    (prod) => (cantidades[prod.id] || 0) > 0
  ).length;
  const unidadesSeleccionadas = productos.reduce(
    (total, prod) => total + Number(cantidades[prod.id] || 0),
    0
  );

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
      setMensaje('No puedes realizar pedidos: tu cuenta está bloqueada.');
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
          `Pedido #${resultado.pedido.id} aceptado. Total: ${CLP.format(totalGeneral)}`
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
          `Pedido #${resultado.pedido.id} rechazado: ${resultado.evaluacion.motivo}`
        );
      }
    } catch (error) {
      console.error(error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <main className="pedidos-page">
        <section className="pedidos-panel pedidos-empty">
          Cargando catálogo...
        </section>
      </main>
    );
  }

  if (productos.length === 0 && !cargando) {
    return (
      <main className="pedidos-page">
        <section className="pedidos-panel pedidos-empty">
          No hay productos disponibles. Por favor, agrega productos desde el panel de administración.
        </section>
      </main>
    );
  }

  const estadoFinanciero = clienteActualizado ? calcularEstado(clienteActualizado) : null;
  const nombreCliente = [clienteActualizado?.nombre, clienteActualizado?.apellido]
    .filter(Boolean)
    .join(' ') || clienteActualizado?.razon_social || 'Cliente';
  const deudaActual = Number(clienteActualizado?.deuda_actual ?? 0);
  const limiteDeuda = Number(clienteActualizado?.limite_deuda ?? 0);
  const deudaProyectada = deudaActual + totalGeneral;
  const creditoDisponible = Math.max(limiteDeuda - deudaActual, 0);
  const usoCredito = limiteDeuda > 0
    ? Math.min(100, Math.max(0, (deudaProyectada / limiteDeuda) * 100))
    : 0;
  const estadoVisual = clienteBloqueado
    ? 'danger'
    : evaluacionPedido && !evaluacionPedido.aceptado
      ? 'warn'
      : 'ok';

  return (
    <>
      <main className="pedidos-page">
        <header className="pedidos-header">
          <div>
            <span className="pedidos-eyebrow">Pedido cliente</span>
            <h1 className="pedidos-title">Nuevo pedido</h1>
            <p className="pedidos-subtitle">
              Selecciona productos, revisa el impacto en tu crédito y confirma el pedido.
            </p>
          </div>
          <div className={`pedidos-status pedidos-status-${estadoVisual}`}>
            <span>Estado</span>
            <strong>{clienteBloqueado ? 'Bloqueado' : estadoFinanciero || 'Activo'}</strong>
          </div>
        </header>

        <div className="pedidos-layout">
          <section className="pedidos-panel pedidos-main">
            <div className="pedidos-panel-head">
              <div>
                <h2>Catálogo de productos</h2>
                <span>{productos.length} productos disponibles</span>
              </div>
              <strong>{productosSeleccionados} seleccionados</strong>
            </div>

            {clienteBloqueado && (
              <div className="pedidos-alert pedidos-alert-danger">
                Tu cuenta está bloqueada. No puedes realizar pedidos en este momento.
              </div>
            )}

            {!clienteBloqueado && evaluacionPedido && !evaluacionPedido.aceptado && totalGeneral > 0 && (
              <div className="pedidos-alert pedidos-alert-warn">
                {evaluacionPedido.motivo}
              </div>
            )}

            <div className="pedidos-table-wrap">
              <table className="pedidos-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="pedidos-num">Cantidad</th>
                    <th className="pedidos-num">Precio unitario</th>
                    <th className="pedidos-num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => {
                    const cantidad = cantidades[producto.id] || 0;
                    return (
                      <tr
                        key={producto.id}
                        className={cantidad > 0 ? 'is-selected' : ''}
                      >
                        <td>
                          <strong>{producto.nombre}</strong>
                        </td>
                        <td className="pedidos-num">
                          <input
                            type="text"
                            value={cantidad === 0 ? '' : cantidad}
                            onChange={(e) => handleCantidadChange(producto.id, e.target.value)}
                            placeholder="0"
                            className="pedidos-cantidad"
                            aria-label={`Cantidad de ${producto.nombre}`}
                          />
                        </td>
                        <td className="pedidos-num pedidos-money">
                          {CLP.format(Number(producto.precio_unitario ?? 0))}
                        </td>
                        <td className="pedidos-num pedidos-money pedidos-subtotal">
                          {CLP.format(calcularSubtotal(producto))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pedidos-observaciones">
              <label htmlFor="observaciones">Observaciones generales</label>
              <textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows="3"
                placeholder="Ej: Entregar con hielo, factura, etc."
              />
            </div>
          </section>

          <aside className="pedidos-side">
            <section className="pedidos-panel pedidos-summary">
              <div className="pedidos-panel-head">
                <div>
                  <h2>Resumen</h2>
                  <span>{fechaPedido}</span>
                </div>
              </div>

              <div className="pedidos-total">
                <span>Total del pedido</span>
                <strong>{CLP.format(totalGeneral)}</strong>
              </div>

              <div className="pedidos-summary-list">
                <div>
                  <span>Productos</span>
                  <strong>{productosSeleccionados}</strong>
                </div>
                <div>
                  <span>Unidades</span>
                  <strong>{unidadesSeleccionadas}</strong>
                </div>
                <div>
                  <span>Deuda proyectada</span>
                  <strong>{CLP.format(deudaProyectada)}</strong>
                </div>
              </div>

              <div className="pedidos-credit">
                <div className="pedidos-credit-head">
                  <span>Uso de crédito</span>
                  <strong>{CLP.format(creditoDisponible)} disponible</strong>
                </div>
                <div className="pedidos-credit-bar" aria-hidden="true">
                  <span style={{ width: `${usoCredito}%` }} />
                </div>
                <div className="pedidos-credit-values">
                  <span>{CLP.format(deudaActual)}</span>
                  <span>{CLP.format(limiteDeuda)}</span>
                </div>
              </div>

              <button
                onClick={handleAceptarPedido}
                className="submit-btn pedidos-submit"
                disabled={botonDeshabilitado}
              >
                {clienteBloqueado
                  ? 'Cuenta bloqueada'
                  : enviando
                    ? 'Procesando...'
                    : 'Realizar pedido'}
              </button>

              {mensaje && <div className="mensaje pedidos-mensaje">{mensaje}</div>}
            </section>

            <section className="pedidos-panel pedidos-client">
              <div className="pedidos-panel-head">
                <div>
                  <h2>Cliente</h2>
                  <span>{clienteActualizado?.rut || 'Sin RUT'}</span>
                </div>
              </div>

              <dl className="pedidos-client-data">
                <div>
                  <dt>Nombre</dt>
                  <dd>{nombreCliente}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{clienteActualizado?.correo || 'Sin correo'}</dd>
                </div>
                <div>
                  <dt>Deuda actual</dt>
                  <dd>{CLP.format(deudaActual)}</dd>
                </div>
                <div>
                  <dt>Límite</dt>
                  <dd>{CLP.format(limiteDeuda)}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </main>

      {/* Botón flotante de solicitud de crédito (notifica al administrador) */}
      <SolicitarCredito cliente={clienteActualizado} />
    </>
  );
}
