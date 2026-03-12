import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS } from '../../theme';

export default function CompraFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { idarticulo } = route.params;
  const [articulo, setArticulo] = useState(null);
  const [form, setForm] = useState({
    cantidad: '1',
    precio_compra: '',
    precio_envio: '0',
    precio_venta_sugerido: '',
    detalle: '',
  });

  useEffect(() => {
    db.getFirstAsync('SELECT * FROM articulos WHERE idarticulo = ?', [idarticulo])
      .then(setArticulo);
  }, [idarticulo]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const guardar = async () => {
    const cantidad = parseInt(form.cantidad);
    const precioCompra = parseFloat(form.precio_compra);
    if (!cantidad || cantidad <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }
    if (isNaN(precioCompra) || precioCompra < 0) {
      Alert.alert('Error', 'Ingresa un precio de compra válido');
      return;
    }
    await db.runAsync(
      `INSERT INTO compras (idarticulo, cantidad, precio_compra, precio_envio, precio_venta_sugerido, detalle)
       VALUES (?,?,?,?,?,?)`,
      [
        idarticulo,
        cantidad,
        precioCompra,
        parseFloat(form.precio_envio) || 0,
        parseFloat(form.precio_venta_sugerido) || 0,
        form.detalle,
      ]
    );
    navigation.goBack();
  };

  const costoTotal = () => {
    const c = parseFloat(form.precio_compra) || 0;
    const e = parseFloat(form.precio_envio) || 0;
    const q = parseInt(form.cantidad) || 1;
    return ((c + e / q) * q).toFixed(2);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {articulo && (
        <View style={styles.articuloInfo}>
          <Text style={styles.articuloLabel}>Artículo</Text>
          <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
        </View>
      )}

      <Campo label="Cantidad *" value={form.cantidad} onChangeText={v => set('cantidad', v)} keyboardType="numeric" placeholder="1" />
      <Campo label="Precio de Compra (Bs.) *" value={form.precio_compra} onChangeText={v => set('precio_compra', v)} keyboardType="decimal-pad" placeholder="0.00" />
      <Campo label="Precio de Envío (Bs.)" value={form.precio_envio} onChangeText={v => set('precio_envio', v)} keyboardType="decimal-pad" placeholder="0.00" />
      <Campo label="Precio de Venta Sugerido (Bs.)" value={form.precio_venta_sugerido} onChangeText={v => set('precio_venta_sugerido', v)} keyboardType="decimal-pad" placeholder="0.00" />
      <Campo label="Detalle / Observaciones" value={form.detalle} onChangeText={v => set('detalle', v)} placeholder="Notas de la compra" multiline numberOfLines={2} />

      <View style={styles.resumen}>
        <Text style={styles.resumenLabel}>Costo total estimado:</Text>
        <Text style={styles.resumenValor}>Bs. {costoTotal()}</Text>
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>✅ Registrar Compra</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Campo({ label, multiline, ...props }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 70, textAlignVertical: 'top' }]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  articuloInfo: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  articuloLabel: { fontSize: 11, color: COLORS.textLight, textTransform: 'uppercase' },
  articuloNombre: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  campo: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text,
  },
  resumen: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 14,
  },
  resumenLabel: { fontSize: 14, color: COLORS.text },
  resumenValor: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  btnGuardar: {
    backgroundColor: COLORS.success, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  btnGuardarText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
