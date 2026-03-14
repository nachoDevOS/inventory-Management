/**
 * licencia.js — Sistema de activación con vencimiento de 1 año + binding por dispositivo
 *
 * Formato de clave: XXXX-XXXX-XXXX (12 chars alfanuméricos en 3 grupos de 4)
 *
 * Algoritmo:
 *   - Chars 1–8: hash(SECRET + serial + deviceCode) en base36
 *   - Chars 9–12: número de serie en base36
 *
 * El vencimiento se calcula desde la fecha de activación guardada en SQLite.
 * No requiere internet. La clave solo funciona en el dispositivo para el que fue generada.
 *
 * IMPORTANTE: Cambia SECRET antes de compilar tu APK final.
 */
import * as Application from 'expo-application';

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
 * Obtiene un código de dispositivo único (androidId en Android).
 * Devuelve string en mayúsculas, o 'UNKNOWN' si no está disponible.
 */
export async function obtenerDeviceCode() {
  try {
    const id = Application.androidId || Application.getAndroidId?.() || '';
    return (id || 'UNKNOWN').toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Valida si una clave de licencia es correcta para este dispositivo.
 *
 * Soporta dos formatos:
 *  - Legacy (12 chars sin guiones): XXXX-XXXX-XXXX  → 12 meses
 *  - Nuevo  (14 chars sin guiones): XXXX-XXXX-SSSS-MM → meses codificados
 *
 * @param {string} rawKey - clave ingresada por el usuario
 * @param {string} deviceCode - código del dispositivo (de obtenerDeviceCode)
 * @returns {{ valida: boolean, meses: number }}
 */
export function validarLicencia(rawKey, deviceCode) {
  const key = (rawKey || '').toUpperCase().replace(/[-\s]/g, '');
  const device = (deviceCode || 'UNKNOWN').toUpperCase();

  // ── Formato nuevo: 14 chars (hash8 + serial4 + meses2) ──────────────────
  if (key.length === 14) {
    const hashPart   = key.slice(0, 8);
    const serialPart = key.slice(8, 12);
    const mesesPart  = key.slice(12, 14);
    const serial = parseInt(serialPart, 36);
    const meses  = parseInt(mesesPart,  36);
    if (isNaN(serial) || serial <= 0) return { valida: false, meses: 0 };
    if (isNaN(meses)  || meses  <= 0) return { valida: false, meses: 0 };
    const expectedHash = hash32(`${SECRET}:${serial}:${device}:${meses}`)
      .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
    return { valida: hashPart === expectedHash, meses };
  }

  // ── Formato legacy: 12 chars → 12 meses ─────────────────────────────────
  if (key.length === 12) {
    const hashPart   = key.slice(0, 8);
    const serialPart = key.slice(8, 12);
    const serial = parseInt(serialPart, 36);
    if (isNaN(serial) || serial <= 0) return { valida: false, meses: 0 };
    const expectedHash = hash32(`${SECRET}:${serial}:${device}`)
      .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
    return { valida: hashPart === expectedHash, meses: 12 };
  }

  return { valida: false, meses: 0 };
}

/**
 * Genera una clave para un número de serie, código de dispositivo y meses dados.
 * Formato: XXXX-XXXX-SSSS-MM
 * Solo usar en tools/generar-licencias.js, nunca en la app.
 */
export function generarLicencia(serial, deviceCode, meses = 12) {
  if (serial < 1 || serial > 1679615) throw new Error('Serial fuera de rango (1–1.679.615)');
  if (meses  < 1 || meses  > 1295)    throw new Error('Meses fuera de rango (1–1295)');
  const device = (deviceCode || 'UNKNOWN').toUpperCase();
  const hashStr   = hash32(`${SECRET}:${serial}:${device}:${meses}`)
    .toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
  const serialStr = serial.toString(36).toUpperCase().padStart(4, '0');
  const mesesStr  = meses.toString(36).toUpperCase().padStart(2, '0');
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${serialStr}-${mesesStr}`;
}

/**
 * Verifica el estado de vencimiento de la licencia activa.
 * Usa licencia_meses guardado en DB (puesto al activar).
 * @returns {{ expirada: boolean, diasRestantes: number, fechaExpiracion: string }}
 */
export async function verificarExpiracion(db) {
  const rowFecha = await db.getFirstAsync(
    "SELECT valor FROM configuracion WHERE clave = 'licencia_fecha_activacion'"
  );
  if (!rowFecha?.valor) return { expirada: false, diasRestantes: 365, fechaExpiracion: '' };

  const rowMeses = await db.getFirstAsync(
    "SELECT valor FROM configuracion WHERE clave = 'licencia_meses'"
  );
  const meses = parseInt(rowMeses?.valor || '12');

  const fechaActivacion = new Date(rowFecha.valor);
  const fechaExpiracion = new Date(fechaActivacion);
  fechaExpiracion.setMonth(fechaExpiracion.getMonth() + meses);

  const hoy = new Date();
  const diasRestantes = Math.ceil((fechaExpiracion - hoy) / (1000 * 60 * 60 * 24));

  return {
    expirada: hoy > fechaExpiracion,
    diasRestantes: Math.max(0, diasRestantes),
    fechaExpiracion: fechaExpiracion.toISOString().slice(0, 10),
  };
}
