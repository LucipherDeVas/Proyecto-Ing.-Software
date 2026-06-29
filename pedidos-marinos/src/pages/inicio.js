import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { listarClientes } from '../services/clientesService';
import { listarPedidosConCliente } from '../services/pedidosService';
import {
  listarSolicitudesPendientes,
  obtenerMiSolicitudPendiente,
  tablaNoMigrada,
} from '../services/solicitudesService';
import {
  calcularEstado,
  estaClienteBloqueado,
  nombreCliente,
  porcentajeUsado,
} from '../utils/clienteDeuda';
import './css/Inicio.css';

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatoFechaLarga = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function fechaCorta(valor) {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : formatoFecha.format(fecha);
}

function metricasPedidos(pedidos) {
  const visibles = pedidos || [];
  return {
    total: visibles.length,
    pendientes: visibles.filter((p) => p.estado === 'pendiente').length,
    pagados: visibles.filter((p) => p.estado === 'pagado').length,
    cancelados: visibles.filter((p) => p.estado === 'cancelado').length,
    facturado: visibles.reduce((sum, p) => sum + Number(p.total ?? 0), 0),
  };
}

function iniciales(nombre) {
  return (nombre || 'PM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export default function Inicio() {
  const { cliente, esAdmin, session } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudCliente, setSolicitudCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      if (esAdmin) {
        const [pedidosData, clientesData, solicitudesData] = await Promise.all([
          listarPedidosConCliente(),
          listarClientes(),
          listarSolicitudesPendientes().catch((err) => {
            if (tablaNoMigrada(err)) return [];
            throw err;
          }),
        ]);
        setPedidos(pedidosData);
        setClientes(clientesData);
        setSolicitudes(solicitudesData);
        setSolicitudCliente(null);
      } else if (cliente?.id) {
        const [{ data, error: pedidosError }, solicitud] = await Promise.all([
          supabase
            .from('pedidos')
            .select('id, fecha, estado, total, observaciones, fecha_pago')
            .eq('cliente_id', cliente.id)
            .order('fecha', { ascending: false })
            .limit(6),
          obtenerMiSolicitudPendiente(cliente.id).catch((err) => {
            if (tablaNoMigrada(err)) return null;
            throw err;
          }),
        ]);

        if (pedidosError) {
          throw new Error(`Error obteniendo tus pedidos: ${pedidosError.message}`);
        }

        setPedidos((data || []).map((p) => ({ ...p, total: Number(p.total ?? 0) })));
        setClientes([]);
        setSolicitudes([]);
        setSolicitudCliente(solicitud);
      }
    } catch (err) {
      setError(err.message);
      setPedidos([]);
      setClientes([]);
      setSolicitudes([]);
      setSolicitudCliente(null);
    } finally {
      setCargando(false);
    }
  }, [cliente?.id, esAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = cliente ? nombreCliente(cliente) : session?.user?.email || 'Usuario';
  const fechaHoy = formatoFechaLarga.format(new Date());
  const mPedidos = useMemo(() => metricasPedidos(pedidos), [pedidos]);

  const clientesConEstado = useMemo(() => (
    (clientes || []).map((c) => ({
      ...c,
      _estado: calcularEstado(c),
      _bloqueado: estaClienteBloqueado(c),
    }))
  ), [clientes]);

  const clientesBloqueados = clientesConEstado.filter((c) => c._bloqueado).length;
  const clientesMorosos = clientesConEstado.filter((c) => c._estado === 'Moroso').length;

  const deudaCliente = Number(cliente?.deuda_actual ?? 0);
  const limiteCliente = Number(cliente?.limite_deuda ?? 0);
  const creditoDisponible = Math.max(limiteCliente - deudaCliente, 0);
  const estadoCliente = cliente ? calcularEstado(cliente) : 'Sin cliente';
  const clienteBloqueado = estaClienteBloqueado(cliente);
  const usoCliente = cliente ? porcentajeUsado(cliente) : null;

  const accionesAdmin = [
    { label: 'Gestionar pedidos', to: '/gestion-pedidos', detail: `${mPedidos.pendientes} pendientes` },
    { label: 'Clientes y deuda', to: '/clientes', detail: `${clientesBloqueados} bloqueados` },
    { label: 'Productos', to: '/productos', detail: 'Catálogo' },
    { label: 'Reportes', to: '/reportes', detail: 'Contabilidad' },
  ];

  const accionesCliente = [
    { label: 'Crear pedido', to: '/pedidos', detail: `${CLP.format(creditoDisponible)} disponible` },
    { label: 'Ver estado financiero', to: '/pedidos', detail: estadoCliente },
  ];

  return (
    <main className="inicio-page">
      <header className="inicio-header">
        <div>
          <span className="inicio-eyebrow">{fechaHoy}</span>
          <h1 className="inicio-title">Panel principal</h1>
          <p className="inicio-subtitle">
            {esAdmin
              ? 'Vista operativa de pedidos, clientes y solicitudes.'
              : 'Resumen de tu cuenta, crédito y actividad de pedidos.'}
          </p>
        </div>
        <div className="inicio-user">
          <span>{iniciales(nombre)}</span>
          <div>
            <strong>{nombre}</strong>
            <small>{esAdmin ? 'Administrador' : 'Cliente'}</small>
          </div>
        </div>
      </header>

      {error && (
        <div className="inicio-alert">
          {error}
          <button type="button" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {esAdmin ? (
        <>
          <section className="inicio-metricas" aria-label="Resumen administrativo">
            <article className="inicio-metrica">
              <span>Total facturado</span>
              <strong>{CLP.format(mPedidos.facturado)}</strong>
              <small>{mPedidos.total} pedidos registrados</small>
            </article>
            <article className="inicio-metrica">
              <span>Pedidos pendientes</span>
              <strong>{mPedidos.pendientes}</strong>
              <small>{mPedidos.pagados} pagados</small>
            </article>
            <article className="inicio-metrica">
              <span>Clientes</span>
              <strong>{clientes.length}</strong>
              <small>{clientesMorosos} morosos</small>
            </article>
            <article className="inicio-metrica inicio-metrica-acento">
              <span>Solicitudes crédito</span>
              <strong>{solicitudes.length}</strong>
              <small>Pendientes de revisión</small>
            </article>
          </section>

          <section className="inicio-grid">
            <div className="inicio-panel inicio-panel-principal">
              <div className="inicio-panel-head">
                <div>
                  <h2>Actividad reciente</h2>
                  <span>{cargando ? 'Cargando datos' : 'Últimos pedidos registrados'}</span>
                </div>
                <Link to="/gestion-pedidos">Ver gestión</Link>
              </div>

              <div className="inicio-lista">
                {pedidos.slice(0, 5).map((p) => (
                  <article key={p.id} className="inicio-item">
                    <div>
                      <strong>Pedido #{p.id}</strong>
                      <span>{p.cliente || 'Cliente'} · {fechaCorta(p.fecha)}</span>
                    </div>
                    <div className="inicio-item-right">
                      <strong>{CLP.format(Number(p.total ?? 0))}</strong>
                      <span className={`inicio-badge inicio-badge-${p.estado}`}>{p.estado}</span>
                    </div>
                  </article>
                ))}
                {!cargando && pedidos.length === 0 && (
                  <p className="inicio-empty">No hay pedidos registrados.</p>
                )}
              </div>
            </div>

            <aside className="inicio-side">
              <div className="inicio-panel">
                <div className="inicio-panel-head">
                  <div>
                    <h2>Accesos rápidos</h2>
                    <span>Operación</span>
                  </div>
                </div>
                <div className="inicio-actions">
                  {accionesAdmin.map((accion) => (
                    <Link key={accion.to} to={accion.to} className="inicio-action">
                      <strong>{accion.label}</strong>
                      <span>{accion.detail}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="inicio-panel">
                <div className="inicio-panel-head">
                  <div>
                    <h2>Alertas</h2>
                    <span>Seguimiento</span>
                  </div>
                </div>
                <div className="inicio-alert-list">
                  <div>
                    <span>Clientes bloqueados</span>
                    <strong>{clientesBloqueados}</strong>
                  </div>
                  <div>
                    <span>Pedidos cancelados</span>
                    <strong>{mPedidos.cancelados}</strong>
                  </div>
                  <div>
                    <span>Crédito pendiente</span>
                    <strong>{solicitudes.length}</strong>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </>
      ) : (
        <>
          <section className="inicio-metricas" aria-label="Resumen del cliente">
            <article className="inicio-metrica">
              <span>Deuda actual</span>
              <strong>{CLP.format(deudaCliente)}</strong>
              <small>{estadoCliente}</small>
            </article>
            <article className="inicio-metrica">
              <span>Crédito disponible</span>
              <strong>{CLP.format(creditoDisponible)}</strong>
              <small>Límite {CLP.format(limiteCliente)}</small>
            </article>
            <article className="inicio-metrica">
              <span>Pedidos recientes</span>
              <strong>{mPedidos.total}</strong>
              <small>{mPedidos.pendientes} pendientes</small>
            </article>
            <article className={`inicio-metrica ${clienteBloqueado ? 'inicio-metrica-alerta' : 'inicio-metrica-acento'}`}>
              <span>Cuenta</span>
              <strong>{clienteBloqueado ? 'Bloqueada' : 'Activa'}</strong>
              <small>{solicitudCliente ? 'Solicitud de crédito pendiente' : 'Sin solicitudes pendientes'}</small>
            </article>
          </section>

          <section className="inicio-grid">
            <div className="inicio-panel inicio-panel-principal">
              <div className="inicio-panel-head">
                <div>
                  <h2>Últimos pedidos</h2>
                  <span>{cargando ? 'Cargando datos' : 'Actividad de tu cuenta'}</span>
                </div>
                <Link to="/pedidos">Nuevo pedido</Link>
              </div>

              <div className="inicio-lista">
                {pedidos.slice(0, 5).map((p) => (
                  <article key={p.id} className="inicio-item">
                    <div>
                      <strong>Pedido #{p.id}</strong>
                      <span>{fechaCorta(p.fecha)}</span>
                    </div>
                    <div className="inicio-item-right">
                      <strong>{CLP.format(Number(p.total ?? 0))}</strong>
                      <span className={`inicio-badge inicio-badge-${p.estado}`}>{p.estado}</span>
                    </div>
                  </article>
                ))}
                {!cargando && pedidos.length === 0 && (
                  <p className="inicio-empty">Aún no tienes pedidos registrados.</p>
                )}
              </div>
            </div>

            <aside className="inicio-side">
              <div className="inicio-panel">
                <div className="inicio-panel-head">
                  <div>
                    <h2>Crédito</h2>
                    <span>Uso actual</span>
                  </div>
                </div>
                <div className="inicio-credit">
                  <div className="inicio-credit-head">
                    <span>{usoCliente === null ? 'Sin límite configurado' : `${Math.min(100, usoCliente).toFixed(0)}% usado`}</span>
                    <strong>{CLP.format(limiteCliente)}</strong>
                  </div>
                  <div className="inicio-credit-bar" aria-hidden="true">
                    <span style={{ width: `${usoCliente === null ? 0 : Math.min(100, usoCliente)}%` }} />
                  </div>
                  <div className="inicio-credit-values">
                    <span>{CLP.format(deudaCliente)}</span>
                    <span>{CLP.format(creditoDisponible)}</span>
                  </div>
                </div>
              </div>

              <div className="inicio-panel">
                <div className="inicio-panel-head">
                  <div>
                    <h2>Acciones</h2>
                    <span>Cuenta</span>
                  </div>
                </div>
                <div className="inicio-actions">
                  {accionesCliente.map((accion) => (
                    <Link key={`${accion.to}-${accion.label}`} to={accion.to} className="inicio-action">
                      <strong>{accion.label}</strong>
                      <span>{accion.detail}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
