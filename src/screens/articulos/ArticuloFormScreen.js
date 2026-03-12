import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS } from '../../theme';

export default function ArticuloFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const articuloExistente = route.params?.articulo;

  const [form, setForm] = useState({ nombre: '', detalle: '', imagen: '' });

  useEffect(() => {
    if (articuloExistente) {
      setForm({
        nombre: articuloExistente.nombre || '',
        detalle: articuloExistente.detalle || '',
        imagen: articuloExistente.imagen || '',
      });
    }
  }, [articuloExistente]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Se necesita acceso a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) set('imagen', result.assets[0].uri);
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Se necesita acceso a la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) set('imagen', result.assets[0].uri);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      Alert.alert('Error', 'El nombre del artículo es obligatorio');
      return;
    }
    if (articuloExistente) {
      await db.runAsync(
        'UPDATE articulos SET nombre=?, detalle=?, imagen=? WHERE idarticulo=?',
        [form.nombre, form.detalle, form.imagen, articuloExistente.idarticulo]
      );
    } else {
      await db.runAsync(
        'INSERT INTO articulos (nombre, detalle, imagen) VALUES (?,?,?)',
        [form.nombre, form.detalle, form.imagen]
      );
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Imagen del Artículo</Text>
      <View style={styles.imgContainer}>
        {form.imagen ? (
          <Image source={{ uri: form.imagen }} style={styles.img} />
        ) : (
          <View style={styles.imgPlaceholder}><Text style={{ fontSize: 40 }}>📦</Text></View>
        )}
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

      <View style={styles.campo}>
        <Text style={styles.label}>Nombre *</Text>
        <TextInput style={styles.input} value={form.nombre} onChangeText={v => set('nombre', v)} placeholder="Nombre del artículo" />
      </View>
      <View style={styles.campo}>
        <Text style={styles.label}>Detalle / Descripción</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={form.detalle} onChangeText={v => set('detalle', v)}
          placeholder="Descripción del artículo" multiline numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>💾 Guardar Artículo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  imgContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  img: { width: 80, height: 80, borderRadius: 10 },
  imgPlaceholder: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  imgButtons: { flex: 1, gap: 6 },
  btnImg: {
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnImgText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  campo: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text,
  },
  btnGuardar: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  btnGuardarText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
