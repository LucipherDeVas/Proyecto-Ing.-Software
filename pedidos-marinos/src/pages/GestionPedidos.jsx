// src/pages/GestionPedidos.jsx
// ─────────────────────────────────────────────────────────────
// Gestión de pedidos — listado real (Supabase) con filtros y
// acciones de cambio de estado (registrar pago / anular / reabrir).
// El trigger `sincronizar_pago_y_deuda` ajusta la deuda del cliente.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react';
import { listarPedidosConCliente, actualizarEstadoPedido } from '../services/pedidosService';
import './css/Reportes.css';

const ESTADOS = ['pendiente', 'pagado', 'cancelado'];

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-CL',
    { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtHora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-CL',
    { hour: '2-digit', minute: '2-digit' }) : '';

const labelEstado = (e) => e.charAt(0).toUpperCase() + e.slice(1);

export default function GestionPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizandoId, setActualizandoId] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Fila expandida (observaciones)
  const [expandido, setExpandido] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPedidos(await listarPedidosConCliente());
    } catch (err) {
      setError(err.message);
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Cambio de estado de un pedido
  const cambiarEstado = async (id, nuevoEstado, confirmar) => {
    if (confirmar && !window.confirm(`¿Confirmas marcar el pedido #${id} como "${nuevoEstado}"?`)) {
      return;
    }
    setActualizandoId(id);
    setError('');
    try {
      await actualizarEstadoPedido(id, nuevoEstado);
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, estado: nuevoEstado, fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString() : null }
            : p
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoId(null);
    }
  };

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (fechaDesde && new Date(p.fecha) < new Date(fechaDesde + 'T00:00:00')) return false;
      if (fechaHasta && new Date(p.fecha) > new Date(fechaHasta + 'T23:59:59')) return false;
      if (!q) return true;
      return [p.cliente, p.rut, String(p.id)].some((s) => (s || '').toLowerCase().includes(q));
    });
  }, [pedidos, busqueda, filtroEstado, fechaDesde, fechaHasta]);

  const metricas = useMemo(() => ({
    cantidad: filasFiltradas.length,
    total: filasFiltradas.reduce((s, p) => s + p.total, 0),
    pagados: filasFiltradas.filter((p) => p.estado === 'pagado').length,
    pendientes: filasFiltradas.filter((p) => p.estado === 'pendiente').length,
    cancelados: filasFiltradas.filter((p) => p.estado === 'cancelado').length,
  }), [filasFiltradas]);

  const hayFiltros = busqueda || filtroEstado || fechaDesde || fechaHasta;

  const limpiar = () => {
    setBusqueda(''); setFiltroEstado('');
    setFechaDesde(''); setFechaHasta('');
  };

  return (
    <div className="rc-container rp-container">
      <h1>Gestión de pedidos</h1>
      <p className="rc-subtitulo">
        Listado de pedidos registrados. Registra el pago, anula o reabre pedidos;
        la deuda del cliente se actualiza automáticamente.
      </p>

      {/* ── Métricas ──────────────────────────────────── */}
      <div className="rp-metricas">
        <div className="rp-metrica">
          <span className="rp-num">{metricas.cantidad}</span>
          <span className="rp-lbl">Pedidos</span>
        </div>
        <div className="rp-metrica rp-m-monto">
          <span className="rp-num">{CLP.format(metricas.total)}</span>
          <span className="rp-lbl">Total facturado</span>
        </div>
        <div className="rp-metrica rp-m-ok">
          <span className="rp-num">{metricas.pagados}</span>
          <span className="rp-lbl">Pagados</span>
        </div>
        <div className="rp-metrica rp-m-warn">
          <span className="rp-num">{metricas.pendientes}</span>
          <span className="rp-lbl">Pendientes</span>
        </div>
        <div className="rp-metrica rp-m-danger">
          <span className="rp-num">{metricas.cancelados}</span>
          <span className="rp-lbl">Cancelados</span>
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────── */}
      <div className="rp-filtros">
        <div className="rp-fg rp-fg-busqueda">
          <label className="rp-flabel">Cliente / RUT / pedido</label>
          <input
            type="text" className="dc-input"
            placeholder="Cliente, RUT o N° pedido…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="rp-fg rp-fg-estado">
          <label className="rp-flabel">Estado</label>
          <select
            className="dc-input"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{labelEstado(e)}</option>
            ))}
          </select>
        </div>

        <div className="rp-fg rp-fg-fecha">
          <label className="rp-flabel">Desde</label>
          <input
            type="date" className="dc-input"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>

        <div className="rp-fg rp-fg-fecha">
          <label className="rp-flabel">Hasta</label>
          <input
            type="date" className="dc-input"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>

        <div className="rp-fg rp-fg-acciones">
          {hayFiltros && (
            <button className="rc-btn rp-btn-limpiar" onClick={limpiar}>
              ✕ Limpiar
            </button>
          )}
          <button
            className="rc-btn dc-btn-recargar"
            onClick={cargar} disabled={cargando}
          >
            {cargando ? 'Cargando…' : '↻ Recargar'}
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {error && (
        <div className="rc-mensaje rc-error" style={{ marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {/* ── Tabla ─────────────────────────────────────── */}
      <div className="dc-tabla-wrap">
        <table className="dc-tabla rp-tabla">
          <thead>
            <tr>
              <th className="dc-num">N°</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>RUT</th>
              <th>Estado</th>
              <th className="dc-num">Total</th>
              <th>Acciones</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan="9" className="dc-empty">
                  <span className="rp-spinner" /> Cargando pedidos…
                </td>
              </tr>
            )}

            {!cargando && filasFiltradas.length === 0 && (
              <tr>
                <td colSpan="9" className="dc-empty">
                  {pedidos.length === 0
                    ? 'No hay pedidos registrados.'
                    : 'Ningún pedido coincide con los filtros aplicados.'}
                </td>
              </tr>
            )}

            {!cargando && filasFiltradas.map((p) => (
              <tr key={p.id} className={`rp-fila rp-fila-${p.estado}`}>
                <td className="dc-num rp-id-col">#{p.id}</td>
                <td className="rp-fecha-col">{fmtFecha(p.fecha)}</td>
                <td className="rp-hora-col">{fmtHora(p.fecha)}</td>
                <td className="rp-cliente-col">{p.cliente}</td>
                <td className="rp-rut-col">{p.rut}</td>
                <td>
                  <span className={`rp-badge rp-badge-${p.estado}`}>
                    {labelEstado(p.estado)}
                  </span>
                </td>
                <td className="dc-num rp-total-col">{CLP.format(p.total)}</td>

                {/* Acciones según estado */}
                <td className="rp-acciones">
                  {actualizandoId === p.id ? (
                    <span className="rp-spinner" />
                  ) : (
                    <>
                      {p.estado === 'pendiente' && (
                        <>
                          <button className="rp-accion rp-accion-ok"
                            onClick={() => cambiarEstado(p.id, 'pagado')}>
                            Registrar pago
                          </button>
                          <button className="rp-accion rp-accion-danger"
                            onClick={() => cambiarEstado(p.id, 'cancelado', true)}>
                            Anular
                          </button>
                        </>
                      )}
                      {p.estado === 'pagado' && (
                        <button className="rp-accion"
                          onClick={() => cambiarEstado(p.id, 'pendiente', true)}>
                          Reabrir
                        </button>
                      )}
                      {p.estado === 'cancelado' && (
                        <button className="rp-accion"
                          onClick={() => cambiarEstado(p.id, 'pendiente', true)}>
                          Reactivar
                        </button>
                      )}
                    </>
                  )}
                </td>

                <td className="rp-obs-col">
                  {p.observaciones ? (
                    <>
                      <button
                        className="rp-obs-btn"
                        onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                      >
                        {expandido === p.id ? '▲ Ocultar' : '▼ Ver'}
                      </button>
                      {expandido === p.id && (
                        <div className="rp-obs-texto">{p.observaciones}</div>
                      )}
                    </>
                  ) : (
                    <span className="rp-obs-vacia">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dc-resumen">
        Mostrando <strong>{filasFiltradas.length}</strong> de{' '}
        <strong>{pedidos.length}</strong> pedidos
        {hayFiltros && ' (filtros activos)'}
        {filasFiltradas.length > 0 && (
          <> — Total visible: <strong>{CLP.format(metricas.total)}</strong></>
        )}
      </div>
    </div>
  );
}
