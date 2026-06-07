// src/pages/Reportes.jsx
// ─────────────────────────────────────────────────────────────
// Vista de Reportes — histórico de pedidos con filtros por
// rango de fechas, cliente y estado.
//
// MODO DEMO: datos en memoria (USAR_SUPABASE = false)
// MODO REAL: cambia USAR_SUPABASE = true y sigue las instrucciones
//            del bloque "Conexión a Supabase" más abajo.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react';
import './css/Reportes.css';

// ════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN DE MODO
// ════════════════════════════════════════════════════════════
const USAR_SUPABASE = false;

// Cuando USAR_SUPABASE = true, descomenta esta línea:
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient('TU_URL', 'TU_ANON_KEY');

// ════════════════════════════════════════════════════════════
// 2. DATOS DEMO
// ════════════════════════════════════════════════════════════
const hoy = new Date();
const f = (diasAtras, hora = '10:00') => {
  const d = new Date(hoy);
  d.setDate(d.getDate() - diasAtras);
  return `${d.toISOString().slice(0, 10)}T${hora}:00`;
};

const PEDIDOS_DEMO = [
  { id: 1,  fecha: f(0,  '09:15'), cliente: 'Juan Pérez',       rut: '22.222.222-2', estado: 'pendiente',  total: 42000,  observaciones: 'Entregar con hielo' },
  { id: 2,  fecha: f(1,  '11:30'), cliente: 'ACME Pesca SA',    rut: '11.111.111-1', estado: 'entregado',  total: 128400, observaciones: null },
  { id: 3,  fecha: f(2,  '08:45'), cliente: 'Morosa SpA',       rut: '33.333.333-3', estado: 'cancelado',  total: 21000,  observaciones: 'Cancelado por cliente' },
  { id: 4,  fecha: f(3,  '14:00'), cliente: 'Juan Pérez',       rut: '22.222.222-2', estado: 'entregado',  total: 96600,  observaciones: null },
  { id: 5,  fecha: f(5,  '10:20'), cliente: 'ACME Pesca SA',    rut: '11.111.111-1', estado: 'entregado',  total: 204000, observaciones: 'Factura solicitada' },
  { id: 6,  fecha: f(7,  '16:10'), cliente: 'Sur Marino Ltda',  rut: '44.444.444-4', estado: 'pendiente',  total: 57500,  observaciones: null },
  { id: 7,  fecha: f(10, '09:00'), cliente: 'Morosa SpA',       rut: '33.333.333-3', estado: 'entregado',  total: 36000,  observaciones: null },
  { id: 8,  fecha: f(12, '13:45'), cliente: 'Sur Marino Ltda',  rut: '44.444.444-4', estado: 'entregado',  total: 115200, observaciones: 'Entregar antes de las 12' },
  { id: 9,  fecha: f(15, '11:00'), cliente: 'Juan Pérez',       rut: '22.222.222-2', estado: 'cancelado',  total: 18200,  observaciones: null },
  { id: 10, fecha: f(20, '08:30'), cliente: 'ACME Pesca SA',    rut: '11.111.111-1', estado: 'entregado',  total: 312000, observaciones: 'Pedido mensual' },
  { id: 11, fecha: f(22, '15:00'), cliente: 'Sur Marino Ltda',  rut: '44.444.444-4', estado: 'pendiente',  total: 68400,  observaciones: null },
  { id: 12, fecha: f(25, '10:00'), cliente: 'Morosa SpA',       rut: '33.333.333-3', estado: 'entregado',  total: 43200,  observaciones: null },
  { id: 13, fecha: f(30, '09:30'), cliente: 'Juan Pérez',       rut: '22.222.222-2', estado: 'entregado',  total: 84000,  observaciones: 'Con guía de despacho' },
  { id: 14, fecha: f(35, '14:15'), cliente: 'ACME Pesca SA',    rut: '11.111.111-1', estado: 'cancelado',  total: 27600,  observaciones: null },
  { id: 15, fecha: f(40, '11:45'), cliente: 'Sur Marino Ltda',  rut: '44.444.444-4', estado: 'entregado',  total: 156000, observaciones: 'Pedido extraordinario' },
];

const ESTADOS = ['pendiente', 'entregado', 'cancelado'];

// ════════════════════════════════════════════════════════════
// 3. FUNCIÓN DE CARGA
// ════════════════════════════════════════════════════════════
async function fetchPedidos() {
  // ── Modo demo ────────────────────────────────────────────
  if (!USAR_SUPABASE) {
    await new Promise(r => setTimeout(r, 350)); // simula red
    return PEDIDOS_DEMO;
  }

  // ── Modo Supabase real ───────────────────────────────────
  // Requiere las tablas de TABLAS.sql ejecutadas en tu proyecto.
  //
  // const { data, error } = await supabase
  //   .from('pedidos')
  //   .select(`
  //     id, fecha, estado, total, observaciones,
  //     clientes ( nombre, apellido, razon_social, rut )
  //   `)
  //   .order('fecha', { ascending: false });
  //
  // if (error) throw new Error(error.message);
  //
  // return (data ?? []).map(p => ({
  //   id:            p.id,
  //   fecha:         p.fecha,
  //   estado:        p.estado,
  //   total:         p.total,
  //   observaciones: p.observaciones,
  //   cliente: p.clientes?.razon_social
  //            ?? `${p.clientes?.nombre ?? ''} ${p.clientes?.apellido ?? ''}`.trim()
  //            || '—',
  //   rut: p.clientes?.rut ?? '—',
  // }));
}

// ════════════════════════════════════════════════════════════
// 4. HELPERS DE FORMATO
// ════════════════════════════════════════════════════════════
const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

const fmtFecha = iso =>
  iso ? new Date(iso).toLocaleDateString('es-CL',
    { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtHora = iso =>
  iso ? new Date(iso).toLocaleTimeString('es-CL',
    { hour: '2-digit', minute: '2-digit' }) : '';

const labelEstado = e => e.charAt(0).toUpperCase() + e.slice(1);

// ════════════════════════════════════════════════════════════
// 5. COMPONENTE
// ════════════════════════════════════════════════════════════
export default function Reportes() {
  const [pedidos, setPedidos]   = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');

  // Filtros
  const [busqueda, setBusqueda]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde]     = useState('');
  const [fechaHasta, setFechaHasta]     = useState('');

  // Fila expandida (observaciones)
  const [expandido, setExpandido] = useState(null);

  // ── Carga inicial ───────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPedidos(await fetchPedidos());
    } catch (err) {
      setError(err.message);
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Filtrado ────────────────────────────────────────────
  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pedidos.filter(p => {
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (fechaDesde && new Date(p.fecha) < new Date(fechaDesde + 'T00:00:00')) return false;
      if (fechaHasta && new Date(p.fecha) > new Date(fechaHasta + 'T23:59:59')) return false;
      if (!q) return true;
      return [p.cliente, p.rut, String(p.id)]
        .some(s => s.toLowerCase().includes(q));
    });
  }, [pedidos, busqueda, filtroEstado, fechaDesde, fechaHasta]);

  // ── Métricas del subconjunto visible ───────────────────
  const metricas = useMemo(() => ({
    cantidad:   filasFiltradas.length,
    total:      filasFiltradas.reduce((s, p) => s + p.total, 0),
    entregados: filasFiltradas.filter(p => p.estado === 'entregado').length,
    pendientes: filasFiltradas.filter(p => p.estado === 'pendiente').length,
    cancelados: filasFiltradas.filter(p => p.estado === 'cancelado').length,
  }), [filasFiltradas]);

  const hayFiltros = busqueda || filtroEstado || fechaDesde || fechaHasta;

  const limpiar = () => {
    setBusqueda(''); setFiltroEstado('');
    setFechaDesde(''); setFechaHasta('');
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="rc-container rp-container">
      <h1>Reportes</h1>
      <p className="rc-subtitulo">
        Histórico de pedidos. Filtra por rango de fechas, cliente o estado
        para revisar y analizar el comportamiento de ventas.
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
          <span className="rp-num">{metricas.entregados}</span>
          <span className="rp-lbl">Entregados</span>
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
        <div className="rp-fg">
          <label className="rp-flabel">Buscar</label>
          <input
            type="text" className="dc-input"
            placeholder="Cliente, RUT o N° pedido…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <div className="rp-fg">
          <label className="rp-flabel">Estado</label>
          <select
            className="dc-input"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => (
              <option key={e} value={e}>{labelEstado(e)}</option>
            ))}
          </select>
        </div>

        <div className="rp-fg">
          <label className="rp-flabel">Desde</label>
          <input
            type="date" className="dc-input"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
          />
        </div>

        <div className="rp-fg">
          <label className="rp-flabel">Hasta</label>
          <input
            type="date" className="dc-input"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
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
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Estado: cargando */}
            {cargando && (
              <tr>
                <td colSpan="8" className="dc-empty">
                  <span className="rp-spinner" /> Cargando pedidos…
                </td>
              </tr>
            )}

            {/* Sin resultados */}
            {!cargando && filasFiltradas.length === 0 && (
              <tr>
                <td colSpan="8" className="dc-empty">
                  {pedidos.length === 0
                    ? 'No hay pedidos registrados.'
                    : 'Ningún pedido coincide con los filtros aplicados.'}
                </td>
              </tr>
            )}

            {/* Filas */}
            {!cargando && filasFiltradas.map(p => (
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
                <td className="rp-obs-col">
                  {p.observaciones ? (
                    <>
                      <button
                        className="rp-obs-btn"
                        onClick={() =>
                          setExpandido(expandido === p.id ? null : p.id)
                        }
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
          <> — Total visible:{' '}
            <strong>{CLP.format(metricas.total)}</strong>
          </>
        )}
      </div>
    </div>
  );
}
