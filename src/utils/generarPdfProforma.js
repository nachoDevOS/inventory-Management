import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generarYCompartirPDF = async ({ proforma, cliente, items }) => {
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const totalBruto = items.reduce((s, i) => s + i.cantidad * i.precio_cotizacion, 0);
  const totalDescuento = totalBruto - total;
  const hayDescuentos = totalDescuento > 0.001;
  const fecha = new Date().toLocaleDateString('es-BO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const filasItems = items.map((item, idx) => `
    <tr class="${idx % 2 === 0 ? 'fila-par' : 'fila-impar'}">
      <td>${item.articulo_nombre}</td>
      <td class="centro">${item.cantidad}</td>
      <td class="derecha">Bs. ${Number(item.precio_cotizacion).toFixed(2)}</td>
      <td class="centro">
        ${item.descuento > 0
          ? `<span class="desc-badge">${Number(item.descuento).toFixed(0)}%</span>`
          : '—'}
      </td>
      <td class="derecha total-col">Bs. ${Number(item.subtotal).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1E293B; background: #fff; padding: 32px; font-size: 13px; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #2563EB; }
    .empresa h1 { font-size: 26px; font-weight: 800; color: #2563EB; letter-spacing: -0.5px; }
    .empresa p { font-size: 11px; color: #64748B; margin-top: 3px; }
    .doc-info { text-align: right; }
    .doc-numero { font-size: 22px; font-weight: 700; color: #1E293B; }
    .doc-numero span { color: #2563EB; }
    .doc-fecha { font-size: 11px; color: #64748B; margin-top: 4px; }
    .estado-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .estado-pendiente { background: #FEF3C7; color: #D97706; }
    .estado-aprobada { background: #DCFCE7; color: #16A34A; }
    .estado-convertida { background: #DBEAFE; color: #2563EB; }
    .estado-rechazada { background: #FEE2E2; color: #DC2626; }

    /* CLIENTE */
    .seccion-cliente { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .seccion-cliente h3 { font-size: 11px; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px; margin-bottom: 8px; }
    .cliente-nombre { font-size: 17px; font-weight: 700; color: #1E293B; }
    .cliente-datos { display: flex; gap: 24px; margin-top: 6px; flex-wrap: wrap; }
    .cliente-datos span { font-size: 12px; color: #475569; }
    .cliente-datos span strong { color: #1E293B; }

    /* TABLA */
    .seccion-titulo { font-size: 12px; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    thead tr { background: #2563EB; }
    thead th { color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
    thead th.centro { text-align: center; }
    thead th.derecha { text-align: right; }
    .fila-par { background: #fff; }
    .fila-impar { background: #F8FAFC; }
    td { padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
    td.centro { text-align: center; }
    td.derecha { text-align: right; }
    td.total-col { font-weight: 600; color: #1E293B; }
    .desc-badge { background: #FEE2E2; color: #DC2626; font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 10px; }

    /* TOTAL */
    .total-section { display: flex; justify-content: flex-end; margin-top: 0; border-top: 2px solid #E2E8F0; }
    .total-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 0 0 8px 8px; padding: 12px 20px; min-width: 240px; text-align: right; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .total-row-label { font-size: 12px; color: #64748B; }
    .total-row-valor { font-size: 12px; color: #64748B; }
    .total-row-danger { color: #DC2626; font-weight: 600; }
    .total-separador { border-top: 1px solid #BFDBFE; margin: 6px 0; }
    .total-label { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
    .total-valor { font-size: 24px; font-weight: 800; color: #2563EB; margin-top: 2px; }

    /* DETALLE */
    .detalle-box { margin-top: 20px; padding: 12px 14px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; }
    .detalle-box p { font-size: 12px; color: #92400E; }
    .detalle-box span { font-weight: 600; }

    /* FOOTER */
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #E2E8F0; text-align: center; }
    .footer p { font-size: 10px; color: #94A3B8; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
    .footer .dev { margin-top: 6px; font-size: 10px; color: #CBD5E1; }
  </style>
</head>
<body>

  <div class="header">
    <div class="empresa">
      <h1>Soluciones Tecnológicas</h1>
      <p>Inventory Management</p>
    </div>
    <div class="doc-info">
      <div class="doc-numero">PROFORMA <span>#${proforma.idproforma}</span></div>
      <div class="doc-fecha">Emitida el ${fecha}</div>
      <div class="estado-badge estado-${proforma.estado}">${proforma.estado}</div>
    </div>
  </div>

  <div class="seccion-cliente">
    <h3>Cliente</h3>
    <div class="cliente-nombre">${cliente.nombre}</div>
    <div class="cliente-datos">
      ${cliente.carnet_identidad ? `<span><strong>CI:</strong> ${cliente.carnet_identidad}</span>` : ''}
      ${cliente.celular ? `<span><strong>Cel:</strong> ${cliente.celular}</span>` : ''}
      ${cliente.correo ? `<span><strong>Email:</strong> ${cliente.correo}</span>` : ''}
      ${cliente.contacto_referencia ? `<span><strong>Ref:</strong> ${cliente.contacto_referencia}</span>` : ''}
    </div>
  </div>

  <p class="seccion-titulo">Detalle de artículos</p>
  <table>
    <thead>
      <tr>
        <th>Artículo</th>
        <th class="centro">Cant.</th>
        <th class="derecha">Precio Unit.</th>
        <th class="centro">Descuento</th>
        <th class="derecha">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${filasItems}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-box">
      ${hayDescuentos ? `
        <div class="total-row">
          <span class="total-row-label">Subtotal bruto:</span>
          <span class="total-row-valor">Bs. ${totalBruto.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-row-label total-row-danger">Descuentos:</span>
          <span class="total-row-valor total-row-danger">- Bs. ${totalDescuento.toFixed(2)}</span>
        </div>
        <div class="total-separador"></div>
      ` : ''}
      <div class="total-label">Total Proforma</div>
      <div class="total-valor">Bs. ${total.toFixed(2)}</div>
    </div>
  </div>

  ${proforma.detalle ? `
  <div class="detalle-box">
    <p><span>Observaciones:</span> ${proforma.detalle}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Este documento es una proforma y no constituye una factura oficial.</p>
    <div class="dev">
      Desarrollado por <a href="https://www.soluciondigital.dev/">Solución Digital</a> — soluciondigital.dev
    </div>
  </div>

</body>
</html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const puedeCompartir = await Sharing.isAvailableAsync();
  if (puedeCompartir) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Proforma #${proforma.idproforma}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
};
