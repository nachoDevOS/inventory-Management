import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Image
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

export default function ArticulosScreen({ navigation }) {
  const db = useSQLiteContext();
  const [articulos, setArticulos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    const rows = await db.getAllAsync(`
      SELECT a.*,
        COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo = a.idarticulo), 0) -
        COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = a.idarticulo), 0) AS stock,
        COALESCE((SELECT MAX(c.precio_venta_sugerido) FROM compras c WHERE c.idarticulo = a.idarticulo ORDER BY c.fecha DESC LIMIT 1), 0) AS precio_venta
      FROM articulos a
      WHERE a.nombre LIKE ?
      ORDER BY a.nombre ASC
    `, [`%${busqueda}%`]);
    setArticulos(rows);
  }, [db, busqueda]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const eliminar = (item) => {
    Alert.alert('Eliminar', `¿Eliminar ${item.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.runAsync('DELETE FROM articulos WHERE idarticulo = ?', [item.idarticulo]);
          cargar();
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, STYLES.shadow]}
      onPress={() => navigation.navigate('ArticuloDetail', { idarticulo: item.idarticulo })}
    >
      <View style={styles.row}>
        {item.imagen ? (
          <Image source={{ uri: item.imagen }} style={styles.img} />
        ) : (
          <View style={styles.imgPlaceholder}><Text style={{ fontSize: 28 }}>📦</Text></View>
        )}
        <View style={styles.info}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <View style={styles.stockRow}>
            <View style={[styles.stockBadge, { backgroundColor: item.stock > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.stockText, { color: item.stock > 0 ? COLORS.success : COLORS.danger }]}>
                Stock: {item.stock}
              </Text>
            </View>
            {item.precio_venta > 0 && (
              <Text style={styles.precio}>Bs. {Number(item.precio_venta).toFixed(2)}</Text>
            )}
          </View>
          {item.detalle ? <Text style={styles.detalle} numberOfLines={1}>{item.detalle}</Text> : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('ArticuloForm', { articulo: item })}>
            <Text style={{ fontSize: 20 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => eliminar(item)}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar artículos..."
        value={busqueda}
        onChangeText={setBusqueda}
        onSubmitEditing={cargar}
      />
      <FlatList
        data={articulos}
        keyExtractor={item => String(item.idarticulo)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay artículos registrados</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ArticuloForm', {})}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  search: {
    margin: 12, padding: 10, backgroundColor: COLORS.card,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.card, marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  img: { width: 60, height: 60, borderRadius: 8 },
  imgPlaceholder: {
    width: 60, height: 60, borderRadius: 8, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, marginLeft: 10 },
  nombre: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  stockBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  stockText: { fontSize: 12, fontWeight: '600' },
  precio: { fontSize: 12, color: COLORS.textLight },
  detalle: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  actions: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: COLORS.primary, width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  fabText: { color: COLORS.white, fontSize: 28, lineHeight: 32 },
});
