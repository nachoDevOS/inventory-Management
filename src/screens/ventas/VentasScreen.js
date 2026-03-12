import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

export default function VentasScreen({ navigation }) {
  const db = useSQLiteContext();
  const [ventas, setVentas] = useState([]);

  const cargar = useCallback(async () => {
    const rows = await db.getAllAsync(`
      SELECT v.*, c.nombre as cliente_nombre
      FROM ventas v
      JOIN clientes c ON c.idcliente = v.idcliente
      ORDER BY v.fecha DESC
    `);
    setVentas(rows);
  }, [db]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, STYLES.shadow]}
      onPress={() => navigation.navigate('VentaDetail', { idventa: item.idventa })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>Venta #{item.idventa}</Text>
        {item.idproforma && (
          <View style={styles.proformaBadge}>
            <Text style={styles.proformaText}>Proforma #{item.idproforma}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cliente}>👤 {item.cliente_nombre}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.fecha}>{item.fecha}</Text>
        <Text style={styles.total}>Bs. {Number(item.total).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0);

  return (
    <View style={styles.container}>
      {ventas.length > 0 && (
        <View style={styles.resumen}>
          <Text style={styles.resumenLabel}>{ventas.length} ventas — Total:</Text>
          <Text style={styles.resumenTotal}>Bs. {totalVentas.toFixed(2)}</Text>
        </View>
      )}
      <FlatList
        data={ventas}
        keyExtractor={item => String(item.idventa)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay ventas registradas</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  resumen: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, padding: 12, paddingHorizontal: 16,
  },
  resumenLabel: { color: '#BFDBFE', fontSize: 13 },
  resumenTotal: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardId: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  proformaBadge: { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  proformaText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  cliente: { fontSize: 13, color: COLORS.textLight, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  fecha: { fontSize: 12, color: COLORS.textLight },
  total: { fontSize: 15, fontWeight: 'bold', color: COLORS.success },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 40, fontSize: 15 },
});
