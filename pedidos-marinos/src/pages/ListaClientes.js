// src/pages/ListaClientes.js
import { useEffect, useState, useCallback, useMemo } from 'react';
import { listarClientes, actualizarCliente } from '../services/clientesService';
import './css/ListaClientes.css';

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function nombreCliente(c) {
  if (c.tipo === 'empresa') return c.razon_social || '—';
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || '—';
}

export default function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  
  // Estado para edición inline
  const [editandoId, setEditandoId] = useState(null);
  const [editandoValor, setEditandoValor] = useState('');

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

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(c => {
      const nombre = nombreCliente(c).toLowerCase();
      const rut = (c.rut || '').toLowerCase();
      const correo = (c.correo || '').toLowerCase();
      return nombre.includes(q) || rut.includes(q) || correo.includes(q);
    });
  }, [clientes, busqueda]);

  // Iniciar edición
  const iniciarEdicion = (cliente) => {
    setEditandoId(cliente.id);
    setEditandoValor(cliente.limite_deuda?.toString() ?? '0');
  };

  // Guardar cambio
  const guardarEdicion = async (id) => {
    const nuevoLimite = parseFloat(editandoValor);
    if (isNaN(nuevoLimite)) {
      setError('Ingrese un número válido para el límite');
      return;
    }
    try {
      await actualizarCliente(id, { limite_deuda: nuevoLimite });
      // Actualizar estado local
      setClientes(prev => prev.map(c =>
        c.id === id ? { ...c, limite_deuda: nuevoLimite } : c
      ));
      setEditandoId(null);
      setError('');
    } catch (err) {
      setError(`Error al actualizar: ${err.message}`);
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoValor('');
  };

  return (
    <div className="dc-container">
      <h1>Lista de clientes</h1>
      <p className="dc-subtitulo">Todos los clientes registrados en el sistema.</p>

      <div className="dc-controles">
        <input
          type="text"
          className="dc-input"
          placeholder="Buscar por nombre, RUT o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="rc-btn dc-btn-recargar" onClick={cargar} disabled={cargando}>
          {cargando ? 'Cargando...' : '↻ Recargar'}
        </button>
      </div>

      {error && <div className="dc-error">Error: {error}</div>}

      <div className="dc-tabla-wrap">
        <table className="dc-tabla">
          <thead>
            <tr>
              <th>Cliente</th><th>Tipo</th><th>RUT</th><th>Correo</th>
              <th className="dc-num">Deuda actual</th><th className="dc-num">Límite</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && filasFiltradas.length === 0 && (
              <tr>
                <td colSpan="8" className="dc-empty">
                  {clientes.length === 0
                    ? 'No hay clientes registrados.'
                    : 'Ningún cliente coincide con la búsqueda.'}
                </td>
              </tr>
            )}
            {filasFiltradas.map(c => (
              <tr key={c.id}>
                <td>{nombreCliente(c)}</td>
                <td>{c.tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona'}</td>
                <td>{c.rut || '—'}</td>
                <td>{c.correo || '—'}</td>
                <td className="dc-num">{formatoCLP.format(Number(c.deuda_actual ?? 0))}</td>
                
                {/* Celda del límite con edición inline */}
                <td className="dc-num">
                  {editandoId === c.id ? (
                    <input
                      type="number"
                      value={editandoValor}
                      onChange={(e) => setEditandoValor(e.target.value)}
                      style={{ width: '100px', padding: '4px' }}
                      autoFocus
                    />
                  ) : (
                    formatoCLP.format(Number(c.limite_deuda ?? 0))
                  )}
                </td>
                
                <td>
                  {editandoId === c.id ? (
                    <>
                      <button onClick={() => guardarEdicion(c.id)} className="dc-btn-icon" style={{ background: '#28a745', marginRight: '5px' }}>✓</button>
                      <button onClick={cancelarEdicion} className="dc-btn-icon" style={{ background: '#dc3545' }}>✗</button>
                    </>
                  ) : (
                    <button onClick={() => iniciarEdicion(c)} className="dc-btn-icon" style={{ background: '#ffc107', color: '#333' }}>✎</button>
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