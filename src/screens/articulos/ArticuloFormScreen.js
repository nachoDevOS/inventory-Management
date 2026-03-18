import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../../context/ThemeContext';

export default function ArticuloFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const articuloExistente = route.params?.articulo;
  const [form, setForm] = useState({
    nombre: '', detalle: '', imagen: '',
    idcategoria: null, codigo_barras: '', sku: '', marca: ''
  });
  const [categorias, setCategorias] = useState([]);
  const [modalCat, setModalCat] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  useEffect(() => {
    db.getAllAsync('SELECT * FROM categorias ORDER BY nombre ASC').then(setCategorias);
    if (articuloExistente) {
      setForm({
        nombre: articuloExistente.nombre || '',
        detalle: articuloExistente.detalle || '',
        imagen: articuloExistente.imagen || '',
        idcategoria: articuloExistente.idcategoria || null,
        codigo_barras: articuloExistente.codigo_barras || '',
        sku: articuloExistente.sku || '',
        marca: articuloExistente.marca || '',
      });
      if (articuloExistente.idcategoria) {
        db.getFirstAsync('SELECT * FROM categorias WHERE idcategoria = ?', [articuloExistente.idcategoria])
          .then(c => { if (c) setCategoriaSeleccionada(c); });
      }
    }
  }, [articuloExistente]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso', 'Se necesita acceso a la galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) set('imagen', result.assets[0].uri);
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso', 'Se necesita acceso a la cámara'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) set('imagen', result.assets[0].uri);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { Alert.alert('Error', 'El nombre del artículo es obligatorio'); return; }
    if (articuloExistente) {
      await db.runAsync(
        'UPDATE articulos SET nombre=?, detalle=?, imagen=?, idcategoria=?, codigo_barras=?, sku=?, marca=? WHERE idarticulo=?',
        [form.nombre, form.detalle, form.imagen, form.idcategoria, form.codigo_barras, form.sku, form.marca, articuloExistente.idarticulo]
      );
    } else {
      await db.runAsync(
        'INSERT INTO articulos (nombre, detalle, imagen, idcategoria, codigo_barras, sku, marca) VALUES (?,?,?,?,?,?,?)',
        [form.nombre, form.detalle, form.imagen, form.idcategoria, form.codigo_barras, form.sku, form.marca]
      );
    }
    navigation.goBack();
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={{ padding: 16 }}>

      {/* ── Imagen ── */}
      <Text style={styles.label}>Imagen del Artículo</Text>
      <View style={styles.imgContainer}>
        {form.imagen
          ? <Image source={{ uri: form.imagen }} style={styles.img} />
          : <View style={styles.imgPlaceholder}><Text style={{ fontSize: 40 }}>📦</Text></View>
        }
        <View style={styles.imgButtons}>
          <TouchableOpacity style={styles.btnImg} onPress={seleccionarImagen}>
            <Text style={styles.btnImgText}>🖼️ Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnImg} onPress={tomarFoto}>
            <Text style={styles.btnImgText}>📷 Cámara</Text>
          </TouchableOpacity>
          {form.imagen ? (
            <TouchableOpacity style={[styles.btnImg, { backgroundColor: '#FEE2E2' }]} onPress={() => set('imagen', '')}>
              <Text style={[styles.btnImgText, { color: COLORS.danger }]}>✕ Quitar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Nombre ── */}
      <View style={styles.campo}>
        <Text style={styles.label}>Nombre *</Text>
        <TextInput style={styles.input} value={form.nombre} onChangeText={v => set('nombre', v)}
          placeholder="Nombre del artículo" placeholderTextColor={COLORS.textLight} />
      </View>

      {/* ── Detalle ── */}
      <View style={styles.campo}>
        <Text style={styles.label}>Detalle / Descripción</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={form.detalle} onChangeText={v => set('detalle', v)}
          placeholder="Descripción del artículo" placeholderTextColor={COLORS.textLight}
          multiline numberOfLines={3} />
      </View>

      {/* ── Categoría ── */}
      <View style={styles.campo}>
        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity style={styles.selectorBtn} onPress={() => setModalCat(true)}>
          {categoriaSeleccionada ? (
            <View style={styles.catSelRow}>
              <View style={[styles.catDot, { backgroundColor: categoriaSeleccionada.color }]} />
              <Text style={styles.catSelText}>{categoriaSeleccionada.nombre}</Text>
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>Sin categoría</Text>
          )}
          <Text style={{ color: COLORS.textLight }}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* ── Marca ── */}
      <View style={styles.campo}>
        <Text style={styles.label}>Marca</Text>
        <TextInput style={styles.input} value={form.marca} onChangeText={v => set('marca', v)}
          placeholder="Ej: Samsung, Nike, Genérico..." placeholderTextColor={COLORS.textLight}
          autoCapitalize="words" />
      </View>

      {/* ── Código de Barras y SKU en fila ── */}
      <View style={styles.dosCampos}>
        <View style={[styles.campo, { flex: 1 }]}>
          <Text style={styles.label}>Código de Barras</Text>
          <TextInput style={styles.input} value={form.codigo_barras}
            onChangeText={v => set('codigo_barras', v)}
            placeholder="Ej: 7501234567890"
            placeholderTextColor={COLORS.textLight}
            keyboardType="default" />
          <Text style={styles.hint}>Escanea o escribe</Text>
        </View>
        <View style={[styles.campo, { flex: 1 }]}>
          <Text style={styles.label}>SKU / Código Interno</Text>
          <TextInput style={styles.input} value={form.sku}
            onChangeText={v => set('sku', v)}
            placeholder="Ej: PROD-001"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="characters" />
          <Text style={styles.hint}>Código propio del negocio</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>💾 Guardar Artículo</Text>
      </TouchableOpacity>

      {/* ── Modal Categorías ── */}
      <Modal visible={modalCat} animationType="slide" onRequestClose={() => setModalCat(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
            <TouchableOpacity onPress={() => setModalCat(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ idcategoria: null, nombre: 'Sin categoría', color: COLORS.textLight }, ...categorias]}
            keyExtractor={c => String(c.idcategoria)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem}
                onPress={() => { set('idcategoria', item.idcategoria); setCategoriaSeleccionada(item.idcategoria ? item : null); setModalCat(false); }}>
                <View style={styles.catSelRow}>
                  <View style={[styles.catDot, { backgroundColor: item.color }]} />
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                </View>
                {form.idcategoria === item.idcategoria && <Text style={{ color: COLORS.success }}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    imgContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    img: { width: 80, height: 80, borderRadius: 10 },
    imgPlaceholder: { width: 80, height: 80, borderRadius: 10, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
    imgButtons: { flex: 1, gap: 6 },
    btnImg: { backgroundColor: C.card, borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    btnImgText: { fontSize: 13, color: C.primary, fontWeight: '500' },
    dosCampos: { flexDirection: 'row', gap: 10 },
    campo: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
    input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, fontSize: 14, color: C.text },
    hint: { fontSize: 11, color: C.textLight, marginTop: 3 },
    selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12 },
    selectorPlaceholder: { fontSize: 14, color: C.textLight },
    catSelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catSelText: { fontSize: 14, color: C.text, fontWeight: '500' },
    catDot: { width: 14, height: 14, borderRadius: 7 },
    btnGuardar: { backgroundColor: C.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
    btnGuardarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    modal: { flex: 1, backgroundColor: C.bg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: C.primary },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    modalClose: { fontSize: 20, color: '#fff', padding: 4 },
    modalItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalItemText: { fontSize: 15, color: C.text, fontWeight: '500' },
  });
}
