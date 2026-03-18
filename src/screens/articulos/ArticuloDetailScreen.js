import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

export default function ArticuloDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { idarticulo } = route.params;
  const [articulo, setArticulo] = useState(null);
  const [stock, setStock] = useState(0);
  const [compras, setCompras] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ventaStats, setVentaStats] = useState({ totalUnidades: 0, totalIngresos: 0 });
  const [tab, setTab] = useState('compras');

  const cargar = useCallback(async () => {
      const a = await db.getFirstAsync('SELECT * FROM articulos WHERE idarticulo = ?', [idarticulo]);
      setArticulo(a);
      const stockData = await db.getFirstAsync(`
        SELECT
          COALESCE(SUM(c.cantidad), 0) as total_comprado,
          COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = ?), 0) as total_vendido
        FROM compras c WHERE c.idarticulo = ?
      `, [idarticulo, idarticulo]);
      setStock((stockData?.total_comprado || 0) - (stockData?.total_vendido || 0));
      const c = await db.getAllAsync('SELECT * FROM compras WHERE idarticulo = ? ORDER BY fecha DESC', [idarticulo]);
      setCompras(c);
      const v = await db.getAllAsync(`
        SELECT vd.iddetalle, vd.cantidad, vd.precio_venta, vd.descuento, vd.subtotal,
               v.idventa, v.fecha,
               c.nombre as cliente_nombre, c.idcliente
        FROM venta_detalle vd
        JOIN ventas v ON v.idventa = vd.idventa
        JOIN clientes c ON c.idcliente = v.idcliente
        WHERE vd.idarticulo = ?
        ORDER BY v.fecha DESC
      `, [idarticulo]);
      setVentas(v);
      const stats = await db.getFirstAsync(`
        SELECT COALESCE(SUM(vd.cantidad), 0) as total_unidades,
               COALESCE(SUM(vd.subtotal), 0) as total_ingresos
        FROM venta_detalle vd WHERE vd.idarticulo = ?
      `, [idarticulo]);
      setVentaStats({ totalUnidades: stats?.total_unidades || 0, totalIngresos: stats?.total_ingresos || 0 });
  }, [idarticulo]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const eliminarCompra = (compra) => {
    // Permitir eliminar solo si el stock actual cubre toda la cantidad de esta compra
    if (stock < compra.cantidad) {
      Alert.alert(
        'No se puede eliminar',
        `Ya se vendieron unidades de este lote. Stock actual: ${stock}, lote: ${compra.cantidad} unid.\n\nSolo puedes eliminar un lote si el stock está completo (sin ventas).`
      );
      return;
    }
    Alert.alert(
      '🗑️ Eliminar lote de stock',
      `¿Eliminar el lote de ${compra.cantidad} unid. del ${compra.fecha}?\n\nEsto reducirá el stock en ${compra.cantidad} unidades.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            await db.runAsync('DELETE FROM compras WHERE idcompra = ?', [compra.idcompra]);
            cargar();
          }
        }
      ]
    );
  };

  if (!articulo) return null;

  const ultimaCompra = compras[0];
  const totalComprado = compras.reduce((s, c) => s + c.cantidad, 0);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={{ padding: 16 }}>

      {/* ── INFO PRINCIPAL ── */}
      <View style={[styles.card, STYLES.shadow]}>
        {articulo.imagen
          ? <Image source={{ uri: articulo.imagen }} style={styles.img} />
          : <View style={styles.imgPlaceholder}><Text style={{ fontSize: 48 }}>📦</Text></View>
        }
        <Text style={styles.nombre}>{articulo.nombre}</Text>
        {articulo.marca ? (
          <View style={styles.marcaBadge}>
            <Text style={styles.marcaText}>🏷️ {articulo.marca}</Text>
          </View>
        ) : null}
        {articulo.detalle ? <Text style={styles.detalle}>{articulo.detalle}</Text> : null}

        <View style={[styles.stockBadge, { backgroundColor: stock > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.stockText, { color: stock > 0 ? COLORS.success : COLORS.danger }]}>
            {stock > 0 ? `✅ Stock: ${stock} unidades` : `❌ Sin stock (${stock})`}
          </Text>
        </View>

        {ultimaCompra && (
          <View style={styles.precios}>
            <PrecioItem label="Último precio compra" value={ultimaCompra.precio_compra} C={COLORS} />
            <PrecioItem label="Último precio envío" value={ultimaCompra.precio_envio} C={COLORS} />
            <PrecioItem label="Precio venta sugerido" value={ultimaCompra.precio_venta_sugerido} highlight C={COLORS} />
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.success }]}
            onPress={() => navigation.navigate('CompraForm', { idarticulo })}>
            <Text style={styles.btnText}>➕ Agregar Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('ArticuloForm', { articulo })}>
            <Text style={styles.btnText}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── RESUMEN RÁPIDO ── */}
      <View style={[styles.resumenGrid, STYLES.shadow]}>
        <View style={styles.resumenItem}>
          <Text style={styles.resumenValor}>{totalComprado}</Text>
          <Text style={styles.resumenLabel}>Unid. compradas</Text>
        </View>
        <View style={styles.resumenSep} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenValor, { color: COLORS.danger }]}>{ventaStats.totalUnidades}</Text>
          <Text style={styles.resumenLabel}>Unid. vendidas</Text>
        </View>
        <View style={styles.resumenSep} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenValor, { color: COLORS.success }]}>
            Bs. {Number(ventaStats.totalIngresos).toFixed(0)}
          </Text>
          <Text style={styles.resumenLabel}>Ingresos totales</Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'compras' && styles.tabActivo]} onPress={() => setTab('compras')}>
          <Text style={[styles.tabText, tab === 'compras' && styles.tabTextActivo]}>📥 Compras ({compras.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ventas' && styles.tabActivo]} onPress={() => setTab('ventas')}>
          <Text style={[styles.tabText, tab === 'ventas' && styles.tabTextActivo]}>📤 Ventas ({ventas.length})</Text>
        </TouchableOpacity>
      </View>

      {/* ── HISTORIAL COMPRAS ── */}
      {tab === 'compras' && (
        <>
          {compras.map(c => (
            <View key={c.idcompra} style={[styles.histCard, STYLES.shadow]}>
              <View style={styles.histHeader}>
                <Text style={styles.histFecha}>{c.fecha}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.cantBadge}><Text style={styles.cantText}>+{c.cantidad} unid.</Text></View>
                  <TouchableOpacity onPress={() => navigation.navigate('CompraForm', { idarticulo, idcompra: c.idcompra })}>
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarCompra(c)}>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.histRow}>
                <DataChip label="Compra" value={`Bs. ${Number(c.precio_compra).toFixed(2)}`} C={COLORS} />
                <DataChip label="Envío" value={`Bs. ${Number(c.precio_envio).toFixed(2)}`} C={COLORS} />
                <DataChip label="Venta sug." value={`Bs. ${Number(c.precio_venta_sugerido).toFixed(2)}`} highlight C={COLORS} />
              </View>
              {c.detalle ? <Text style={styles.histDetalle}>📝 {c.detalle}</Text> : null}
            </View>
          ))}
          {compras.length === 0 && <Text style={styles.empty}>Sin compras registradas</Text>}
        </>
      )}

      {/* ── HISTORIAL VENTAS ── */}
      {tab === 'ventas' && (
        <>
          {ventas.length > 0 && (
            <View style={styles.ventaResumen}>
              <Text style={styles.ventaResumenText}>
                Total ingresos: <Text style={{ fontWeight: '800', color: COLORS.success }}>
                  Bs. {Number(ventaStats.totalIngresos).toFixed(2)}
                </Text>
              </Text>
            </View>
          )}
          {ventas.map(v => {
            const bruto = v.cantidad * v.precio_venta;
            const ahorro = bruto - v.subtotal;
            return (
              <TouchableOpacity key={v.iddetalle} style={[styles.histCard, STYLES.shadow]}
                onPress={() => navigation.navigate('VentaDetail', { idventa: v.idventa })}>
                <View style={styles.histHeader}>
                  <View>
                    <Text style={styles.histCliente}>👤 {v.cliente_nombre}</Text>
                    <Text style={styles.histFecha}>{v.fecha}</Text>
                  </View>
                  <View style={styles.ventaBadge}><Text style={styles.ventaBadgeText}>Venta #{v.idventa}</Text></View>
                </View>
                <View style={styles.histRow}>
                  <DataChip label="Cantidad" value={`${v.cantidad} unid.`} C={COLORS} />
                  <DataChip label="Precio unit." value={`Bs. ${Number(v.precio_venta).toFixed(2)}`} C={COLORS} />
                  {v.descuento > 0 && <DataChip label="Descuento" value={`${Number(v.descuento).toFixed(0)}%`} danger C={COLORS} />}
                </View>
                {v.descuento > 0 && <Text style={styles.ahorroText}>Ahorro aplicado: Bs. {ahorro.toFixed(2)}</Text>}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal:</Text>
                  <Text style={styles.subtotalValor}>Bs. {Number(v.subtotal).toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {ventas.length === 0 && <Text style={styles.empty}>Este artículo no ha sido vendido aún</Text>}
        </>
      )}
    </ScrollView>
  );
}

function PrecioItem({ label, value, highlight, C }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ fontSize: 13, color: C.textLight }}>{label}</Text>
      <Text style={[{ fontSize: 13, color: C.text }, highlight && { color: C.success, fontWeight: 'bold' }]}>
        Bs. {Number(value || 0).toFixed(2)}
      </Text>
    </View>
  );
}

function DataChip({ label, value, highlight, danger, C }) {
  return (
    <View style={{ backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontSize: 10, color: C.textLight }}>{label}</Text>
      <Text style={[{ fontSize: 12, fontWeight: '700', color: C.text },
        highlight && { color: C.success },
        danger && { color: C.danger },
      ]}>{value}</Text>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 },
    img: { width: 120, height: 120, borderRadius: 12, marginBottom: 10 },
    imgPlaceholder: { width: 120, height: 120, borderRadius: 12, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    nombre: { fontSize: 20, fontWeight: 'bold', color: C.text, textAlign: 'center' },
    marcaBadge: { backgroundColor: '#F3E8FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 3, marginTop: 4 },
    marcaText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
    detalle: { fontSize: 13, color: C.textLight, marginTop: 4, textAlign: 'center' },
    stockBadge: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 },
    stockText: { fontSize: 14, fontWeight: '700' },
    precios: { alignSelf: 'stretch', marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },
    btn: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    resumenGrid: { backgroundColor: C.card, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    resumenItem: { flex: 1, alignItems: 'center' },
    resumenValor: { fontSize: 18, fontWeight: '800', color: C.primary },
    resumenLabel: { fontSize: 10, color: C.textLight, marginTop: 2, textAlign: 'center' },
    resumenSep: { width: 1, height: 36, backgroundColor: C.border },
    tabRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, marginBottom: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabActivo: { backgroundColor: C.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: C.textLight },
    tabTextActivo: { color: '#fff' },
    histCard: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8 },
    histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    histFecha: { fontSize: 11, color: C.textLight },
    histCliente: { fontSize: 13, fontWeight: '600', color: C.text },
    histRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
    histDetalle: { fontSize: 11, color: C.textLight, fontStyle: 'italic', marginTop: 4 },
    cantBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    cantText: { fontSize: 12, fontWeight: '700', color: C.success },
    ventaBadge: { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    ventaBadgeText: { fontSize: 11, fontWeight: '600', color: C.primary },
    ahorroText: { fontSize: 11, color: C.danger, marginBottom: 4 },
    subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border },
    subtotalLabel: { fontSize: 13, color: C.textLight, fontWeight: '600' },
    subtotalValor: { fontSize: 14, fontWeight: '800', color: C.success },
    ventaResumen: { backgroundColor: C.card, borderRadius: 8, padding: 10, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    ventaResumenText: { fontSize: 13, color: C.text },
    empty: { color: C.textLight, fontSize: 13, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  });
}
