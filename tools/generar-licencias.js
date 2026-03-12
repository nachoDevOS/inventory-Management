/**
 * generar-licencias.js — Generador de claves de licencia
 *
 * Uso:
 *   node tools/generar-licencias.js          → genera 10 claves (seriales 1–10)
 *   node tools/generar-licencias.js 5        → genera 5 claves
 *   node tools/generar-licencias.js 1 50     → genera claves desde serial 1 hasta 50
 *   node tools/generar-licencias.js 51 60    → genera claves serial 51 a 60
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

function generarLicencia(serial) {
  const hashStr = hash32(`${SECRET}:${serial}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, '0')
    .substring(0, 8);
  const serialStr = serial.toString(36).toUpperCase().padStart(4, '0');
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${serialStr}`;
}

function validarLicencia(rawKey) {
  const key = rawKey.toUpperCase().replace(/[-\s]/g, '');
  if (key.length !== 12) return false;
  const hashPart   = key.slice(0, 8);
  const serialPart = key.slice(8, 12);
  const serial = parseInt(serialPart, 36);
  if (isNaN(serial) || serial <= 0) return false;
  const expectedHash = hash32(`${SECRET}:${serial}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, '0')
    .substring(0, 8);
  return hashPart === expectedHash;
}

// ─── Lógica de CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2).map(Number);
let desde = 1;
let hasta = 10;

if (args.length === 1) {
  hasta = args[0];
} else if (args.length === 2) {
  desde = args[0];
  hasta = args[1];
}

console.log('\n=================================================');
console.log('  GENERADOR DE LICENCIAS — Solución Digital');
console.log('=================================================');
console.log(`  Generando seriales del ${desde} al ${hasta}\n`);

for (let i = desde; i <= hasta; i++) {
  const clave = generarLicencia(i);
  const ok = validarLicencia(clave) ? '✓' : '✗';
  console.log(`  Serial ${String(i).padStart(4, '0')}:  ${clave}   [${ok}]`);
}

console.log('\n  GUARDA ESTAS CLAVES DE FORMA SEGURA.');
console.log('  Cada clave es de uso único por cliente.\n');
