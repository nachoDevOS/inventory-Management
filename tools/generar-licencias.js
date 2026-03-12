/**
 * generar-licencias.js — Generador de claves de licencia por dispositivo
 *
 * Uso:
 *   node tools/generar-licencias.js <deviceCode>           → genera 1 clave (serial 1) para el dispositivo
 *   node tools/generar-licencias.js <deviceCode> <serial>  → genera clave para serial específico
 *
 * Ejemplo:
 *   node tools/generar-licencias.js A1B2C3D4E5F6 1
 *
 * El cliente debe enviarte su "Código de dispositivo" que aparece en la pantalla de activación.
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

function generarLicencia(serial, deviceCode) {
  const device = (deviceCode || 'UNKNOWN').toUpperCase();
  const hashStr = hash32(`${SECRET}:${serial}:${device}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, '0')
    .substring(0, 8);
  const serialStr = serial.toString(36).toUpperCase().padStart(4, '0');
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${serialStr}`;
}

function validarLicencia(rawKey, deviceCode) {
  const key = rawKey.toUpperCase().replace(/[-\s]/g, '');
  if (key.length !== 12) return false;
  const hashPart   = key.slice(0, 8);
  const serialPart = key.slice(8, 12);
  const serial = parseInt(serialPart, 36);
  if (isNaN(serial) || serial <= 0) return false;
  const device = (deviceCode || 'UNKNOWN').toUpperCase();
  const expectedHash = hash32(`${SECRET}:${serial}:${device}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, '0')
    .substring(0, 8);
  return hashPart === expectedHash;
}

// ─── Lógica de CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\nUso:');
  console.log('  node tools/generar-licencias.js <deviceCode>');
  console.log('  node tools/generar-licencias.js <deviceCode> <serial>');
  console.log('\nEjemplo:');
  console.log('  node tools/generar-licencias.js A1B2C3D4E5F6');
  console.log('  node tools/generar-licencias.js A1B2C3D4E5F6 42\n');
  process.exit(1);
}

const deviceCode = args[0].toUpperCase();
const serial = args[1] ? parseInt(args[1]) : 1;

if (isNaN(serial) || serial < 1 || serial > 1679615) {
  console.error('\nError: el serial debe ser un número entre 1 y 1.679.615\n');
  process.exit(1);
}

const clave = generarLicencia(serial, deviceCode);
const ok = validarLicencia(clave, deviceCode) ? '✓' : '✗';

console.log('\n=================================================');
console.log('  GENERADOR DE LICENCIAS — Solución Digital');
console.log('=================================================');
console.log(`  Dispositivo : ${deviceCode}`);
console.log(`  Serial      : ${String(serial).padStart(4, '0')}`);
console.log(`  Clave       : ${clave}   [${ok}]`);
console.log('\n  Esta clave SOLO funciona en el dispositivo indicado.');
console.log('  Guarda el registro de serial ↔ cliente ↔ dispositivo.\n');
