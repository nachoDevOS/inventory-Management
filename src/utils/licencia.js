/**
 * licencia.js — Sistema de activación por clave
 *
 * Formato de clave: XXXX-XXXX-XXXX (12 chars alfanuméricos en 3 grupos de 4)
 * Ejemplo: A3F2-9ZKB-001T
 *
 * Algoritmo:
 *   - Chars 1–8: hash(SECRET + serial) en base36, 8 chars
 *   - Chars 9–12: número de serie en base36, 4 chars
 *
 * IMPORTANTE: Cambia SECRET por tu propia cadena secreta antes de distribuir la app.
 * Nunca compartas SECRET con nadie.
 */

// ─── CAMBIA ESTO ANTES DE COMPILAR TU APK ───────────────────────────────────
const SECRET = 'SD2025GESTION_INVENTARIO';
// ────────────────────────────────────────────────────────────────────────────

function hash32(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  return h >>> 0; // unsigned 32-bit integer
}

/**
 * Valida si una clave de licencia es correcta.
 * @param {string} rawKey  Clave con o sin guiones, mayúsculas o minúsculas
 * @returns {boolean}
 */
export function validarLicencia(rawKey) {
  const key = (rawKey || '').toUpperCase().replace(/[-\s]/g, '');
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

/**
 * Genera una clave de licencia para un número de serie dado.
 * Úsalo solo en el script generador (tools/generar-licencias.js), NUNCA en la app.
 * @param {number} serial  Número entero entre 1 y 1.679.615
 * @returns {string}  Clave con formato XXXX-XXXX-XXXX
 */
export function generarLicencia(serial) {
  if (serial < 1 || serial > 1679615) throw new Error('Serial fuera de rango (1–1.679.615)');
  const hashStr = hash32(`${SECRET}:${serial}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, '0')
    .substring(0, 8);
  const serialStr = serial.toString(36).toUpperCase().padStart(4, '0');
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${serialStr}`;
}
