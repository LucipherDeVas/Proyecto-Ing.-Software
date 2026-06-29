// src/pages/NotificacionesAdmin.jsx

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { suscribirSolicitudes } from '../services/solicitudesService';
import './css/Notificaciones.css';

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

// Beep de dos tonos generado con Web Audio 
function reproducirBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tono = (freq, inicio, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + inicio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    tono(740, 0, 0.18);
    tono(988, 0.16, 0.26);
    setTimeout(() => ctx.close(), 900);
  } catch {
    /* audio bloqueado por el navegador: se ignora */
  }
}

export default function NotificacionesAdmin() {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const quitar = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    // Pide permiso para notificaciones del navegador (pop-up del SO).
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const desuscribir = suscribirSolicitudes(
      (payload) => {
        const s = payload.new || {};
        const monto = Number(s.limite_solicitado ?? 0);
        const id = s.id ?? Date.now();

        // Toast in-app
        setToasts((prev) => {
          if (prev.some((t) => t.id === id)) return prev;
          return [...prev, { id, monto }];
        });
        // Sonido
        reproducirBeep();
        // Notificación del navegador (si el usuario dio permiso)
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nueva solicitud de crédito', {
              body: `Un cliente solicita un límite de ${formatoCLP.format(monto)}.`,
            });
          }
        } catch { /* ignorar */ }

        // Auto-cierre a los 10 s
        setTimeout(() => quitar(id), 10000);
      },
      { nombreCanal: 'solicitudes_pop', evento: 'INSERT' }
    );

    return desuscribir;
  }, [quitar]);

  if (toasts.length === 0) return null;

  return (
    <div className="noti-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="noti-toast">
          <span className="noti-icono" aria-hidden="true">🔔</span>
          <div className="noti-cuerpo">
            <strong className="noti-titulo">Nueva solicitud de crédito</strong>
            <span className="noti-texto">
              Un cliente solicita un límite de {formatoCLP.format(t.monto)}.
            </span>
            <button
              className="noti-link"
              onClick={() => { quitar(t.id); navigate('/clientes'); }}
            >
              Ver solicitudes →
            </button>
          </div>
          <button
            className="noti-cerrar"
            onClick={() => quitar(t.id)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
