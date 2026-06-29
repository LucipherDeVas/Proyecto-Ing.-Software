// src/pages/SolicitarCredito.jsx
// Bloque para que el cliente solicite un aumento de su límite de crédito.
import { useState, useEffect } from 'react';
import {
  crearSolicitudCredito,
  obtenerMiSolicitudPendiente,
  tablaNoMigrada,
} from '../services/solicitudesService';
import './css/SolicitudesCredito.css';

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

export default function SolicitarCredito({ cliente }) {
  const [aumento, setAumento] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ui, setUi] = useState('');
  const [pendiente, setPendiente] = useState(null);
  const [oculto, setOculto] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!cliente?.id) return;
    obtenerMiSolicitudPendiente(cliente.id)
      .then(setPendiente)
      .catch((err) => { if (tablaNoMigrada(err)) setOculto(true); });
  }, [cliente?.id]);

  if (oculto || !cliente?.id) return null;

  const limiteActual = Number(cliente.limite_deuda ?? 0);
  const montoAumento = parseFloat(aumento);
  const aumentoValido = !Number.isNaN(montoAumento) && montoAumento > 0;
  const limiteSolicitado = aumentoValido ? limiteActual + montoAumento : limiteActual;
  const opcionesAumento = [50000, 100000, 200000, 500000];

  const enviar = async (e) => {
    e.preventDefault();
    const monto = parseFloat(aumento);
    if (Number.isNaN(monto) || monto <= 0) {
      setUi('❌ Ingresa un monto válido.');
      return;
    }
    setEnviando(true);
    setUi('');
    try {
      const sol = await crearSolicitudCredito({
        clienteId: cliente.id,
        limiteActual,
        limiteSolicitado: limiteActual + monto,
        mensaje,
      });
      setPendiente(sol);
      setAumento('');
      setMensaje('');
      setUi('✅ Solicitud enviada. Un administrador la revisará.');
    } catch (err) {
      setUi(`❌ ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="credito-chat">
      {abierto && (
        <div className="credito-popover" id="credito-popover" role="dialog" aria-modal="false">
          <div className="credito-popover-head">
            <div>
              <h3>Solicitar aumento de crédito</h3>
              <span>Límite actual: {formatoCLP.format(limiteActual)}</span>
            </div>
            <button
              type="button"
              className="credito-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar solicitud de crédito"
            >
              ×
            </button>
          </div>

          {pendiente ? (
            <div className="credito-pendiente">
              <span>Solicitud pendiente</span>
              <strong>{formatoCLP.format(Number(pendiente.limite_solicitado ?? 0))}</strong>
              <p>Espera la revisión del administrador.</p>
            </div>
          ) : (
            <form onSubmit={enviar} className="credito-form">
              <div className="credito-opciones" aria-label="Montos rápidos">
                {opcionesAumento.map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    className={`credito-opcion ${Number(aumento) === monto ? 'is-active' : ''}`}
                    onClick={() => setAumento(String(monto))}
                  >
                    +{formatoCLP.format(monto)}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label htmlFor="aumentoCredito">Monto a aumentar</label>
                <input
                  id="aumentoCredito"
                  type="number"
                  min="0"
                  step="1000"
                  value={aumento}
                  onChange={(e) => setAumento(e.target.value)}
                  placeholder="Ej: 200000"
                />
              </div>

              <div className="credito-total">
                <span>Nuevo límite solicitado</span>
                <strong>{formatoCLP.format(limiteSolicitado)}</strong>
              </div>

              <div className="form-group">
                <label htmlFor="motivoCredito">Motivo (opcional)</label>
                <input
                  id="motivoCredito"
                  type="text"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Ej: aumento de volumen de compra"
                />
              </div>

              <button type="submit" className="submit-btn" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </form>
          )}

          {ui && <div className="mensaje credito-mensaje">{ui}</div>}
        </div>
      )}

      <button
        type="button"
        className="credito-chat-btn"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        aria-controls="credito-popover"
      >
        <span className="credito-chat-icon" aria-hidden="true">+</span>
        <span>{pendiente ? 'Solicitud pendiente' : 'Aumentar crédito'}</span>
      </button>
    </div>
  );
}
