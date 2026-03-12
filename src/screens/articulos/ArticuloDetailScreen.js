import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

export default function ArticuloDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { idarticulo } = route.params;
  const [articulo, setArticulo] = useState(null);
  const [stock, setStock] = useState(0);
  const [compras, setCompras] = useState([]);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      const a = await db.getFirstAsync('SELECT * FROM articulos WHERE idarticulo = ?', [idarticulo]);
      setArticulo(a);

      const stockData = await db.getFirstAsync(`
        SELECT
          COALESCE(SUM(c.cantidad), 0) as total_comprado,
          COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = ?), 0) as total_vendido
        FROM compras c WHERE c.idarticulo = ?
      `, [idarticulo, idarticulo]);
      setStock((stockData?.total_comprado || 0) - (stockData?.total_vendido || 0));

      const c = await db.getAllAsync(
        'SELECT * FROM compras WHERE idarticulo = ? ORDER BY fecha DESC', [idarticulo]
      );
      setCompras(c);
    };
    cargar();
  }, [idarticulo]));

  if (!articulo) return null;

  const ultimaCompra = compras[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.card, STYLES.shadow]}>
        {articulo.imagen ? (
          <Image source={{ uri: articulo.imagen }} style={styles.img} />
        ) : (
          <View style={styles.imgPlaceholder}><Text style={{ fontSize: 48 }}>📦</Text></View>
        )}
        <Text style={styles.nombre}>{articulo.nombre}</Text>
        {articulo.detalle ? <Text style={styles.detalle}>{articulo.detalle}</Text> : null}

        <View style={[styles.stockBadge, { backgroundColor: stock > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.stockText, { color: stock > 0 ? COLORS.success : COLORS.danger }]}>
            Stock disponible: {stock} unidades
          </Text>
        </View>

        {ultimaCompra && (
          <View style={styles.precios}>
            <PrecioItem label="Último precio compra" value={ultimaCompra.precio_compra} />
            <PrecioItem label="Último precio envío" value={ultimaCompra.precio_envio} />
            <PrecioItem label="Precio venta sugerido" value={ultimaCompra.precio_venta_sugerido} highlight />
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.success }]}
            onPress={() => navigation.navigate('CompraForm', { idarticulo })}
          >
            <Text style={styles.btnText}>➕ Agregar Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('ArticuloForm', { articulo })}
          >
            <Text style={styles.btnText}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Historial de Compras ({compras.length})</Text>
      {compras.map(c => (
        <View key={c.idcompra} style={[styles.compraCard, STYLES.shadow]}>
          <View style={styles.compraRow}>
            <Text style={styles.compraFecha}>{c.fecha}</Text>
            <Text style={styles.compraCantidad}>+{c.cantidad} unid.</Text>
          </View>
          <View style={styles.compraRow}>
            <Text style={styles.compraSub}>Compra: Bs. {Number(c.precio_compra).toFixed(2)}</Text>
            <Text style={styles.compraSub}>Envío: Bs. {Number(c.precio_envio).toFixed(2)}</Text>
            <Text style={[styles.compraSub, { color: COLORS.success, fontWeight: '600' }]}>
              Venta: Bs. {Number(c.precio_venta_sugerido).toFixed(2)}
            </Text>
          </View>
          {c.detalle ? <Text style={styles.compraDetalle}>{c.detalle}</Text> : null}
        </View>
      ))}
      {compras.length === 0 && <Text style={styles.empty}>Sin compras registradas</Text>}
    </ScrollView>
  );
}

const PrecioItem = ({ label, value, highlight }) => (
  <View style={styles.precioItem}>
    <Text style={styles.precioLabel}>{label}</Text>
    <Text style={[styles.precioValue, highlight && { color: COLORS.success, fontWeight: 'bold' }]}>
      Bs. {Number(value || 0).toFixed(2)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  img: { width: 120, height: 120, borderRadius: 12, marginBottom: 10 },
  imgPlaceholder: {
    width: 120, height: 120, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  nombre: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  detalle: { fontSize: 13, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
  stockBadge: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 },
  stockText: { fontSize: 14, fontWeight: '700' },
  precios: { alignSelf: 'stretch', marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  precioItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  precioLabel: { fontSize: 13, color: COLORS.textLight },
  precioValue: { fontSize: 13, color: COLORS.text },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  compraCard: {
    backgroundColor: COLORS.card, borderRadius: 8, padding: 10, marginBottom: 6,
  },
  compraRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, flexWrap: 'wrap', gap: 4 },
  compraFecha: { fontSize: 12, color: COLORS.textLight },
  compraCantidad: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  compraSub: { fontSize: 12, color: COLORS.textLight },
  compraDetalle: { fontSize: 11, color: COLORS.textLight, fontStyle: 'italic', marginTop: 4 },
  empty: { color: COLORS.textLight, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
