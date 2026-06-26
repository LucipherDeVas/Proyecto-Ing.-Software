import { useEffect, useMemo, useState, useCallback } from 'react';
import { listarClientes, actualizarCliente } from '../services/clientesService';
import { calcularEstado, porcentajeUsado, nombreCliente, estaClienteBloqueado } from '../utils/clienteDeuda';
import { useAuth } from '../context/AuthContext';
import SolicitudesCreditoPanel from './SolicitudesCreditoPanel';
import './css/DashboardClientesDeuda.css';

export { calcularEstado, porcentajeUsado, nombreCliente };

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

  // Edición inline: actualizar deuda post-pedido y fecha de vencimiento
  const [editandoId, setEditandoId] = useState(null);
  const [editandoDeuda, setEditandoDeuda] = useState('');
  const [editandoVencimiento, setEditandoVencimiento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [bloqueandoId, setBloqueandoId] = useState(null);

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

  // Id del usuario logueado, para no listarse a sí mismo (el admin
  // también tiene una fila en `clientes` creada al registrarse).
  const miUserId = useAuth()?.session?.user?.id;

  // Anota cada cliente con estado + % calculados una sola vez
  const filas = useMemo(() => {
    return clientes
      .filter(c => !miUserId || c.auth_user_id !== miUserId)
      .map(c => ({
        ...c,
        _nombre: nombreCliente(c),
        _estado: calcularEstado(c),
        _porcentaje: porcentajeUsado(c),
        _bloqueado: estaClienteBloqueado(c),
      }));
  }, [clientes, miUserId]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(f => {
      if (filtroEstado && f._estado !== filtroEstado) return false;
      if (!q) return true;
      const campos = [f._nombre, f.rut, f.correo].filter(Boolean).map(s => s.toString().toLowerCase());
      return campos.some(s => s.includes(q));
    });
  }, [filas, busqueda, filtroEstado]);

  // ── Actualizar deuda post-pedido + fecha de vencimiento ───────
  const iniciarEdicion = (cliente) => {
    setEditandoId(cliente.id);
    setEditandoDeuda(String(cliente.deuda_actual ?? 0));
    setEditandoVencimiento((cliente.fecha_vencimiento_deuda || '').slice(0, 10));
    setError('');
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoDeuda('');
    setEditandoVencimiento('');
  };

  const guardarCambios = async (id) => {
    const nuevaDeuda = parseFloat(editandoDeuda);
    if (Number.isNaN(nuevaDeuda) || nuevaDeuda < 0) {
      setError('Ingrese un monto de deuda válido (mayor o igual a 0).');
      return;
    }
    const nuevoVenc = editandoVencimiento ? editandoVencimiento : null;
    setGuardando(true);
    try {
      await actualizarCliente(id, { deuda_actual: nuevaDeuda, fecha_vencimiento_deuda: nuevoVenc });
      // Reflejar el cambio en el estado local → estado y bloqueo se recalculan solos
      setClientes(prev => prev.map(c =>
        c.id === id ? { ...c, deuda_actual: nuevaDeuda, fecha_vencimiento_deuda: nuevoVenc } : c
      ));
      setEditandoId(null);
      setEditandoDeuda('');
      setEditandoVencimiento('');
      setError('');
    } catch (err) {
      setError(`Error al actualizar el cliente: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // Bloquear / desbloquear cliente (campo `activo`)
  const toggleActivo = async (cliente) => {
    const nuevoActivo = cliente.activo === false; // inactivo → activar; activo → bloquear
    setBloqueandoId(cliente.id);
    setError('');
    try {
      await actualizarCliente(cliente.id, { activo: nuevoActivo });
      setClientes(prev => prev.map(c =>
        c.id === cliente.id ? { ...c, activo: nuevoActivo } : c
      ));
    } catch (err) {
      setError(`Error al cambiar el bloqueo: ${err.message}`);
    } finally {
      setBloqueandoId(null);
    }
  };

  return (
    <div className="rc-container dc-container">
      <h1>Dashboard de clientes y deuda</h1>
      <p className="rc-subtitulo">
        Listado de clientes registrados y su estado financiero calculado a partir de la deuda actual,
        el límite y la fecha de vencimiento.
      </p>

      {/* Notificaciones en vivo: solicitudes de aumento de crédito.
          Al aprobar/rechazar se recarga la tabla para reflejar el nuevo límite. */}
      <SolicitudesCreditoPanel onResuelta={cargar} />

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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && filasFiltradas.length === 0 && (
              <tr>
                <td colSpan="11" className="dc-empty">
                  {clientes.length === 0
                    ? 'No hay clientes registrados.'
                    : 'Ningún cliente coincide con los filtros.'}
                </td>
              </tr>
            )}
            {filasFiltradas.map(f => (
              <tr key={f.id} className={f._bloqueado ? 'dc-fila-bloqueada' : undefined}>
                <td>{f._nombre}</td>
                <td>{f.tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona'}</td>
                <td>{f.rut}</td>
                <td>{f.correo || '—'}</td>
                <td>{f.telefono || '—'}</td>

                {/* Deuda actual — editable inline (Actualizar deuda post-pedido) */}
                <td className="dc-num">
                  {editandoId === f.id ? (
                    <input
                      type="number"
                      className="dc-input-deuda"
                      value={editandoDeuda}
                      onChange={(e) => setEditandoDeuda(e.target.value)}
                      min="0"
                      step="1"
                      autoFocus
                    />
                  ) : (
                    formatoCLP.format(Number(f.deuda_actual ?? 0))
                  )}
                </td>

                <td className="dc-num">{formatoCLP.format(Number(f.limite_deuda ?? 0))}</td>
                <td className="dc-num">
                  {f._porcentaje === null ? '—' : `${f._porcentaje.toFixed(1)}%`}
                </td>

                {/* Vencimiento de la deuda — editable inline (define "Moroso") */}
                <td>
                  {editandoId === f.id ? (
                    <input
                      type="date"
                      className="dc-input-venc"
                      value={editandoVencimiento}
                      onChange={(e) => setEditandoVencimiento(e.target.value)}
                    />
                  ) : (
                    formatoFecha(f.fecha_vencimiento_deuda)
                  )}
                </td>

                {/* Estado + indicador visual de bloqueo */}
                <td>
                  <div className="dc-estado-cell">
                    <span className={badgeClass(f._estado)}>{f._estado}</span>
                    {f._bloqueado && (
                      <span
                        className="dc-badge dc-badge-bloqueado"
                        title="Cliente bloqueado: no puede generar pedidos (inactivo, moroso o límite superado)"
                      >
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>
                </td>

                {/* Acciones: actualizar deuda/vencimiento y bloquear/desbloquear */}
                <td className="dc-acciones">
                  {editandoId === f.id ? (
                    <>
                      <button
                        onClick={() => guardarCambios(f.id)}
                        className="dc-btn-icon"
                        style={{ background: 'var(--color-green)', color: 'var(--color-teal)', marginRight: '5px' }}
                        disabled={guardando}
                        title="Guardar deuda y vencimiento"
                      >
                        {guardando ? '…' : '✓'}
                      </button>
                      <button
                        onClick={cancelarEdicion}
                        className="dc-btn-icon"
                        style={{ background: 'var(--color-orange)', color: 'var(--color-white)' }}
                        disabled={guardando}
                        title="Cancelar"
                      >
                        ✗
                      </button>
                    </>
                  ) : (
                    <div className="dc-acciones-grupo">
                      <button
                        onClick={() => iniciarEdicion(f)}
                        className="dc-btn-actualizar-deuda"
                        title="Actualizar la deuda y el vencimiento tras un pedido o pago"
                      >
                        💰 Actualizar deuda
                      </button>
                      <button
                        onClick={() => toggleActivo(f)}
                        className={`dc-btn-bloqueo ${f.activo === false ? 'is-inactivo' : ''}`}
                        disabled={bloqueandoId === f.id}
                        title={f.activo === false
                          ? 'Reactivar la cuenta del cliente'
                          : 'Bloquear la cuenta del cliente (no podrá generar pedidos)'}
                      >
                        {bloqueandoId === f.id
                          ? '…'
                          : f.activo === false ? '🔓 Desbloquear' : '🔒 Bloquear'}
                      </button>
                    </div>
                  )}
                </td>
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
