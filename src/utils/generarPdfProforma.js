import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ── Datos comunes ────────────────────────────────────────────────────────────
const calcDatos = ({ items, servicios }) => {
  const totalItems = items.reduce((s, i) => s + i.subtotal, 0);
  const totalServ  = servicios.reduce((s, sv) => s + sv.subtotal, 0);
  const total      = totalItems + totalServ;
  const brutoItems = items.reduce((s, i) => s + i.cantidad * i.precio_cotizacion, 0);
  const brutoServ  = servicios.reduce((s, sv) => s + sv.cantidad * sv.precio, 0);
  const totalBruto = brutoItems + brutoServ;
  const descuento  = totalBruto - total;
  return { total, totalBruto, descuento, hayDescuentos: descuento > 0.001 };
};

const filas = (items, servicios) => [
  ...items.map((item, idx) => ({ ...item, nombre: item.articulo_nombre, precio: item.precio_cotizacion, idx })),
  ...servicios.map((sv, idx) => ({ ...sv, idx: items.length + idx })),
];

const fechaHoy = () => new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });

// ── PLANTILLA 1: Clásica (azul) ──────────────────────────────────────────────
const plantillaClasica = (data) => {
  const { proforma, cliente, items, servicios, negocio } = data;
  const { total, totalBruto, descuento, hayDescuentos } = calcDatos({ items, servicios });
  const rows = filas(items, servicios);
  const n = negocio;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1E293B;background:#fff;padding:32px;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #2563EB}
    .empresa h1{font-size:26px;font-weight:800;color:#2563EB}
    .empresa p{font-size:11px;color:#64748B;margin-top:3px}
    .doc-info{text-align:right}
    .doc-numero{font-size:22px;font-weight:700;color:#1E293B}
    .doc-numero span{color:#2563EB}
    .doc-fecha{font-size:11px;color:#64748B;margin-top:4px}
    .seccion-cliente{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px 18px;margin-bottom:24px}
    .seccion-cliente h3{font-size:11px;text-transform:uppercase;color:#64748B;letter-spacing:0.5px;margin-bottom:8px}
    .cliente-nombre{font-size:17px;font-weight:700;color:#1E293B}
    .cliente-datos{display:flex;gap:24px;margin-top:6px;flex-wrap:wrap}
    .cliente-datos span{font-size:12px;color:#475569}
    .cliente-datos span strong{color:#1E293B}
    .seccion-titulo{font-size:12px;text-transform:uppercase;color:#64748B;letter-spacing:0.5px;margin-bottom:8px;font-weight:600}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#2563EB}
    thead th{color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600}
    th.c{text-align:center} th.r{text-align:right}
    .fp{background:#fff} .fi{background:#F8FAFC}
    td{padding:9px 12px;border-bottom:1px solid #E2E8F0;font-size:13px}
    td.c{text-align:center} td.r{text-align:right}
    td.bold{font-weight:600;color:#1E293B}
    .db{background:#FEE2E2;color:#DC2626;font-weight:700;font-size:11px;padding:2px 7px;border-radius:10px}
    .total-section{display:flex;justify-content:flex-end;border-top:2px solid #E2E8F0}
    .total-box{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:0 0 8px 8px;padding:12px 20px;min-width:240px;text-align:right}
    .tr{display:flex;justify-content:space-between;margin-bottom:4px}
    .tl{font-size:12px;color:#64748B} .tv{font-size:12px;color:#64748B}
    .td{color:#DC2626;font-weight:600}
    .ts{border-top:1px solid #BFDBFE;margin:6px 0}
    .tlbl{font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px}
    .tval{font-size:24px;font-weight:800;color:#2563EB;margin-top:2px}
    .obs{margin-top:20px;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px}
    .obs p{font-size:12px;color:#92400E}
    .footer{margin-top:36px;padding-top:16px;border-top:1px solid #E2E8F0;text-align:center}
    .footer p{font-size:10px;color:#94A3B8}
    .footer .dev{margin-top:6px;font-size:10px;color:#CBD5E1}
  </style></head><body>
  <div class="header">
    <div class="empresa">
      <h1>${n.nombre_negocio||'Mi Empresa'}</h1>
      ${n.nit?`<p>NIT: ${n.nit}</p>`:''}
      ${n.direccion?`<p>📍 ${n.direccion}</p>`:''}
      ${n.telefono?`<p>📞 ${n.telefono}</p>`:''}
    </div>
    <div class="doc-info">
      <div class="doc-numero">PROFORMA <span>#${proforma.idproforma}</span></div>
      <div class="doc-fecha">Emitida el ${fechaHoy()}</div>
    </div>
  </div>
  <div class="seccion-cliente">
    <h3>Cliente</h3>
    <div class="cliente-nombre">${cliente.nombre}</div>
    <div class="cliente-datos">
      ${cliente.carnet_identidad?`<span><strong>CI:</strong> ${cliente.carnet_identidad}</span>`:''}
      ${cliente.celular?`<span><strong>Cel:</strong> ${cliente.celular}</span>`:''}
      ${cliente.correo?`<span><strong>Email:</strong> ${cliente.correo}</span>`:''}
    </div>
  </div>
  <p class="seccion-titulo">Detalle</p>
  <table>
    <thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">Precio Unit.</th><th class="c">Desc.</th><th class="r">Subtotal</th></tr></thead>
    <tbody>
      ${rows.map(r=>`<tr class="${r.idx%2===0?'fp':'fi'}"><td>${r.nombre}</td><td class="c">${r.cantidad}</td><td class="r">Bs. ${Number(r.precio).toFixed(2)}</td><td class="c">${r.descuento>0?`<span class="db">${Number(r.descuento).toFixed(0)}%</span>`:'—'}</td><td class="r bold">Bs. ${Number(r.subtotal).toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="total-section"><div class="total-box">
    ${hayDescuentos?`<div class="tr"><span class="tl">Subtotal bruto:</span><span class="tv">Bs. ${totalBruto.toFixed(2)}</span></div><div class="tr"><span class="tl td">Descuentos:</span><span class="tv td">- Bs. ${descuento.toFixed(2)}</span></div><div class="ts"></div>`:''}
    <div class="tlbl">Total Proforma</div><div class="tval">Bs. ${total.toFixed(2)}</div>
  </div></div>
  ${proforma.detalle?`<div class="obs"><p><strong>Observaciones:</strong> ${proforma.detalle}</p></div>`:''}
  <div class="footer"><p>Este documento es una proforma y no constituye una factura oficial.</p><div class="dev">Desarrollado por Solución Digital — soluciondigital.dev</div></div>
  </body></html>`;
};

// ── PLANTILLA 2: Oscura (dark + dorado) ─────────────────────────────────────
const plantillaOscura = (data) => {
  const { proforma, cliente, items, servicios, negocio } = data;
  const { total, totalBruto, descuento, hayDescuentos } = calcDatos({ items, servicios });
  const rows = filas(items, servicios);
  const n = negocio;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#E2E8F0;background:#0F172A;padding:32px;font-size:13px}
    .header{background:linear-gradient(135deg,#1E293B 0%,#0F172A 100%);border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
    .empresa h1{font-size:24px;font-weight:900;color:#F59E0B;letter-spacing:-0.5px}
    .empresa p{font-size:11px;color:#94A3B8;margin-top:3px}
    .doc-badge{background:#F59E0B;color:#0F172A;font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;text-transform:uppercase;margin-bottom:6px;display:inline-block}
    .doc-numero{font-size:20px;font-weight:700;color:#F1F5F9}
    .doc-numero span{color:#F59E0B}
    .doc-fecha{font-size:11px;color:#64748B;margin-top:4px}
    .cliente-box{background:#1E293B;border:1px solid #334155;border-left:4px solid #F59E0B;border-radius:8px;padding:14px 18px;margin-bottom:24px}
    .cliente-label{font-size:10px;text-transform:uppercase;color:#64748B;letter-spacing:1px;margin-bottom:6px}
    .cliente-nombre{font-size:18px;font-weight:700;color:#F1F5F9}
    .cliente-datos{display:flex;gap:20px;margin-top:6px;flex-wrap:wrap}
    .cliente-datos span{font-size:12px;color:#94A3B8}
    .cliente-datos strong{color:#CBD5E1}
    .seccion-titulo{font-size:11px;text-transform:uppercase;color:#64748B;letter-spacing:1px;margin-bottom:8px;font-weight:600}
    table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden}
    thead tr{background:#F59E0B}
    thead th{color:#0F172A;padding:10px 12px;text-align:left;font-size:12px;font-weight:700}
    th.c{text-align:center} th.r{text-align:right}
    .fp{background:#1E293B} .fi{background:#162032}
    td{padding:9px 12px;border-bottom:1px solid #334155;font-size:13px;color:#CBD5E1}
    td.c{text-align:center} td.r{text-align:right}
    td.bold{font-weight:600;color:#F1F5F9}
    .db{background:#78350F;color:#FCD34D;font-weight:700;font-size:11px;padding:2px 7px;border-radius:10px}
    .total-section{display:flex;justify-content:flex-end;margin-top:16px}
    .total-box{background:#1E293B;border:1px solid #F59E0B;border-radius:10px;padding:16px 20px;min-width:240px;text-align:right}
    .tr{display:flex;justify-content:space-between;margin-bottom:4px}
    .tl{font-size:12px;color:#64748B} .tv{font-size:12px;color:#64748B}
    .td{color:#FCA5A5;font-weight:600}
    .ts{border-top:1px solid #334155;margin:6px 0}
    .tlbl{font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px}
    .tval{font-size:26px;font-weight:900;color:#F59E0B;margin-top:4px}
    .obs{margin-top:20px;padding:12px 14px;background:#1C1A14;border:1px solid #78350F;border-radius:8px}
    .obs p{font-size:12px;color:#D97706}
    .footer{margin-top:36px;padding-top:16px;border-top:1px solid #334155;text-align:center}
    .footer p{font-size:10px;color:#475569}
    .footer .dev{margin-top:6px;font-size:10px;color:#334155}
  </style></head><body>
  <div class="header">
    <div class="empresa">
      <h1>${n.nombre_negocio||'Mi Empresa'}</h1>
      ${n.nit?`<p>NIT: ${n.nit}</p>`:''}
      ${n.direccion?`<p>📍 ${n.direccion}</p>`:''}
      ${n.telefono?`<p>📞 ${n.telefono}</p>`:''}
    </div>
    <div style="text-align:right">
      <div class="doc-badge">Proforma</div>
      <div class="doc-numero">#${proforma.idproforma}</div>
      <div class="doc-fecha">${fechaHoy()}</div>
    </div>
  </div>
  <div class="cliente-box">
    <div class="cliente-label">Para</div>
    <div class="cliente-nombre">${cliente.nombre}</div>
    <div class="cliente-datos">
      ${cliente.carnet_identidad?`<span><strong>CI:</strong> ${cliente.carnet_identidad}</span>`:''}
      ${cliente.celular?`<span><strong>Cel:</strong> ${cliente.celular}</span>`:''}
      ${cliente.correo?`<span><strong>Email:</strong> ${cliente.correo}</span>`:''}
    </div>
  </div>
  <p class="seccion-titulo">Detalle del pedido</p>
  <table>
    <thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">Precio Unit.</th><th class="c">Desc.</th><th class="r">Subtotal</th></tr></thead>
    <tbody>
      ${rows.map(r=>`<tr class="${r.idx%2===0?'fp':'fi'}"><td>${r.nombre}</td><td class="c">${r.cantidad}</td><td class="r">Bs. ${Number(r.precio).toFixed(2)}</td><td class="c">${r.descuento>0?`<span class="db">${Number(r.descuento).toFixed(0)}%</span>`:'—'}</td><td class="r bold">Bs. ${Number(r.subtotal).toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="total-section"><div class="total-box">
    ${hayDescuentos?`<div class="tr"><span class="tl">Subtotal bruto:</span><span class="tv">Bs. ${totalBruto.toFixed(2)}</span></div><div class="tr"><span class="tl td">Descuentos:</span><span class="tv td">- Bs. ${descuento.toFixed(2)}</span></div><div class="ts"></div>`:''}
    <div class="tlbl">Total</div><div class="tval">Bs. ${total.toFixed(2)}</div>
  </div></div>
  ${proforma.detalle?`<div class="obs"><p><strong>Observaciones:</strong> ${proforma.detalle}</p></div>`:''}
  <div class="footer"><p>Este documento es una proforma y no constituye una factura oficial.</p><div class="dev">Desarrollado por Solución Digital — soluciondigital.dev</div></div>
  </body></html>`;
};

// ── PLANTILLA 3: Minimalista ─────────────────────────────────────────────────
const plantillaMinimalista = (data) => {
  const { proforma, cliente, items, servicios, negocio } = data;
  const { total, totalBruto, descuento, hayDescuentos } = calcDatos({ items, servicios });
  const rows = filas(items, servicios);
  const n = negocio;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;background:#fff;padding:40px;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .empresa h1{font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:1px;text-transform:uppercase}
    .empresa p{font-size:11px;color:#666;margin-top:3px}
    .doc-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:4px}
    .doc-numero{font-size:28px;font-weight:700;color:#1a1a1a}
    .doc-fecha{font-size:11px;color:#999;margin-top:4px}
    .linea{border:none;border-top:2px solid #1a1a1a;margin:0 0 24px 0}
    .linea-thin{border:none;border-top:1px solid #ddd;margin:0 0 24px 0}
    .two-col{display:flex;justify-content:space-between;margin-bottom:28px}
    .col h4{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:6px}
    .col p{font-size:13px;color:#1a1a1a}
    .col .name{font-size:16px;font-weight:700;margin-bottom:4px}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #1a1a1a}
    thead th{color:#1a1a1a;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
    th.c{text-align:center} th.r{text-align:right}
    td{padding:10px 10px;border-bottom:1px solid #eee;font-size:13px;color:#333}
    td.c{text-align:center} td.r{text-align:right}
    td.bold{font-weight:700;color:#1a1a1a}
    .db{background:#f5f5f5;color:#666;font-size:11px;padding:2px 6px;border-radius:3px}
    .total-section{display:flex;justify-content:flex-end;margin-top:20px}
    .total-box{min-width:220px;text-align:right}
    .tr{display:flex;justify-content:space-between;margin-bottom:6px;padding:4px 0}
    .tl{font-size:12px;color:#666} .tv{font-size:12px;color:#666}
    .td{color:#999;text-decoration:line-through}
    .ts{border-top:2px solid #1a1a1a;margin:8px 0;padding-top:8px}
    .tlbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999}
    .tval{font-size:28px;font-weight:700;color:#1a1a1a}
    .obs{margin-top:24px;padding:14px;border:1px solid #ddd;border-radius:4px}
    .obs p{font-size:12px;color:#555;line-height:1.6}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center}
    .footer p{font-size:10px;color:#999}
    .footer .dev{font-size:10px;color:#ccc}
  </style></head><body>
  <div class="header">
    <div class="empresa">
      <h1>${n.nombre_negocio||'Mi Empresa'}</h1>
      ${n.nit?`<p>NIT: ${n.nit}</p>`:''}
      ${n.direccion?`<p>${n.direccion}</p>`:''}
      ${n.telefono?`<p>${n.telefono}</p>`:''}
    </div>
    <div style="text-align:right">
      <div class="doc-label">Proforma</div>
      <div class="doc-numero">#${proforma.idproforma}</div>
      <div class="doc-fecha">${fechaHoy()}</div>
    </div>
  </div>
  <hr class="linea"/>
  <div class="two-col">
    <div class="col">
      <h4>Cliente</h4>
      <div class="name">${cliente.nombre}</div>
      ${cliente.carnet_identidad?`<p>CI: ${cliente.carnet_identidad}</p>`:''}
      ${cliente.celular?`<p>${cliente.celular}</p>`:''}
      ${cliente.correo?`<p>${cliente.correo}</p>`:''}
    </div>
    <div class="col" style="text-align:right">
      <h4>Fecha</h4>
      <p>${fechaHoy()}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">Precio Unit.</th><th class="c">Desc.</th><th class="r">Subtotal</th></tr></thead>
    <tbody>
      ${rows.map(r=>`<tr><td>${r.nombre}</td><td class="c">${r.cantidad}</td><td class="r">Bs. ${Number(r.precio).toFixed(2)}</td><td class="c">${r.descuento>0?`<span class="db">${Number(r.descuento).toFixed(0)}%</span>`:'—'}</td><td class="r bold">Bs. ${Number(r.subtotal).toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="total-section"><div class="total-box">
    ${hayDescuentos?`<div class="tr"><span class="tl">Subtotal bruto:</span><span class="tv">Bs. ${totalBruto.toFixed(2)}</span></div><div class="tr"><span class="tl td">Descuentos: - Bs. ${descuento.toFixed(2)}</span></div>`:''}
    <div class="ts">
      <div class="tr"><span class="tlbl">Total Proforma</span></div>
      <div class="tval">Bs. ${total.toFixed(2)}</div>
    </div>
  </div></div>
  ${proforma.detalle?`<div class="obs"><p><strong>Observaciones:</strong> ${proforma.detalle}</p></div>`:''}
  <div class="footer"><p>Documento no constituye factura oficial.</p><div class="dev">Solución Digital — soluciondigital.dev</div></div>
  </body></html>`;
};

// ── PLANTILLA 4: Empresarial (verde) ────────────────────────────────────────
const plantillaEmpresarial = (data) => {
  const { proforma, cliente, items, servicios, negocio } = data;
  const { total, totalBruto, descuento, hayDescuentos } = calcDatos({ items, servicios });
  const rows = filas(items, servicios);
  const n = negocio;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1E293B;background:#fff;font-size:13px}
    .banner{background:linear-gradient(135deg,#065F46 0%,#047857 100%);padding:28px 32px;display:flex;justify-content:space-between;align-items:center}
    .empresa h1{font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.3px}
    .empresa p{font-size:11px;color:#A7F3D0;margin-top:3px}
    .doc-num-box{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:10px;padding:12px 20px;text-align:center}
    .doc-num-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#A7F3D0;margin-bottom:4px}
    .doc-num{font-size:26px;font-weight:900;color:#fff}
    .doc-fecha-box{font-size:11px;color:#A7F3D0;margin-top:4px;text-align:center}
    .body{padding:24px 32px}
    .cliente-row{display:flex;gap:16px;margin-bottom:24px}
    .cliente-card{flex:1;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px 16px}
    .cliente-card h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#059669;margin-bottom:6px}
    .cliente-nombre{font-size:16px;font-weight:700;color:#1E293B}
    .cliente-dato{font-size:12px;color:#475569;margin-top:3px}
    .info-card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px 16px;min-width:140px}
    .info-card h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:6px}
    .info-val{font-size:13px;color:#1E293B;font-weight:600}
    .seccion-titulo{font-size:11px;text-transform:uppercase;color:#059669;letter-spacing:1px;margin-bottom:8px;font-weight:700}
    table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #D1FAE5}
    thead tr{background:#059669}
    thead th{color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600}
    th.c{text-align:center} th.r{text-align:right}
    .fp{background:#fff} .fi{background:#F0FDF4}
    td{padding:9px 12px;border-bottom:1px solid #D1FAE5;font-size:13px}
    td.c{text-align:center} td.r{text-align:right}
    td.bold{font-weight:600;color:#1E293B}
    .db{background:#FEE2E2;color:#DC2626;font-weight:700;font-size:11px;padding:2px 7px;border-radius:10px}
    .total-section{display:flex;justify-content:flex-end;margin-top:16px}
    .total-box{background:#F0FDF4;border:2px solid #059669;border-radius:10px;padding:16px 20px;min-width:240px;text-align:right}
    .tr{display:flex;justify-content:space-between;margin-bottom:4px}
    .tl{font-size:12px;color:#64748B} .tv{font-size:12px;color:#64748B}
    .td{color:#DC2626;font-weight:600}
    .ts{border-top:2px solid #059669;margin:8px 0}
    .tlbl{font-size:11px;color:#059669;text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
    .tval{font-size:28px;font-weight:900;color:#065F46;margin-top:4px}
    .obs{margin-top:20px;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px}
    .obs p{font-size:12px;color:#92400E}
    .footer{background:#F0FDF4;border-top:2px solid #D1FAE5;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;margin-top:24px}
    .footer p{font-size:10px;color:#64748B}
    .footer .dev{font-size:10px;color:#A7F3D0}
  </style></head><body>
  <div class="banner">
    <div class="empresa">
      <h1>${n.nombre_negocio||'Mi Empresa'}</h1>
      ${n.nit?`<p>NIT: ${n.nit}</p>`:''}
      ${n.direccion?`<p>📍 ${n.direccion}</p>`:''}
      ${n.telefono?`<p>📞 ${n.telefono}</p>`:''}
    </div>
    <div class="doc-num-box">
      <div class="doc-num-label">Proforma</div>
      <div class="doc-num">#${proforma.idproforma}</div>
      <div class="doc-fecha-box">${fechaHoy()}</div>
    </div>
  </div>
  <div class="body">
    <div class="cliente-row">
      <div class="cliente-card">
        <h4>Cliente</h4>
        <div class="cliente-nombre">${cliente.nombre}</div>
        ${cliente.carnet_identidad?`<div class="cliente-dato">CI: ${cliente.carnet_identidad}</div>`:''}
        ${cliente.celular?`<div class="cliente-dato">📞 ${cliente.celular}</div>`:''}
        ${cliente.correo?`<div class="cliente-dato">✉️ ${cliente.correo}</div>`:''}
      </div>
      <div class="info-card">
        <h4>Nro. Items</h4>
        <div class="info-val">${rows.length}</div>
      </div>
    </div>
    <p class="seccion-titulo">Detalle del pedido</p>
    <table>
      <thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">Precio Unit.</th><th class="c">Desc.</th><th class="r">Subtotal</th></tr></thead>
      <tbody>
        ${rows.map(r=>`<tr class="${r.idx%2===0?'fp':'fi'}"><td>${r.nombre}</td><td class="c">${r.cantidad}</td><td class="r">Bs. ${Number(r.precio).toFixed(2)}</td><td class="c">${r.descuento>0?`<span class="db">${Number(r.descuento).toFixed(0)}%</span>`:'—'}</td><td class="r bold">Bs. ${Number(r.subtotal).toFixed(2)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="total-section"><div class="total-box">
      ${hayDescuentos?`<div class="tr"><span class="tl">Subtotal bruto:</span><span class="tv">Bs. ${totalBruto.toFixed(2)}</span></div><div class="tr"><span class="tl td">Descuentos:</span><span class="tv td">- Bs. ${descuento.toFixed(2)}</span></div><div class="ts"></div>`:'<div class="ts"></div>'}
      <div class="tlbl">Total Proforma</div><div class="tval">Bs. ${total.toFixed(2)}</div>
    </div></div>
    ${proforma.detalle?`<div class="obs"><p><strong>Observaciones:</strong> ${proforma.detalle}</p></div>`:''}
  </div>
  <div class="footer"><p>Este documento es una proforma y no constituye una factura oficial.</p><div class="dev">Solución Digital — soluciondigital.dev</div></div>
  </body></html>`;
};

// ── Plantillas disponibles ───────────────────────────────────────────────────
export const PLANTILLAS_PDF = [
  { id: 'clasica',      nombre: 'Clásica',      descripcion: 'Encabezado azul, estilo corporativo', color: '#2563EB', fn: plantillaClasica },
  { id: 'oscura',       nombre: 'Oscura',        descripcion: 'Fondo oscuro con detalles dorados',   color: '#F59E0B', fn: plantillaOscura },
  { id: 'minimalista',  nombre: 'Minimalista',   descripcion: 'Limpia, tipografía serif elegante',   color: '#1a1a1a', fn: plantillaMinimalista },
  { id: 'empresarial',  nombre: 'Empresarial',   descripcion: 'Banner verde, diseño moderno',        color: '#059669', fn: plantillaEmpresarial },
];

// ── Exportar PDF ─────────────────────────────────────────────────────────────
export const generarYCompartirPDF = async ({ proforma, cliente, items, servicios = [], negocio = {}, plantillaId = 'clasica' }) => {
  const plantilla = PLANTILLAS_PDF.find(p => p.id === plantillaId) || PLANTILLAS_PDF[0];
  const html = plantilla.fn({ proforma, cliente, items, servicios, negocio });

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
