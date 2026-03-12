/**
 * backup.js — Exportar e importar toda la base de datos como JSON
 *
 * Exportar: consulta todas las tablas → genera JSON → comparte con expo-sharing
 * Importar: el usuario selecciona un archivo .json → limpia tablas → inserta datos
 *
 * Requiere: expo-file-system, expo-sharing, expo-document-picker
 * Instalar: npx expo install expo-file-system expo-document-picker
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const TABLAS = ['categorias', 'clientes', 'articulos', 'compras', 'proformas', 'proforma_detalle', 'ventas', 'venta_detalle'];

/**
 * Exporta toda la base de datos a un archivo JSON y lo comparte.
 * @param {object} db - instancia de useSQLiteContext()
 */
export const exportarBackup = async (db) => {
  const datos = { version: 2, fecha: new Date().toISOString(), tablas: {} };

  for (const tabla of TABLAS) {
    try {
      datos.tablas[tabla] = await db.getAllAsync(`SELECT * FROM ${tabla}`);
    } catch (_) {
      datos.tablas[tabla] = [];
    }
  }

  const json = JSON.stringify(datos, null, 2);
  const fecha = new Date().toISOString().slice(0, 10);
  const path = `${FileSystem.cacheDirectory}backup_inventario_${fecha}.json`;

  await FileSystem.writeAsStringAsync(path, json, { encoding: 'utf8' });

  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Guardar backup de Inventario',
    });
  } else {
    throw new Error('La función de compartir no está disponible en este dispositivo');
  }
};

/**
 * Importa un backup JSON y restaura la base de datos.
 * ⚠️ BORRA TODOS los datos actuales antes de importar.
 * @param {object} db - instancia de useSQLiteContext()
 * @returns {boolean} true si se importó correctamente
 */
export const importarBackup = async (db) => {
  // Seleccionar archivo
  const resultado = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (resultado.canceled || !resultado.assets?.[0]) return false;

  const uri = resultado.assets[0].uri;
  const contenido = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
  const datos = JSON.parse(contenido);

  if (!datos.tablas) throw new Error('Archivo de backup inválido');

  // Borrar datos actuales en orden inverso (respetar FK)
  const tablasInverso = [...TABLAS].reverse();
  for (const tabla of tablasInverso) {
    try { await db.runAsync(`DELETE FROM ${tabla}`); } catch (_) {}
  }

  // Insertar datos restaurados
  for (const tabla of TABLAS) {
    const filas = datos.tablas[tabla] || [];
    for (const fila of filas) {
      const columnas = Object.keys(fila);
      const valores = Object.values(fila);
      const placeholders = columnas.map(() => '?').join(',');
      try {
        await db.runAsync(
          `INSERT OR IGNORE INTO ${tabla} (${columnas.join(',')}) VALUES (${placeholders})`,
          valores
        );
      } catch (_) {}
    }
  }

  return true;
};
