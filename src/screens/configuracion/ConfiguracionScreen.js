/**
 * ConfiguracionScreen — Ajustes generales de la aplicación
 *
 * Secciones:
 *  1. Modo Oscuro (toggle)
 *  2. Datos del negocio (nombre, NIT, dirección, teléfono) — usados en PDF
 *  3. Preferencias (moneda, umbral de stock bajo)
 *  4. Backup y Restauración (exportar / importar JSON)
 *  5. Gestión de Categorías (CRUD rápido)
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, ActivityIndicator
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';
import { exportarBackup, importarBackup } from '../../utils/backup';

const COLORES_CATEGORIA = ['#2563EB','#16A34A','#DC2626','#D97706','#7C3AED','#0891B2','#DB2777'];

export default function ConfiguracionScreen() {
  const db = useSQLiteContext();
  const { COLORS, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [config, setConfig] = useState({
    nombre_negocio: '', nit: '', direccion: '', telefono: '',
    moneda: 'Bs.', stock_minimo: '3',
  });
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [colorSeleccionado, setColorSeleccionado] = useState(COLORES_CATEGORIA[0]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const rows = await db.getAllAsync('SELECT clave, valor FROM configuracion');
    const map = {};
    rows.forEach(r => { map[r.clave] = r.valor; });
    setConfig(prev => ({ ...prev, ...map }));
    const cats = await db.getAllAsync('SELECT * FROM categorias ORDER BY nombre ASC');
    setCategorias(cats);
  };

  const guardarConfig = async (clave, valor) => {
    await db.runAsync(
      'INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?,?)',
      [clave, valor]
    );
  };

  const set = (clave, valor) => {
    setConfig(prev => ({ ...prev, [clave]: valor }));
    guardarConfig(clave, valor);
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    try {
      await db.runAsync(
        'INSERT INTO categorias (nombre, color) VALUES (?,?)',
        [nuevaCategoria.trim(), colorSeleccionado]
      );
      setNuevaCategoria('');
      cargar();
    } catch (_) {
      Alert.alert('Error', 'Ya existe una categoría con ese nombre');
    }
  };

  const eliminarCategoria = (cat) => {
    Alert.alert('Eliminar', `¿Eliminar la categoría "${cat.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.runAsync('UPDATE articulos SET idcategoria = NULL WHERE idcategoria = ?', [cat.idcategoria]);
          await db.runAsync('DELETE FROM categorias WHERE idcategoria = ?', [cat.idcategoria]);
          cargar();
        }
      }
    ]);
  };

  const hacerBackup = async () => {
    setCargando(true);
    try {
      await exportarBackup(db);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo exportar el backup');
    } finally {
      setCargando(false);
    }
  };

  const restaurarBackup = () => {
    Alert.alert(
      '⚠️ Restaurar Backup',
      'Esto BORRARÁ todos los datos actuales y los reemplazará con el backup. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar', style: 'destructive', onPress: async () => {
            setCargando(true);
            try {
              const ok = await importarBackup(db);
              if (ok) {
                Alert.alert('✅ Éxito', 'Backup restaurado correctamente');
                cargar();
              }
            } catch (e) {
              Alert.alert('Error', e.message || 'Archivo de backup inválido');
            } finally {
              setCargando(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* ── Apariencia ── */}
      <SectionHeader title="🎨 Apariencia" colors={COLORS} />
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Modo Oscuro</Text>
            <Text style={styles.switchSub}>Fondo oscuro para usar de noche</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      {/* ── Datos del negocio ── */}
      <SectionHeader title="🏢 Datos del Negocio (PDF)" colors={COLORS} />
      <View style={[styles.card, STYLES.shadow]}>
        <Campo label="Nombre del Negocio" value={config.nombre_negocio}
          onBlur={() => guardarConfig('nombre_negocio', config.nombre_negocio)}
          onChangeText={v => setConfig(p => ({ ...p, nombre_negocio: v }))}
          placeholder="Ej: Soluciones Tecnológicas" styles={styles} />
        <Campo label="NIT / RUC" value={config.nit}
          onBlur={() => guardarConfig('nit', config.nit)}
          onChangeText={v => setConfig(p => ({ ...p, nit: v }))}
          placeholder="Número de identificación tributaria" keyboardType="numeric" styles={styles} />
        <Campo label="Dirección" value={config.direccion}
          onBlur={() => guardarConfig('direccion', config.direccion)}
          onChangeText={v => setConfig(p => ({ ...p, direccion: v }))}
          placeholder="Dirección del negocio" styles={styles} />
        <Campo label="Teléfono" value={config.telefono}
          onBlur={() => guardarConfig('telefono', config.telefono)}
          onChangeText={v => setConfig(p => ({ ...p, telefono: v }))}
          placeholder="Teléfono de contacto" keyboardType="phone-pad" styles={styles} />
      </View>

      {/* ── Preferencias ── */}
      <SectionHeader title="⚙️ Preferencias" colors={COLORS} />
      <View style={[styles.card, STYLES.shadow]}>
        <Campo label="Moneda" value={config.moneda}
          onBlur={() => guardarConfig('moneda', config.moneda)}
          onChangeText={v => setConfig(p => ({ ...p, moneda: v }))}
          placeholder="Bs." styles={styles} />
        <Campo label="Alerta de stock bajo (unidades)" value={config.stock_minimo}
          onBlur={() => guardarConfig('stock_minimo', config.stock_minimo)}
          onChangeText={v => setConfig(p => ({ ...p, stock_minimo: v }))}
          placeholder="3" keyboardType="numeric" styles={styles} />
        <Text style={styles.hint}>
          Recibirás alertas en el Dashboard cuando el stock de un artículo sea menor a este número.
        </Text>
      </View>

      {/* ── Categorías ── */}
      <SectionHeader title="🏷️ Categorías de Artículos" colors={COLORS} />
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.nuevaCatRow}>
          <TextInput
            style={[styles.nuevaCatInput, { flex: 1 }]}
            value={nuevaCategoria}
            onChangeText={setNuevaCategoria}
            placeholder="Nueva categoría..."
            placeholderTextColor={COLORS.textLight}
            onSubmitEditing={agregarCategoria}
          />
          <TouchableOpacity style={[styles.btnAgrCat, { backgroundColor: COLORS.primary }]} onPress={agregarCategoria}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>＋</Text>
          </TouchableOpacity>
        </View>
        {/* Selector de color */}
        <View style={styles.coloresRow}>
          {COLORES_CATEGORIA.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: colorSeleccionado === c ? 3 : 0, borderColor: COLORS.text }]}
              onPress={() => setColorSeleccionado(c)}
            />
          ))}
        </View>
        {/* Lista de categorías */}
        {categorias.map(cat => (
          <View key={cat.idcategoria} style={styles.catRow}>
            <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
            <Text style={styles.catNombre}>{cat.nombre}</Text>
            <TouchableOpacity onPress={() => eliminarCategoria(cat)}>
              <Text style={{ color: COLORS.danger, fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
        {categorias.length === 0 && (
          <Text style={styles.empty}>Sin categorías — agrega una arriba</Text>
        )}
      </View>

      {/* ── Backup ── */}
      <SectionHeader title="💾 Backup y Restauración" colors={COLORS} />
      <View style={[styles.card, STYLES.shadow]}>
        <Text style={styles.backupInfo}>
          Exporta todos tus datos (clientes, artículos, ventas, etc.) a un archivo JSON para guardar como respaldo o transferir a otro dispositivo.
        </Text>

        <TouchableOpacity
          style={[styles.btnBackup, { backgroundColor: COLORS.primary }]}
          onPress={hacerBackup}
          disabled={cargando}
        >
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnBackupText}>📤 Exportar Backup</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnBackup, { backgroundColor: COLORS.warning, marginTop: 8 }]}
          onPress={restaurarBackup}
          disabled={cargando}
        >
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnBackupText}>📥 Importar Backup</Text>
          }
        </TouchableOpacity>

        <View style={styles.advertencia}>
          <Text style={styles.advertenciaText}>
            ⚠️ Importar un backup BORRARÁ todos los datos actuales. Asegúrate de exportar primero.
          </Text>
        </View>
      </View>

      {/* ── Créditos ── */}
      <View style={styles.creditos}>
        <Text style={styles.creditosApp}>Inventory Management v1.0</Text>
        <Text style={styles.creditosDev}>Desarrollado por Solución Digital</Text>
        <Text style={styles.creditosUrl}>www.soluciondigital.dev</Text>
      </View>

    </ScrollView>
  );
}

function SectionHeader({ title, colors }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {title}
    </Text>
  );
}

function Campo({ label, styles, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
    input: {
      backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
      borderRadius: 8, padding: 10, fontSize: 14, color: C.text,
    },
    hint: { fontSize: 11, color: C.textLight, marginTop: 4, lineHeight: 16 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchLabel: { fontSize: 15, fontWeight: '600', color: C.text },
    switchSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
    nuevaCatRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    nuevaCatInput: {
      backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
      borderRadius: 8, padding: 10, fontSize: 14, color: C.text,
    },
    btnAgrCat: { borderRadius: 8, width: 44, justifyContent: 'center', alignItems: 'center' },
    coloresRow: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
    catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    catColorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
    catNombre: { flex: 1, fontSize: 14, color: C.text },
    empty: { fontSize: 13, color: C.textLight, textAlign: 'center', paddingVertical: 8 },
    backupInfo: { fontSize: 13, color: C.textLight, marginBottom: 14, lineHeight: 20 },
    btnBackup: { borderRadius: 10, padding: 13, alignItems: 'center' },
    btnBackupText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    advertencia: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginTop: 10 },
    advertenciaText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
    creditos: { alignItems: 'center', paddingVertical: 24 },
    creditosApp: { fontSize: 14, fontWeight: '700', color: C.text },
    creditosDev: { fontSize: 12, color: C.textLight, marginTop: 4 },
    creditosUrl: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 2 },
  });
}
