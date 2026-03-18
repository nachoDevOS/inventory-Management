import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../../context/ThemeContext';

export default function ClienteFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const clienteExistente = route.params?.cliente;
  const [form, setForm] = useState({ carnet_identidad:'', nombre:'', celular:'', correo:'', contacto_referencia:'', detalle:'' });

  useEffect(() => {
    if (clienteExistente) setForm({
      carnet_identidad: clienteExistente.carnet_identidad||'', nombre: clienteExistente.nombre||'',
      celular: clienteExistente.celular||'', correo: clienteExistente.correo||'',
      contacto_referencia: clienteExistente.contacto_referencia||'', detalle: clienteExistente.detalle||'',
    });
  }, [clienteExistente]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const guardar = async () => {
    if (!form.nombre.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
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
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Campo label="Nombre *" value={form.nombre} onChangeText={v => set('nombre', v)} placeholder="Nombre completo" S={styles} C={COLORS} />
      <Campo label="Carnet de Identidad" value={form.carnet_identidad} onChangeText={v => set('carnet_identidad', v)} placeholder="CI" keyboardType="numeric" S={styles} C={COLORS} />
      <Campo label="Celular" value={form.celular} onChangeText={v => set('celular', v)} placeholder="Número de celular" keyboardType="phone-pad" S={styles} C={COLORS} />
      <Campo label="Correo Electrónico" value={form.correo} onChangeText={v => set('correo', v)} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" S={styles} C={COLORS} />
      <Campo label="Contacto de Referencia" value={form.contacto_referencia} onChangeText={v => set('contacto_referencia', v)} placeholder="Nombre y teléfono de referencia" S={styles} C={COLORS} />
      <Campo label="Detalle / Observaciones" value={form.detalle} onChangeText={v => set('detalle', v)} placeholder="Notas adicionales" multiline numberOfLines={3} S={styles} C={COLORS} />
      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>💾 Guardar Cliente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Campo({ label, multiline, S, C, ...props }) {
  return (
    <View style={S.campo}>
      <Text style={S.label}>{label}</Text>
      <TextInput style={[S.input, multiline && { height: 80, textAlignVertical: 'top' }]} multiline={multiline} placeholderTextColor={C.textLight} {...props} />
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    campo: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
    input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, fontSize: 14, color: C.text },
    btnGuardar: { backgroundColor: C.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
    btnGuardarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  });
}
