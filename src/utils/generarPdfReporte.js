/**
 * generarPdfReporte.js — Genera y comparte un reporte de ventas en PDF
 *
 * Incluye: resumen del período, ganancia estimada y tabla de ventas.
 * Ganancia estimada = ingresos - costo_compra prorrateado por unidad vendida.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * @param {object} params
 * @param {string} params.titulo      - Ej: "Reporte de Hoy", "Reporte del Mes"
 * @param {string} params.periodo     - Ej: "12 de marzo de 2026"
 * @param {Array}  params.ventas      - Filas de ventas con cliente_nombre, fecha, total
 * @param {number} params.gananciaEst - Ganancia estimada total (Bs.)
 * @param {string} params.negocio     - Nombre del negocio
 */
export const generarYCompartirReporte = async ({ titulo, periodo, ventas, gananciaEst, negocio }) => {
  const totalIngresos = ventas.reduce((s, v) => s + (v.total || 0), 0);
  const margenEst = totalIngresos > 0 ? (gananciaEst / totalIngresos) * 100 : 0;

  const filas = ventas.map((v, i) => `
    <tr class="${i % 2 === 0 ? 'par' : 'impar'}">
      <td>${v.idventa}</td>
      <td>${v.cliente_nombre || '—'}</td>
      <td>${v.fecha || '—'}</td>
      <td class="der">Bs. ${Number(v.total).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', sans-serif; color:#1E293B; padding:32px; font-size:13px; }

    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2563EB; padding-bottom:20px; margin-bottom:24px; }
    .empresa h1 { font-size:24px; font-weight:800; color:#2563EB; }
    .empresa p { font-size:11px; color:#64748B; margin-top:3px; }
    .doc-info { text-align:right; }
    .doc-titulo { font-size:20px; font-weight:700; color:#1E293B; }
    .doc-periodo { font-size:11px; color:#64748B; margin-top:4px; }

    .stats { display:flex; gap:16px; margin-bottom:24px; }
    .stat { flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:14px; text-align:center; }
    .stat-valor { font-size:22px; font-weight:800; }
    .stat-label { font-size:11px; color:#64748B; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px; }
    .azul { color:#2563EB; }
    .verde { color:#16A34A; }
    .naranja { color:#D97706; }

    table { width:100%; border-collapse:collapse; }
    thead tr { background:#2563EB; }
    thead th { color:#fff; padding:10px 12px; text-align:left; font-size:12px; }
    thead th.der { text-align:right; }
    .par { background:#fff; }
    .impar { background:#F8FAFC; }
    td { padding:8px 12px; border-bottom:1px solid #E2E8F0; font-size:13px; }
    td.der { text-align:right; font-weight:600; }

    .footer { margin-top:32px; border-top:1px solid #E2E8F0; padding-top:14px; text-align:center; }
    .footer p { font-size:10px; color:#94A3B8; }
    .footer a { color:#2563EB; font-weight:600; text-decoration:none; }
  </style>
</head>
<body>

  <div class="header">
    <div class="empresa">
      <h1>${negocio || 'Soluciones Tecnológicas'}</h1>
      <p>Inventory Management</p>
    </div>
    <div class="doc-info">
      <div class="doc-titulo">${titulo}</div>
      <div class="doc-periodo">${periodo}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-valor azul">${ventas.length}</div>
      <div class="stat-label">Ventas</div>
    </div>
    <div class="stat">
      <div class="stat-valor azul">Bs. ${totalIngresos.toFixed(2)}</div>
      <div class="stat-label">Ingresos totales</div>
    </div>
    <div class="stat">
      <div class="stat-valor verde">Bs. ${Number(gananciaEst).toFixed(2)}</div>
      <div class="stat-label">Ganancia estimada</div>
    </div>
    <div class="stat">
      <div class="stat-valor naranja">${margenEst.toFixed(1)}%</div>
      <div class="stat-label">Margen estimado</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Cliente</th>
        <th>Fecha</th>
        <th class="der">Total</th>
      </tr>
    </thead>
    <tbody>
      ${filas.length > 0 ? filas : '<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:20px">Sin ventas en este período</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Reporte generado el ${new Date().toLocaleDateString('es-BO', { year:'numeric', month:'long', day:'numeric' })}</p>
    <p class="dev" style="margin-top:6px;font-size:10px;color:#CBD5E1">
      Desarrollado por <a href="https://www.soluciondigital.dev/">Solución Digital</a> — soluciondigital.dev
    </p>
  </div>

</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: titulo,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
};
