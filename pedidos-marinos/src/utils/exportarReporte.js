import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatoCLP, formatoFechaReporte } from './reporteContable';

const TITULO_EMPRESA = 'Pedidos Marinos';

function nombreArchivo(base, extension) {
  const fecha = new Date().toISOString().slice(0, 10);
  return `${base}_${fecha}.${extension}`;
}

function escaparCsv(valor) {
  const str = String(valor ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Descarga el reporte como CSV (compatible con Excel).
 */
export function descargarCsv(reporte) {
  const lineas = [
    ['Reporte Contable', TITULO_EMPRESA],
    ['Periodo', reporte.rango.etiqueta],
    ['Generado', new Date(reporte.generadoEn).toLocaleString('es-CL')],
    [],
    ['Resumen'],
    ['Total vendido', reporte.totalVendido],
    ['Total cobrado', reporte.totalCobrado],
    ['Deudas actuales', reporte.totalDeudas],
    ['Pendiente de cobro (periodo)', reporte.pendienteCobro],
    ['Cantidad de pedidos', reporte.cantidadPedidos],
    [],
    ['Detalle de pedidos'],
    ['ID', 'Fecha', 'Cliente', 'Total', 'Estado', 'Fecha pago'],
  ];

  reporte.filasDetalle.forEach((f) => {
    lineas.push([
      f.id,
      formatoFechaReporte(f.fecha),
      f.cliente,
      f.total,
      f.estado,
      f.fechaPago ? formatoFechaReporte(f.fechaPago) : '',
    ]);
  });

  const contenido = lineas
    .map((fila) => fila.map(escaparCsv).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo('reporte_contable', 'csv');
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Genera PDF profesional con logo textual, totales y detalle.
 */
export function descargarPdf(reporte) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margen = 14;
  let y = margen;

  // Banda de cabecera con identidad "Floema": fondo casi-negro (--color-fg)
  // y subtítulo en lima (--color-lime), como las secciones oscuras de la web.
  doc.setFillColor(36, 31, 33);        // --color-fg #241F21
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(TITULO_EMPRESA, margen, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(233, 231, 120);     // --color-lime #E9E778
  doc.text('Reporte Contable', margen, 21);

  doc.setTextColor(36, 31, 33);        // --color-fg
  y = 36;
  doc.setFontSize(10);
  doc.text(`Periodo: ${reporte.rango.etiqueta}`, margen, y);
  y += 6;
  doc.text(`Generado: ${new Date(reporte.generadoEn).toLocaleString('es-CL')}`, margen, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto']],
    body: [
      ['Total vendido', formatoCLP.format(reporte.totalVendido)],
      ['Total cobrado', formatoCLP.format(reporte.totalCobrado)],
      ['Deudas actuales (clientes)', formatoCLP.format(reporte.totalDeudas)],
      ['Pendiente de cobro (periodo)', formatoCLP.format(reporte.pendienteCobro)],
      ['Pedidos en el periodo', String(reporte.cantidadPedidos)],
      ['Pedidos cobrados', String(reporte.cantidadCobrados)],
    ],
    theme: 'grid',
    // Header en mist con texto oscuro, igual que las tablas de la web.
    headStyles: { fillColor: [235, 231, 223], textColor: [36, 31, 33] },
    styles: { fontSize: 10 },
    margin: { left: margen, right: margen },
  });

  y = doc.lastAutoTable.finalY + 10;

  if (reporte.filasDetalle.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de pedidos', margen, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Fecha', 'Cliente', 'Total', 'Estado']],
      body: reporte.filasDetalle.map((f) => [
        f.id,
        formatoFechaReporte(f.fecha),
        f.cliente,
        formatoCLP.format(f.total),
        f.estado,
      ]),
      theme: 'striped',
      // Mismo header mist/oscuro que la tabla de resumen y las tablas web.
      headStyles: { fillColor: [235, 231, 223], textColor: [36, 31, 33] },
      styles: { fontSize: 9 },
      margin: { left: margen, right: margen },
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(152, 143, 139);   // --color-stone
    doc.text(
      `Página ${i} de ${totalPages} — ${TITULO_EMPRESA}`,
      margen,
      290
    );
  }

  doc.save(nombreArchivo('reporte_contable', 'pdf'));
}
