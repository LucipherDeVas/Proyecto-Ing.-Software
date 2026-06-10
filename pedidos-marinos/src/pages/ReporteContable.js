import { useState } from 'react';
import { generarReporteContable } from '../services/reportesService';
import { formatoCLP, formatoFechaReporte } from '../utils/reporteContable';
import { descargarCsv, descargarPdf } from '../utils/exportarReporte';
import './css/ReporteContable.css';

const TIPOS_RANGO = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'personalizado', label: 'Personalizado' },
];

function badgeEstadoPedido(estado) {
  switch (estado) {
    case 'pagado': return 'rc-badge rc-badge-ok';
    case 'pendiente': return 'rc-badge rc-badge-warn';
    case 'cancelado': return 'rc-badge rc-badge-danger';
    default: return 'rc-badge';
  }
}

export default function ReporteContable() {
  const [tipoRango, setTipoRango] = useState('mes');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleGenerar = async () => {
    setCargando(true);
    setError('');
    setReporte(null);

    try {
      const data = await generarReporteContable(tipoRango, {
        fechaDesde,
        fechaHasta,
      });
      setReporte(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="rc-container">
      <header className="rc-header">
        <div>
          <h1>Reporte contable</h1>
          <p className="rc-subtitulo">
            Genera un resumen de ventas, cobros y deudas para el periodo seleccionado.
          </p>
        </div>
        <div className="rc-logo">🐟</div>
      </header>

      <section className="rc-panel">
        <h2>Filtros de periodo</h2>
        <div className="rc-filtros">
          {TIPOS_RANGO.map((t) => (
            <label key={t.id} className={`rc-radio ${tipoRango === t.id ? 'activo' : ''}`}>
              <input
                type="radio"
                name="tipoRango"
                value={t.id}
                checked={tipoRango === t.id}
                onChange={() => setTipoRango(t.id)}
              />
              {t.label}
            </label>
          ))}
        </div>

        {tipoRango === 'personalizado' && (
          <div className="rc-fechas-custom">
            <label>
              Desde
              <input
                type="date"
                className="rc-input"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                className="rc-input"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </label>
          </div>
        )}

        <button
          type="button"
          className="rc-btn-generar"
          onClick={handleGenerar}
          disabled={cargando}
        >
          {cargando ? 'Generando...' : 'Generar reporte contable'}
        </button>

        {error && <div className="rc-error">{error}</div>}
      </section>

      {reporte && (
        <>
          <section className="rc-preview" id="reporte-preview">
            <div className="rc-preview-header">
              <div>
                <h2>Vista previa</h2>
                <p className="rc-periodo">Periodo: {reporte.rango.etiqueta}</p>
                <p className="rc-meta">
                  Generado: {new Date(reporte.generadoEn).toLocaleString('es-CL')}
                </p>
              </div>
              <div className="rc-preview-logo">
                <span>🐟</span>
                <strong>Pedidos Marinos</strong>
              </div>
            </div>

            <div className="rc-metricas">
              <article className="rc-metrica">
                <span className="rc-metrica-label">Total vendido</span>
                <strong>{formatoCLP.format(reporte.totalVendido)}</strong>
              </article>
              <article className="rc-metrica">
                <span className="rc-metrica-label">Total cobrado</span>
                <strong>{formatoCLP.format(reporte.totalCobrado)}</strong>
              </article>
              <article className="rc-metrica">
                <span className="rc-metrica-label">Deudas actuales</span>
                <strong>{formatoCLP.format(reporte.totalDeudas)}</strong>
              </article>
              <article className="rc-metrica">
                <span className="rc-metrica-label">Pendiente de cobro</span>
                <strong>{formatoCLP.format(reporte.pendienteCobro)}</strong>
              </article>
            </div>

            <div className="rc-resumen-extra">
              <span>{reporte.cantidadPedidos} pedidos en el periodo</span>
              <span>{reporte.cantidadCobrados} pedidos cobrados</span>
            </div>

            <div className="rc-tabla-wrap">
              <table className="rc-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th className="rc-num">Total</th>
                    <th>Estado</th>
                    <th>Fecha pago</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.filasDetalle.length === 0 && (
                    <tr>
                      <td colSpan="6" className="rc-empty">
                        No hay pedidos en este periodo.
                      </td>
                    </tr>
                  )}
                  {reporte.filasDetalle.map((f) => (
                    <tr key={f.id}>
                      <td>{f.id}</td>
                      <td>{formatoFechaReporte(f.fecha)}</td>
                      <td>{f.cliente}</td>
                      <td className="rc-num">{formatoCLP.format(f.total)}</td>
                      <td>
                        <span className={badgeEstadoPedido(f.estado)}>{f.estado}</span>
                      </td>
                      <td>{f.fechaPago ? formatoFechaReporte(f.fechaPago) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {reporte.filasDetalle.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="rc-num"><strong>Total vendido</strong></td>
                      <td className="rc-num"><strong>{formatoCLP.format(reporte.totalVendido)}</strong></td>
                      <td colSpan="2" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <section className="rc-export">
            <h2>Exportar</h2>
            <div className="rc-export-btns">
              <button type="button" className="rc-btn-export pdf" onClick={() => descargarPdf(reporte)}>
                Descargar PDF
              </button>
              <button type="button" className="rc-btn-export csv" onClick={() => descargarCsv(reporte)}>
                Descargar CSV/Excel
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
