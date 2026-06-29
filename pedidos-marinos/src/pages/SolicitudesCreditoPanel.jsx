// src/pages/SolicitudesCreditoPanel.jsx
// Panel de notificaciones en vivo para el administrador: muestra las
// solicitudes de aumento de crédito pendientes y permite aprobarlas/rechazarlas.
import { useEffect, useState, useCallback } from 'react';
import {
  listarSolicitudesPendientes,
  resolverSolicitud,
  suscribirSolicitudes,
  tablaNoMigrada,
} from '../services/solicitudesService';
import './css/SolicitudesCredito.css';

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

export default function SolicitudesCreditoPanel({ onResuelta }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [error, setError] = useState('');
  const [resolviendoId, setResolviendoId] = useState(null);
  const [oculto, setOculto] = useState(false); // tabla aún no migrada (007)

  const cargar = useCallback(async () => {
    try {
      const data = await listarSolicitudesPendientes();
      setSolicitudes(data);
      setError('');
    } catch (err) {
      if (tablaNoMigrada(err)) {
        setOculto(true); 
      } else {
        setError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    cargar();
    // Suscripción en vivo: ante cualquier cambio, recargar la lista.
    const desuscribir = suscribirSolicitudes(() => cargar());
    return desuscribir;
  }, [cargar]);

  const resolver = async (sol, aprobar) => {
    const pregunta = aprobar
      ? `¿Aprobar y subir el límite de ${sol.cliente} a ${formatoCLP.format(Number(sol.limite_solicitado))}?`
      : `¿Rechazar la solicitud de ${sol.cliente}?`;
    if (!window.confirm(pregunta)) return;

    setResolviendoId(sol.id);
    setError('');
    try {
      await resolverSolicitud(sol.id, aprobar);
      await cargar();
      if (onResuelta) onResuelta();
    } catch (err) {
      setError(err.message);
    } finally {
      setResolviendoId(null);
    }
  };

  if (oculto) return null;

  return (
    <section className="sc-panel">
      <div className="sc-panel-head">
        <span className="sc-bell" aria-hidden="true">🔔</span>
        <h2 className="sc-titulo">Solicitudes de crédito</h2>
        {solicitudes.length > 0 && (
          <span className="sc-badge">{solicitudes.length}</span>
        )}
        <span className="sc-live" title="Se actualiza en vivo">● En vivo</span>
      </div>

      {error && <div className="sc-error">{error}</div>}

      {solicitudes.length === 0 ? (
        <p className="sc-vacio">No hay solicitudes pendientes.</p>
      ) : (
        <ul className="sc-lista">
          {solicitudes.map((s) => (
            <li key={s.id} className="sc-item">
              <div className="sc-info">
                <div className="sc-cliente">
                  <strong>{s.cliente}</strong>
                  <span className="sc-rut">{s.rut}</span>
                </div>
                <div className="sc-montos">
                  {formatoCLP.format(Number(s.limite_actual ?? 0))}
                  <span className="sc-flecha"> → </span>
                  <strong className="sc-solicitado">
                    {formatoCLP.format(Number(s.limite_solicitado ?? 0))}
                  </strong>
                </div>
                {s.mensaje && <div className="sc-msg">“{s.mensaje}”</div>}
              </div>
              <div className="sc-acciones">
                <button
                  className="sc-btn sc-btn-ok"
                  onClick={() => resolver(s, true)}
                  disabled={resolviendoId === s.id}
                >
                  {resolviendoId === s.id ? '…' : '✓ Aprobar'}
                </button>
                <button
                  className="sc-btn sc-btn-no"
                  onClick={() => resolver(s, false)}
                  disabled={resolviendoId === s.id}
                >
                  ✗ Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
