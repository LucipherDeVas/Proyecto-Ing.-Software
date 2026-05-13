import { useState } from 'react';
import './RegistroCliente.css';

// Cambia a true cuando tengas la tabla en Supabase lista (con las columnas de deuda)
const USAR_SUPABASE = true;

let supabase = null;
let validarClienteDuplicado = null;
if (USAR_SUPABASE) {
  // eslint-disable-next-line global-require
  const { supabase: sb } = require('../lib/supabase');
  supabase = sb;
  // eslint-disable-next-line global-require
  validarClienteDuplicado = require('../services/clientesService').validarClienteDuplicado;
}

/**
 * Formatea progresivamente un RUT a medida que el usuario lo escribe.
 * Acepta input crudo (con o sin puntos/guion) y devuelve `xx.xxx.xxx-x`.
 * Conserva la K como dígito verificador (en mayúscula).
 */
export function formatearRut(raw) {
  const limpio = (raw || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let cuerpoFormat = '';
  for (let i = cuerpo.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    cuerpoFormat = cuerpo.slice(start, i) + (cuerpoFormat ? '.' + cuerpoFormat : '');
  }
  return `${cuerpoFormat}-${dv}`;
}

const FORM_INICIAL = {
  rut: '', correo: '', telefono: '', direccion: '',
  razon_social: '', giro: '', nombre_contacto: '', cargo_contacto: '',
  nombre: '', apellido: '',
  limite_deuda: '', fecha_vencimiento_deuda: '',
  activo: true,
};

function RegistroCliente() {
  const [tipo, setTipo] = useState('empresa');
  const [mensaje, setMensaje] = useState({ texto: '', exito: null });
  const [cargando, setCargando] = useState(false);
  const [registros, setRegistros] = useState(() => {
    const guardados = localStorage.getItem('clientes_demo');
    return guardados ? JSON.parse(guardados) : [];
  });

  const [form, setForm] = useState({ ...FORM_INICIAL });

  const handleChange = (e) => {
    const { id, type, checked, value } = e.target;
    let val = type === 'checkbox' ? checked : value;
    if (id === 'rut') val = formatearRut(val);
    setForm({ ...form, [id]: val });
    setMensaje({ texto: '', exito: null });
  };

  const handleTipo = (t) => {
    setTipo(t);
    setForm({ ...FORM_INICIAL });
    setMensaje({ texto: '', exito: null });
  };

  const validar = () => {
    if (!form.rut.trim()) return 'El RUT es obligatorio.';

    // Formato RUT: x.xxx.xxx-x  o  xx.xxx.xxx-x  (dv: 0-9 o K)
    const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;
    if (!rutRegex.test(form.rut.trim())) {
      return 'El RUT debe tener el formato x.xxx.xxx-x o xx.xxx.xxx-x (ej: 12.345.678-9).';
    }

    if (tipo !== 'empresa' && tipo !== 'persona') {
      return 'El tipo de cliente debe ser empresa o persona.';
    }

    if (tipo === 'empresa') {
      if (!form.razon_social.trim()) return 'La razón social es obligatoria.';
      if (!form.giro.trim()) return 'El giro es obligatorio para empresas.';
      if (!form.nombre_contacto.trim()) return 'El nombre de contacto es obligatorio.';
    } else {
      if (!form.nombre.trim()) return 'El nombre es obligatorio.';
      if (!form.apellido.trim()) return 'El apellido es obligatorio.';
      if (!form.correo.trim()) return 'El correo es obligatorio para personas.';
    }
    if (form.correo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.correo.trim())) return 'Ingresa un correo electrónico válido.';
    }

    // Formato teléfono: +xxxxxxxxxxx (solo dígitos después del +, entre 8 y 15)
    if (form.telefono.trim()) {
      const telRegex = /^\+\d{8,15}$/;
      if (!telRegex.test(form.telefono.trim())) {
        return 'El teléfono debe comenzar con + y contener solo dígitos (ej: +56912345678).';
      }
    }

    // Validación del límite de deuda (obligatorio)
    if (form.limite_deuda === '' || form.limite_deuda === null) {
      return 'El límite de deuda es obligatorio.';
    }
    const limiteNum = Number(form.limite_deuda);
    if (Number.isNaN(limiteNum) || limiteNum < 0) {
      return 'El límite de deuda debe ser un número mayor o igual a 0.';
    }

    // Fecha de vencimiento debe ser posterior al día actual
    if (form.fecha_vencimiento_deuda) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const venc = new Date(form.fecha_vencimiento_deuda + 'T00:00:00');
      if (Number.isNaN(venc.getTime())) {
        return 'La fecha de vencimiento no es válida.';
      }
      if (venc.getTime() <= hoy.getTime()) {
        return 'La fecha de vencimiento debe ser mayor al día actual.';
      }
    }

    // Duplicados (modo demo). En modo Supabase se chequea en handleEnviar.
    if (!USAR_SUPABASE) {
      const rutNorm = form.rut.trim();
      if (registros.find(r => r.rut === rutNorm)) {
        return 'Ya existe un cliente con ese RUT.';
      }
      const correoNorm = form.correo.trim().toLowerCase();
      if (correoNorm && registros.find(r => (r.correo || '').toLowerCase() === correoNorm)) {
        return 'Ya existe un cliente con ese correo.';
      }
    }
    return null;
  };

  const handleEnviar = async () => {
    const error = validar();
    if (error) {
      setMensaje({ texto: error, exito: false });
      return;
    }

    setCargando(true);
    setMensaje({ texto: '', exito: null });

    const datos = {
      tipo,
      rut: form.rut.trim(),
      correo: form.correo.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      limite_deuda: Number(form.limite_deuda),
      deuda_actual: 0, // siempre inicia en 0 para clientes nuevos
      fecha_vencimiento_deuda: form.fecha_vencimiento_deuda || null,
      activo: form.activo,
      ...(tipo === 'empresa'
        ? {
            razon_social: form.razon_social.trim(),
            giro: form.giro.trim(),
            nombre_contacto: form.nombre_contacto.trim(),
            cargo_contacto: form.cargo_contacto.trim() || null,
          }
        : {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
          }),
    };

    try {
      if (USAR_SUPABASE) {
        // Validación reutilizable de duplicados (RUT y correo)
        const dup = await validarClienteDuplicado({
          rut: datos.rut,
          correo: datos.correo,
        });
        if (dup.duplicado) {
          throw new Error(dup.mensaje);
        }

        const { error: sbError } = await supabase.from('clientes').insert([datos]);
        if (sbError) throw new Error(sbError.message);
      } else {
        await new Promise(r => setTimeout(r, 600));
        const nuevos = [...registros, { ...datos, id: Date.now(), created_at: new Date().toISOString() }];
        localStorage.setItem('clientes_demo', JSON.stringify(nuevos));
        setRegistros(nuevos);
      }

      setMensaje({
        texto: `✅ ${tipo === 'empresa' ? 'Empresa' : 'Persona'} registrada correctamente.${!USAR_SUPABASE ? ' (modo demo)' : ''}`,
        exito: true
      });
      setForm({ ...FORM_INICIAL });
    } catch (err) {
      setMensaje({ texto: ` Error: ${err.message}`, exito: false });
    } finally {
      setCargando(false);
    }
  };

  const eliminarDemo = (id) => {
    const nuevos = registros.filter(r => r.id !== id);
    localStorage.setItem('clientes_demo', JSON.stringify(nuevos));
    setRegistros(nuevos);
  };

  return (
    <div className="rc-container">
      <h1>Registro de Clientes</h1>
      <p className="rc-subtitulo">Registra una empresa o una persona natural en el sistema, con control de deuda.</p>

      {!USAR_SUPABASE && (
        <div className="rc-banner-demo">
           Modo demo — los datos se guardan localmente en el navegador, aun no en la base de datos (hasta tener acceso xd).
        </div>
      )}

      <div className="rc-toggle">
        <button className={`rc-toggle-btn ${tipo === 'empresa' ? 'activo' : ''}`} onClick={() => handleTipo('empresa')}>
           Empresa
        </button>
        <button className={`rc-toggle-btn ${tipo === 'persona' ? 'activo' : ''}`} onClick={() => handleTipo('persona')}>
           Persona
        </button>
      </div>

      <div className="rc-form">
        <div className="rc-seccion">
          <h2 className="rc-seccion-titulo">Datos generales</h2>
          <div className="rc-grid">
            <div className="rc-campo">
              <label htmlFor="rut">RUT *</label>
              <input
                type="text"
                id="rut"
                value={form.rut}
                onChange={handleChange}
                placeholder="Ej: 12345678K o 12.345.678-K"
                maxLength={12}
              />
            </div>
            <div className="rc-campo">
              <label htmlFor="telefono">Teléfono</label>
              <input
                type="tel"
                id="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="+56912345678"
                inputMode="tel"
                maxLength={16}
              />
            </div>
            <div className="rc-campo rc-campo-ancho">
              <label htmlFor="direccion">Dirección</label>
              <input type="text" id="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Principal 123, Santiago" />
            </div>
          </div>
        </div>

        {tipo === 'empresa' && (
          <>
            <div className="rc-seccion">
              <h2 className="rc-seccion-titulo">Datos de la empresa</h2>
              <div className="rc-grid">
                <div className="rc-campo rc-campo-ancho">
                  <label htmlFor="razon_social">Razón social *</label>
                  <input type="text" id="razon_social" value={form.razon_social} onChange={handleChange} placeholder="Ej: Pesquera del Sur S.A." />
                </div>
                <div className="rc-campo rc-campo-ancho">
                  <label htmlFor="giro">Giro *</label>
                  <input type="text" id="giro" value={form.giro} onChange={handleChange} placeholder="Ej: Venta de productos del mar" />
                </div>
                <div className="rc-campo rc-campo-ancho">
                  <label htmlFor="correo">Correo empresa</label>
                  <input type="email" id="correo" value={form.correo} onChange={handleChange} placeholder="ventas@empresa.cl" />
                </div>
              </div>
            </div>
            <div className="rc-seccion">
              <h2 className="rc-seccion-titulo">Contacto</h2>
              <div className="rc-grid">
                <div className="rc-campo">
                  <label htmlFor="nombre_contacto">Nombre contacto *</label>
                  <input type="text" id="nombre_contacto" value={form.nombre_contacto} onChange={handleChange} placeholder="Ej: Juan Pérez" />
                </div>
                <div className="rc-campo">
                  <label htmlFor="cargo_contacto">Cargo</label>
                  <input type="text" id="cargo_contacto" value={form.cargo_contacto} onChange={handleChange} placeholder="Ej: Gerente de ventas" />
                </div>
              </div>
            </div>
          </>
        )}

        {tipo === 'persona' && (
          <div className="rc-seccion">
            <h2 className="rc-seccion-titulo">Datos personales</h2>
            <div className="rc-grid">
              <div className="rc-campo">
                <label htmlFor="nombre">Nombre *</label>
                <input type="text" id="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan" />
              </div>
              <div className="rc-campo">
                <label htmlFor="apellido">Apellido *</label>
                <input type="text" id="apellido" value={form.apellido} onChange={handleChange} placeholder="Ej: Pérez" />
              </div>
              <div className="rc-campo rc-campo-ancho">
                <label htmlFor="correo">Correo *</label>
                <input type="email" id="correo" value={form.correo} onChange={handleChange} placeholder="juan.perez@correo.com" />
              </div>
            </div>
          </div>
        )}

        <div className="rc-seccion">
          <h2 className="rc-seccion-titulo">Control de deuda</h2>
          <div className="rc-grid">
            <div className="rc-campo">
              <label htmlFor="limite_deuda">Límite de deuda *</label>
              <input
                type="number"
                id="limite_deuda"
                min="0"
                step="1"
                value={form.limite_deuda}
                onChange={handleChange}
                placeholder="Ej: 500000"
              />
            </div>
            <div className="rc-campo">
              <label htmlFor="fecha_vencimiento_deuda">Fecha vencimiento deuda</label>
              <input
                type="date"
                id="fecha_vencimiento_deuda"
                value={form.fecha_vencimiento_deuda}
                onChange={handleChange}
                min={(() => {
                  const m = new Date();
                  m.setDate(m.getDate() + 1);
                  return m.toISOString().slice(0, 10);
                })()}
              />
            </div>
            <div className="rc-campo rc-campo-ancho">
              <label htmlFor="activo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={handleChange}
                />
                Cliente activo
              </label>
              <small style={{ color: '#666' }}>
                La deuda inicial se registra en 0. Podrá actualizarse desde el módulo de cobranza.
              </small>
            </div>
          </div>
        </div>

        <button className="rc-btn" onClick={handleEnviar} disabled={cargando}>
          {cargando ? 'Guardando...' : 'Registrar'}
        </button>

        {mensaje.texto && (
          <div className={`rc-mensaje ${mensaje.exito ? 'rc-exito' : 'rc-error'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      {!USAR_SUPABASE && registros.length > 0 && (
        <div className="rc-lista-demo">
          <h2>Registros guardados (demo) — {registros.length}</h2>
          {registros.map(r => (
            <div key={r.id} className="rc-item-demo">
              <div className="rc-item-info">
                <span className={`rc-badge ${r.tipo}`}>{r.tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona'}</span>
                <strong>{r.tipo === 'empresa' ? r.razon_social : `${r.nombre} ${r.apellido}`}</strong>
                <span className="rc-item-rut">{r.rut}</span>
                {r.correo && <span className="rc-item-extra">{r.correo}</span>}
                <span className="rc-item-extra">
                  Deuda: ${Number(r.deuda_actual ?? 0).toLocaleString()} / Límite: ${Number(r.limite_deuda ?? 0).toLocaleString()}
                </span>
                {r.fecha_vencimiento_deuda && (
                  <span className="rc-item-extra">Vence: {r.fecha_vencimiento_deuda}</span>
                )}
                <span className="rc-item-extra">{r.activo ? '🟢 Activo' : '⚪ Inactivo'}</span>
              </div>
              <button className="rc-btn-eliminar" onClick={() => eliminarDemo(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RegistroCliente;
