/**
 * licencia.js — Sistema de activación con vencimiento de 1 año
 *
 * Formato de clave: XXXX-XXXX-XXXX (12 chars alfanuméricos en 3 grupos de 4)
 *
 * Algoritmo:
 *   - Chars 1–8: hash(SECRET + serial) en base36
 *   - Chars 9–12: número de serie en base36
 *
 * El vencimiento se calcula desde la fecha de activación guardada en SQLite.
 * No requiere internet.
 *
 * IMPORTANTE: Cambia SECRET antes de compilar tu APK final.
 */

// ─── CAMBIA ESTO ANTES DE COMPILAR ──────────────────────────────────────────
const SECRET = 'SD2025GESTION_INVENTARIO';
// ────────────────────────────────────────────────────────────────────────────

function hash32(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Valida si una clave de licencia es correcta (solo formato/algoritmo).
 */
export function validarLicencia(rawKey) {
  const key = (rawKey || '').toUpperCase().replace(/[-\s]/g, '');
  if (key.length !== 12) return false;
  const hashPart   = key.slice(0, 8);
  const serialPart = key.slice(8, 12);
  const serial = parseInt(serialPart, 36);
  if (isNaN(serial) || serial <= 0) return false;
  const expectedHash = hash32(`${SECRET}:${serial}`)
    .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
  return hashPart === expectedHash;
}

/**
 * Genera una clave para un número de serie dado.
 * Solo usar en tools/generar-licencias.js, nunca en la app.
 */
export function generarLicencia(serial) {
  if (serial < 1 || serial > 1679615) throw new Error('Serial fuera de rango (1–1.679.615)');
  const hashStr = hash32(`${SECRET}:${serial}`)
    .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
  const serialStr = serial.toString(36).toUpperCase().padStart(4, '0');
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${serialStr}`;
}

/**
 * Verifica el estado de vencimiento de la licencia activa.
 * @returns {{ expirada: boolean, diasRestantes: number, fechaExpiracion: string }}
 */
export async function verificarExpiracion(db) {
  const row = await db.getFirstAsync(
    "SELECT valor FROM configuracion WHERE clave = 'licencia_fecha_activacion'"
  );
  if (!row?.valor) return { expirada: false, diasRestantes: 365, fechaExpiracion: '' };

  const fechaActivacion  = new Date(row.valor);
  const fechaExpiracion  = new Date(fechaActivacion);
  fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1);

  const hoy = new Date();
  const msRestantes  = fechaExpiracion - hoy;
  const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

  return {
    expirada: hoy > fechaExpiracion,
    diasRestantes: Math.max(0, diasRestantes),
    fechaExpiracion: fechaExpiracion.toISOString().slice(0, 10),
  };
}
