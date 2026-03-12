import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

const ESTADO_COLOR = {
  pendiente: { bg: '#FEF3C7', text: '#D97706' },
  aprobada: { bg: '#DCFCE7', text: '#16A34A' },
  convertida: { bg: '#DBEAFE', text: '#2563EB' },
  rechazada: { bg: '#FEE2E2', text: '#DC2626' },
};

export default function ProformasScreen({ navigation }) {
  const db = useSQLiteContext();
  const [proformas, setProformas] = useState([]);

  const cargar = useCallback(async () => {
    const rows = await db.getAllAsync(`
      SELECT p.*, c.nombre as cliente_nombre,
        COALESCE((SELECT SUM(pd.subtotal) FROM proforma_detalle pd WHERE pd.idproforma = p.idproforma), 0) as total
      FROM proformas p
      JOIN clientes c ON c.idcliente = p.idcliente
      ORDER BY p.fecha DESC
    `);
    setProformas(rows);
  }, [db]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const renderItem = ({ item }) => {
    const ec = ESTADO_COLOR[item.estado] || ESTADO_COLOR.pendiente;
    return (
      <TouchableOpacity
        style={[styles.card, STYLES.shadow]}
        onPress={() => navigation.navigate('ProformaDetail', { idproforma: item.idproforma })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>Proforma #{item.idproforma}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: ec.bg }]}>
            <Text style={[styles.estadoText, { color: ec.text }]}>{item.estado}</Text>
          </View>
        </View>
        <Text style={styles.cliente}>👤 {item.cliente_nombre}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.fecha}>{item.fecha}</Text>
          <Text style={styles.total}>Bs. {Number(item.total).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={proformas}
        keyExtractor={item => String(item.idproforma)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay proformas registradas</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ProformaForm')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardId: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  estadoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  estadoText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cliente: { fontSize: 13, color: COLORS.textLight, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  fecha: { fontSize: 12, color: COLORS.textLight },
  total: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: COLORS.primary, width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  fabText: { color: COLORS.white, fontSize: 28, lineHeight: 32 },
});
