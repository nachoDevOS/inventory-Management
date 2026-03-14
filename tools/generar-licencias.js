/**
 * generar-licencias.js — Generador de claves de licencia por dispositivo
 *
 * Uso:
 *   node tools/generar-licencias.js <deviceCode> <serial> <meses>
 *
 * Ejemplos:
 *   node tools/generar-licencias.js A1B2C3D4E5F6 1 3     → clave serial 1, válida 3 meses
 *   node tools/generar-licencias.js A1B2C3D4E5F6 1 12    → clave serial 1, válida 12 meses (1 año)
 *   node tools/generar-licencias.js A1B2C3D4E5F6 1 6     → clave serial 1, válida 6 meses
 *
 * Formato de clave generada: XXXX-XXXX-SSSS-MM
 *   - XXXX-XXXX : hash del dispositivo + serial + meses
 *   - SSSS      : número de serie en base36
 *   - MM        : meses en base36
 *
 * IMPORTANTE: El SECRET debe ser IDÉNTICO al que está en src/utils/licencia.js
 */

// ─── DEBE SER IGUAL QUE EN src/utils/licencia.js ────────────────────────────
const SECRET = 'SD2025GESTION_INVENTARIO';
// ────────────────────────────────────────────────────────────────────────────

function hash32(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

function generarLicencia(serial, deviceCode, meses) {
  const device = (deviceCode || 'UNKNOWN').toUpperCase();
  const hashStr   = hash32(`${SECRET}:${serial}:${device}:${meses}`)
    .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
  const serialStr = serial.toString(36).toUpperCase().padStart(4, '0');
  const mesesStr  = meses.toString(36).toUpperCase().padStart(2, '0');
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${serialStr}-${mesesStr}`;
}

function validarLicencia(rawKey, deviceCode) {
  const key = rawKey.toUpperCase().replace(/[-\s]/g, '');
  if (key.length !== 14) return false;
  const hashPart   = key.slice(0, 8);
  const serialPart = key.slice(8, 12);
  const mesesPart  = key.slice(12, 14);
  const serial = parseInt(serialPart, 36);
  const meses  = parseInt(mesesPart,  36);
  if (isNaN(serial) || serial <= 0) return false;
  if (isNaN(meses)  || meses  <= 0) return false;
  const device = (deviceCode || 'UNKNOWN').toUpperCase();
  const expectedHash = hash32(`${SECRET}:${serial}:${device}:${meses}`)
    .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
  return hashPart === expectedHash;
}

function calcFechaExpiracion(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

// ─── Lógica de CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('\nUso:');
  console.log('  node tools/generar-licencias.js <deviceCode> <serial> <meses>');
  console.log('\nEjemplos:');
  console.log('  node tools/generar-licencias.js A1B2C3D4E5F6 1 3    → 3 meses');
  console.log('  node tools/generar-licencias.js A1B2C3D4E5F6 1 6    → 6 meses');
  console.log('  node tools/generar-licencias.js A1B2C3D4E5F6 1 12   → 12 meses (1 año)\n');
  process.exit(1);
}

const deviceCode = args[0].toUpperCase();
const serial     = parseInt(args[1]);
const meses      = parseInt(args[2]);

if (isNaN(serial) || serial < 1 || serial > 1679615) {
  console.error('\nError: el serial debe ser un número entre 1 y 1.679.615\n');
  process.exit(1);
}

if (isNaN(meses) || meses < 1 || meses > 1295) {
  console.error('\nError: los meses deben ser un número entre 1 y 1295\n');
  process.exit(1);
}

const clave = generarLicencia(serial, deviceCode, meses);
const ok    = validarLicencia(clave, deviceCode) ? '✓ válida' : '✗ error';
const expira = calcFechaExpiracion(meses);

console.log('\n=================================================');
console.log('  GENERADOR DE LICENCIAS — Solución Digital');
console.log('=================================================');
console.log(`  Dispositivo   : ${deviceCode}`);
console.log(`  Serial        : ${String(serial).padStart(4, '0')}`);
console.log(`  Duración      : ${meses} mes${meses === 1 ? '' : 'es'}`);
console.log(`  Expira aprox. : ${expira}`);
console.log(`  Clave         : ${clave}   [${ok}]`);
console.log('\n  Esta clave SOLO funciona en el dispositivo indicado.');
console.log('  Guarda el registro: serial ↔ cliente ↔ dispositivo ↔ meses.\n');
