import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

export default function VentaDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { idventa } = route.params;
  const [venta, setVenta] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [items, setItems] = useState([]);
  const [servicios, setServicios] = useState([]);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      const v = await db.getFirstAsync('SELECT * FROM ventas WHERE idventa = ?', [idventa]);
      setVenta(v);
      if (v) {
        const c = await db.getFirstAsync('SELECT * FROM clientes WHERE idcliente = ?', [v.idcliente]);
        setCliente(c);
        const it = await db.getAllAsync(`
          SELECT vd.*, a.nombre as articulo_nombre
          FROM venta_detalle vd
          JOIN articulos a ON a.idarticulo = vd.idarticulo
          WHERE vd.idventa = ?
        `, [idventa]);
        setItems(it);
        const sv = await db.getAllAsync(
          'SELECT * FROM venta_servicios WHERE idventa = ?', [idventa]
        );
        setServicios(sv);
      }
    };
    cargar();
  }, [idventa]));

  const eliminarVenta = () => {
    Alert.alert('Eliminar Venta', '¿Seguro que quieres eliminar esta venta? Se restaurará el stock.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.runAsync('DELETE FROM venta_detalle WHERE idventa = ?', [idventa]);
          await db.runAsync('DELETE FROM venta_servicios WHERE idventa = ?', [idventa]);
          await db.runAsync('DELETE FROM ventas WHERE idventa = ?', [idventa]);
          if (venta?.idproforma) {
            await db.runAsync('UPDATE proformas SET estado = ? WHERE idproforma = ?', ['aprobada', venta.idproforma]);
          }
          navigation.goBack();
        }
      }
    ]);
  };

  if (!venta || !cliente) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>Venta #{venta.idventa}</Text>
          <View style={styles.ventaBadge}>
            <Text style={styles.ventaBadgeText}>✅ VENTA</Text>
          </View>
        </View>
        <InfoRow label="Cliente" value={cliente.nombre} S={styles} />
        {cliente.celular ? <InfoRow label="Celular" value={cliente.celular} S={styles} /> : null}
        <InfoRow label="Fecha" value={venta.fecha} S={styles} />
        {venta.idproforma ? <InfoRow label="Proforma" value={`#${venta.idproforma}`} S={styles} /> : null}
        {venta.detalle ? <InfoRow label="Detalle" value={venta.detalle} S={styles} /> : null}
      </View>

      {items.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Artículos vendidos</Text>
          {items.map(item => {
            const bruto = item.cantidad * item.precio_venta;
            const ahorrado = bruto - item.subtotal;
            return (
              <View key={item.iddetalle} style={[styles.itemCard, STYLES.shadow]}>
                <Text style={styles.itemNombre}>{item.articulo_nombre}</Text>
                <View style={styles.itemRow}>
                  <Text style={styles.itemSub}>Cant: {item.cantidad}</Text>
                  <Text style={styles.itemSub}>Precio: Bs. {Number(item.precio_venta).toFixed(2)}</Text>
                  {item.descuento > 0 && (
                    <View style={styles.descuentoBadge}>
                      <Text style={styles.descuentoText}>{item.descuento}% desc.</Text>
                    </View>
                  )}
                </View>
                {item.descuento > 0 && <Text style={styles.ahorroText}>Ahorro: Bs. {ahorrado.toFixed(2)}</Text>}
                <Text style={styles.itemSubtotal}>Subtotal: Bs. {Number(item.subtotal).toFixed(2)}</Text>
              </View>
            );
          })}
        </>
      )}

      {servicios.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Servicios</Text>
          {servicios.map(sv => {
            const bruto = sv.cantidad * sv.precio;
            const ahorrado = bruto - sv.subtotal;
            return (
              <View key={sv.idservicio} style={[styles.itemCard, styles.servicioCard, STYLES.shadow]}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemNombre}>{sv.nombre}</Text>
                  <View style={styles.servicioBadge}><Text style={styles.servicioBadgeText}>SERVICIO</Text></View>
                </View>
                <View style={styles.itemRow}>
                  <Text style={styles.itemSub}>Cant: {sv.cantidad}</Text>
                  <Text style={styles.itemSub}>Precio: Bs. {Number(sv.precio).toFixed(2)}</Text>
                  {sv.descuento > 0 && (
                    <View style={styles.descuentoBadge}>
                      <Text style={styles.descuentoText}>{sv.descuento}% desc.</Text>
                    </View>
                  )}
                </View>
                {sv.descuento > 0 && <Text style={styles.ahorroText}>Ahorro: Bs. {ahorrado.toFixed(2)}</Text>}
                <Text style={styles.itemSubtotal}>Subtotal: Bs. {Number(sv.subtotal).toFixed(2)}</Text>
              </View>
            );
          })}
        </>
      )}

      {(() => {
        const brutoItems = items.reduce((s, i) => s + i.cantidad * i.precio_venta, 0);
        const brutoServ = servicios.reduce((s, sv) => s + sv.cantidad * sv.precio, 0);
        const brutoTotal = brutoItems + brutoServ;
        const descTotal = brutoTotal - venta.total;
        return (
          <View style={styles.totalContainer}>
            {descTotal > 0.001 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabelSub}>Subtotal bruto:</Text>
                  <Text style={styles.totalValorSub}>Bs. {brutoTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabelSub, { color: COLORS.danger }]}>Descuentos:</Text>
                  <Text style={[styles.totalValorSub, { color: COLORS.danger }]}>- Bs. {descTotal.toFixed(2)}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 6 }} />
              </>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValor}>Bs. {Number(venta.total).toFixed(2)}</Text>
            </View>
          </View>
        );
      })()}

      <TouchableOpacity
        style={styles.btnVerCliente}
        onPress={() => navigation.navigate('Clientes', { screen: 'ClienteDetail', params: { idcliente: cliente.idcliente } })}
      >
        <Text style={styles.btnVerClienteText}>👤 Ver Perfil del Cliente</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnEliminar} onPress={eliminarVenta}>
        <Text style={styles.btnEliminarText}>🗑️ Eliminar Venta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const InfoRow = ({ label, value, S }) => (
  <View style={S.infoRow}>
    <Text style={S.infoLabel}>{label}:</Text>
    <Text style={S.infoValue}>{value}</Text>
  </View>
);

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    card: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 14 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardId: { fontSize: 18, fontWeight: 'bold', color: C.text },
    ventaBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
    ventaBadgeText: { fontSize: 11, fontWeight: '700', color: C.success },
    infoRow: { flexDirection: 'row', marginBottom: 4 },
    infoLabel: { fontSize: 13, color: C.textLight, width: 70, fontWeight: '600' },
    infoValue: { fontSize: 13, color: C.text, flex: 1 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: C.text, marginBottom: 8 },
    itemCard: { backgroundColor: C.card, borderRadius: 8, padding: 10, marginBottom: 6 },
    servicioCard: { borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
    itemNombre: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4, flex: 1 },
    itemRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
    itemSub: { fontSize: 12, color: C.textLight },
    descuentoBadge: { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    descuentoText: { fontSize: 11, color: C.danger, fontWeight: '700' },
    ahorroText: { fontSize: 11, color: C.danger, marginBottom: 2 },
    itemSubtotal: { fontSize: 13, fontWeight: 'bold', color: C.success, marginTop: 2 },
    servicioBadge: { backgroundColor: '#EDE9FE', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    servicioBadgeText: { fontSize: 10, color: '#7C3AED', fontWeight: '700' },
    totalContainer: { backgroundColor: C.card, borderRadius: 8, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    totalLabelSub: { fontSize: 13, color: C.textLight },
    totalValorSub: { fontSize: 13, color: C.textLight },
    totalLabel: { fontSize: 16, fontWeight: '600', color: C.text },
    totalValor: { fontSize: 20, fontWeight: 'bold', color: C.success },
    btnVerCliente: { backgroundColor: C.primary, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
    btnVerClienteText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    btnEliminar: { borderWidth: 1, borderColor: C.danger, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
    btnEliminarText: { color: C.danger, fontWeight: '600', fontSize: 14 },
  });
}
