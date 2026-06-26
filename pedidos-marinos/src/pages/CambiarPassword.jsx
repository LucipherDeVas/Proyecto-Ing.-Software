// src/pages/CambiarPassword.jsx
// Cambio de contraseña del usuario autenticado (cliente o admin).
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function CambiarPassword() {
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    if (password.length < 6) {
      setMensaje('❌ La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmar) {
      setMensaje('❌ Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } else {
      setMensaje('✅ Contraseña actualizada correctamente.');
      setPassword('');
      setConfirmar('');
    }
    setCargando(false);
  };

  return (
    <div className="form-container">
      <h1>Cambiar contraseña</h1>
      <p style={{ textAlign: 'center', color: 'var(--color-fg-70)', marginBottom: '1.5rem' }}>
        Ingresa tu nueva contraseña para tu cuenta.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nuevaPassword">Nueva contraseña</label>
          <input
            id="nuevaPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmarNuevaPassword">Confirmar nueva contraseña</label>
          <input
            id="confirmarNuevaPassword"
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <button type="submit" className="submit-btn" disabled={cargando}>
          {cargando ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
        {mensaje && <div className="mensaje">{mensaje}</div>}
      </form>
    </div>
  );
}
