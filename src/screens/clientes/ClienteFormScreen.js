import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS } from '../../theme';

export default function ClienteFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const clienteExistente = route.params?.cliente;

  const [form, setForm] = useState({
    carnet_identidad: '',
    nombre: '',
    celular: '',
    correo: '',
    contacto_referencia: '',
    detalle: '',
  });

  useEffect(() => {
    if (clienteExistente) {
      setForm({
        carnet_identidad: clienteExistente.carnet_identidad || '',
        nombre: clienteExistente.nombre || '',
        celular: clienteExistente.celular || '',
        correo: clienteExistente.correo || '',
        contacto_referencia: clienteExistente.contacto_referencia || '',
        detalle: clienteExistente.detalle || '',
      });
    }
  }, [clienteExistente]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const guardar = async () => {
    if (!form.nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    if (clienteExistente) {
      await db.runAsync(
        `UPDATE clientes SET carnet_identidad=?, nombre=?, celular=?, correo=?, contacto_referencia=?, detalle=? WHERE idcliente=?`,
        [form.carnet_identidad, form.nombre, form.celular, form.correo, form.contacto_referencia, form.detalle, clienteExistente.idcliente]
      );
    } else {
      await db.runAsync(
        `INSERT INTO clientes (carnet_identidad, nombre, celular, correo, contacto_referencia, detalle) VALUES (?,?,?,?,?,?)`,
        [form.carnet_identidad, form.nombre, form.celular, form.correo, form.contacto_referencia, form.detalle]
      );
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Campo label="Nombre *" value={form.nombre} onChangeText={v => set('nombre', v)} placeholder="Nombre completo" />
      <Campo label="Carnet de Identidad" value={form.carnet_identidad} onChangeText={v => set('carnet_identidad', v)} placeholder="CI" keyboardType="numeric" />
      <Campo label="Celular" value={form.celular} onChangeText={v => set('celular', v)} placeholder="Número de celular" keyboardType="phone-pad" />
      <Campo label="Correo Electrónico" value={form.correo} onChangeText={v => set('correo', v)} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />
      <Campo label="Contacto de Referencia" value={form.contacto_referencia} onChangeText={v => set('contacto_referencia', v)} placeholder="Nombre y teléfono de referencia" />
      <Campo label="Detalle / Observaciones" value={form.detalle} onChangeText={v => set('detalle', v)} placeholder="Notas adicionales" multiline numberOfLines={3} />

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>💾 Guardar Cliente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Campo({ label, multiline, ...props }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
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
