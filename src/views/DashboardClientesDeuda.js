import { useEffect, useMemo, useState, useCallback } from 'react';
import { listarClientes } from '../services/clientesService';
import './DashboardClientesDeuda.css';

const ESTADOS = [
  'Sin deuda',
  'Con deuda',
  'Cercano al límite',
  'Límite superado',
  'Moroso',
];

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatoFecha = (valor) => {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-CL');
};

/**
 * Calcula el estado financiero de un cliente según las reglas de negocio.
 * Prioridad: Moroso > Límite superado > Cercano al límite > Con deuda > Sin deuda.
 */
export function calcularEstado(cliente) {
  const deuda = Number(cliente.deuda_actual ?? 0);
  const limite = Number(cliente.limite_deuda ?? 0);

  if (deuda <= 0) return 'Sin deuda';

  // Moroso: fecha actual > fecha_vencimiento_deuda y deuda > 0
  if (cliente.fecha_vencimiento_deuda) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(cliente.fecha_vencimiento_deuda);
    venc.setHours(0, 0, 0, 0);
    if (venc.getTime() < hoy.getTime()) return 'Moroso';
  }

  if (limite > 0 && deuda >= limite) return 'Límite superado';

  if (limite > 0 && deuda / limite >= 0.8 && deuda < limite) {
    return 'Cercano al límite';
  }

  return 'Con deuda';
}

export function porcentajeUsado(cliente) {
  const deuda = Number(cliente.deuda_actual ?? 0);
  const limite = Number(cliente.limite_deuda ?? 0);
  if (limite <= 0) return null; // evitar división por cero
  return (deuda / limite) * 100;
}

export function nombreCliente(c) {
  if (c.tipo === 'empresa') return c.razon_social || '—';
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || '—';
}

function badgeClass(estado) {
  switch (estado) {
    case 'Sin deuda':         return 'dc-badge dc-badge-ok';
    case 'Con deuda':         return 'dc-badge dc-badge-info';
    case 'Cercano al límite': return 'dc-badge dc-badge-warn';
    case 'Límite superado':   return 'dc-badge dc-badge-danger';
    case 'Moroso':            return 'dc-badge dc-badge-moroso';
    default:                  return 'dc-badge';
  }
}

export default function DashboardClientesDeuda() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await listarClientes();
      setClientes(data);
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Anota cada cliente con estado + % calculados una sola vez
  const filas = useMemo(() => {
    return clientes.map(c => ({
      ...c,
      _nombre: nombreCliente(c),
      _estado: calcularEstado(c),
      _porcentaje: porcentajeUsado(c),
    }));
  }, [clientes]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(f => {
      if (filtroEstado && f._estado !== filtroEstado) return false;
      if (!q) return true;
      const campos = [f._nombre, f.rut, f.correo].filter(Boolean).map(s => s.toString().toLowerCase());
      return campos.some(s => s.includes(q));
    });
  }, [filas, busqueda, filtroEstado]);

  return (
    <div className="rc-container dc-container">
      <h1>Dashboard de clientes y deuda</h1>
      <p className="rc-subtitulo">
        Listado de clientes registrados y su estado financiero calculado a partir de la deuda actual,
        el límite y la fecha de vencimiento.
      </p>

      <div className="dc-controles">
        <input
          type="text"
          className="dc-input"
          placeholder="Buscar por nombre, RUT o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="dc-input"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <button
          className="rc-btn dc-btn-recargar"
          onClick={cargar}
          disabled={cargando}
          title="Recargar desde Supabase"
        >
          {cargando ? 'Cargando...' : '↻ Recargar'}
        </button>
      </div>

      {error && (
        <div className="rc-mensaje rc-error" style={{ marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      <div className="dc-tabla-wrap">
        <table className="dc-tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>RUT</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th className="dc-num">Deuda actual</th>
              <th className="dc-num">Límite</th>
              <th className="dc-num">% usado</th>
              <th>Vencimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && filasFiltradas.length === 0 && (
              <tr>
                <td colSpan="10" className="dc-empty">
                  {clientes.length === 0
                    ? 'No hay clientes registrados.'
                    : 'Ningún cliente coincide con los filtros.'}
                </td>
              </tr>
            )}
            {filasFiltradas.map(f => (
              <tr key={f.id}>
                <td>{f._nombre}</td>
                <td>{f.tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona'}</td>
                <td>{f.rut}</td>
                <td>{f.correo || '—'}</td>
                <td>{f.telefono || '—'}</td>
                <td className="dc-num">{formatoCLP.format(Number(f.deuda_actual ?? 0))}</td>
                <td className="dc-num">{formatoCLP.format(Number(f.limite_deuda ?? 0))}</td>
                <td className="dc-num">
                  {f._porcentaje === null ? '—' : `${f._porcentaje.toFixed(1)}%`}
                </td>
                <td>{formatoFecha(f.fecha_vencimiento_deuda)}</td>
                <td><span className={badgeClass(f._estado)}>{f._estado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dc-resumen">
        Mostrando <strong>{filasFiltradas.length}</strong> de <strong>{clientes.length}</strong> clientes.
      </div>
    </div>
  );
}
