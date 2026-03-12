import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';
import { generarYCompartirPDF } from '../../utils/generarPdfProforma';

const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'convertida'];
const ESTADO_COLOR = {
  pendiente: { bg: '#FEF3C7', text: '#D97706' },
  aprobada: { bg: '#DCFCE7', text: '#16A34A' },
  convertida: { bg: '#DBEAFE', text: '#2563EB' },
  rechazada: { bg: '#FEE2E2', text: '#DC2626' },
};

export default function ProformaDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { idproforma } = route.params;
  const [proforma, setProforma] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [items, setItems] = useState([]);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const cargar = useCallback(async () => {
    const p = await db.getFirstAsync('SELECT * FROM proformas WHERE idproforma = ?', [idproforma]);
    setProforma(p);
    if (p) {
      const c = await db.getFirstAsync('SELECT * FROM clientes WHERE idcliente = ?', [p.idcliente]);
      setCliente(c);
      const it = await db.getAllAsync(`
        SELECT pd.*, a.nombre as articulo_nombre
        FROM proforma_detalle pd
        JOIN articulos a ON a.idarticulo = pd.idarticulo
        WHERE pd.idproforma = ?
      `, [idproforma]);
      setItems(it);
    }
  }, [idproforma]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const exportarPDF = async () => {
    setGenerandoPDF(true);
    try {
      await generarYCompartirPDF({ proforma, cliente, items });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const cambiarEstado = (nuevoEstado) => {
    Alert.alert('Cambiar Estado', `¿Cambiar a "${nuevoEstado}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => { await db.runAsync('UPDATE proformas SET estado = ? WHERE idproforma = ?', [nuevoEstado, idproforma]); cargar(); } }
    ]);
  };

  const convertirAVenta = async () => {
    if (proforma?.estado === 'convertida') { Alert.alert('Info', 'Esta proforma ya fue convertida a venta'); return; }
    Alert.alert('Convertir a Venta', '¿Convertir esta proforma en una venta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          const total = items.reduce((s, i) => s + i.subtotal, 0);
          const result = await db.runAsync(
            'INSERT INTO ventas (idproforma, idcliente, total, detalle) VALUES (?,?,?,?)',
            [idproforma, proforma.idcliente, total, proforma.detalle]
          );
          const idventa = result.lastInsertRowId;
          for (const item of items) {
            await db.runAsync(
              'INSERT INTO venta_detalle (idventa, idarticulo, cantidad, precio_venta, descuento, subtotal) VALUES (?,?,?,?,?,?)',
              [idventa, item.idarticulo, item.cantidad, item.precio_cotizacion, item.descuento || 0, item.subtotal]
            );
          }
          await db.runAsync('UPDATE proformas SET estado = ? WHERE idproforma = ?', ['convertida', idproforma]);
          navigation.navigate('Ventas', { screen: 'VentaDetail', params: { idventa } });
        }
      }
    ]);
  };

  if (!proforma || !cliente) return null;

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const ec = ESTADO_COLOR[proforma.estado] || ESTADO_COLOR.pendiente;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>Proforma #{proforma.idproforma}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: ec.bg }]}>
            <Text style={[styles.estadoText, { color: ec.text }]}>{proforma.estado}</Text>
          </View>
        </View>
        <InfoRow label="Cliente" value={cliente.nombre} S={styles} />
        {cliente.celular ? <InfoRow label="Celular" value={cliente.celular} S={styles} /> : null}
        <InfoRow label="Fecha" value={proforma.fecha} S={styles} />
        {proforma.detalle ? <InfoRow label="Detalle" value={proforma.detalle} S={styles} /> : null}
      </View>

      <Text style={styles.sectionTitle}>Artículos</Text>
      {items.map(item => {
        const bruto = item.cantidad * item.precio_cotizacion;
        const ahorrado = bruto - item.subtotal;
        return (
          <View key={item.iddetalle} style={[styles.itemCard, STYLES.shadow]}>
            <Text style={styles.itemNombre}>{item.articulo_nombre}</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemSub}>Cant: {item.cantidad}</Text>
              <Text style={styles.itemSub}>Precio: Bs. {Number(item.precio_cotizacion).toFixed(2)}</Text>
              {item.descuento > 0 && (
                <View style={styles.descuentoBadge}><Text style={styles.descuentoText}>{item.descuento}% desc.</Text></View>
              )}
            </View>
            {item.descuento > 0 && <Text style={styles.ahorroText}>Ahorro: Bs. {ahorrado.toFixed(2)}</Text>}
            <Text style={styles.itemSubtotal}>Subtotal: Bs. {Number(item.subtotal).toFixed(2)}</Text>
          </View>
        );
      })}

      {(() => {
        const brutoTotal = items.reduce((s, i) => s + i.cantidad * i.precio_cotizacion, 0);
        const descuentoTotal = brutoTotal - total;
        return (
          <View style={styles.totalContainer}>
            {descuentoTotal > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabelSub}>Subtotal bruto:</Text>
                  <Text style={styles.totalValorSub}>Bs. {brutoTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabelSub, { color: COLORS.danger }]}>Descuentos:</Text>
                  <Text style={[styles.totalValorSub, { color: COLORS.danger }]}>- Bs. {descuentoTotal.toFixed(2)}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 6 }} />
              </>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValor}>Bs. {total.toFixed(2)}</Text>
            </View>
          </View>
        );
      })()}

      <TouchableOpacity style={[styles.btnPDF, generandoPDF && { opacity: 0.7 }]} onPress={exportarPDF} disabled={generandoPDF}>
        {generandoPDF ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPDFText}>📄 Exportar PDF / Compartir</Text>}
      </TouchableOpacity>

      {proforma.estado !== 'convertida' && (
        <>
          <Text style={styles.sectionTitle}>Cambiar Estado</Text>
          <View style={styles.estadosRow}>
            {ESTADOS.filter(e => e !== proforma.estado && e !== 'convertida').map(e => {
              const ec2 = ESTADO_COLOR[e];
              return (
                <TouchableOpacity key={e} style={[styles.estadoBtn, { backgroundColor: ec2.bg }]} onPress={() => cambiarEstado(e)}>
                  <Text style={[styles.estadoBtnText, { color: ec2.text }]}>{e}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.btnConvertir} onPress={convertirAVenta}>
            <Text style={styles.btnConvertirText}>💰 Convertir a Venta</Text>
          </TouchableOpacity>
        </>
      )}

      {proforma.estado === 'convertida' && (
        <View style={styles.convertidaBadge}>
          <Text style={styles.convertidaText}>✅ Esta proforma fue convertida a venta</Text>
        </View>
      )}
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
    estadoBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
    estadoText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    infoRow: { flexDirection: 'row', marginBottom: 4 },
    infoLabel: { fontSize: 13, color: C.textLight, width: 70, fontWeight: '600' },
    infoValue: { fontSize: 13, color: C.text, flex: 1 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: C.text, marginBottom: 8 },
    itemCard: { backgroundColor: C.card, borderRadius: 8, padding: 10, marginBottom: 6 },
    itemNombre: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
    itemRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
    itemSub: { fontSize: 12, color: C.textLight },
    descuentoBadge: { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    descuentoText: { fontSize: 11, color: C.danger, fontWeight: '700' },
    ahorroText: { fontSize: 11, color: C.danger, marginBottom: 2 },
    itemSubtotal: { fontSize: 13, fontWeight: 'bold', color: C.success, marginTop: 2 },
    totalContainer: { backgroundColor: C.card, borderRadius: 8, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    totalLabelSub: { fontSize: 13, color: C.textLight },
    totalValorSub: { fontSize: 13, color: C.textLight },
    totalLabel: { fontSize: 16, fontWeight: '600', color: C.text },
    totalValor: { fontSize: 20, fontWeight: 'bold', color: C.primary },
    estadosRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    estadoBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    estadoBtnText: { fontSize: 13, fontWeight: '600' },
    btnConvertir: { backgroundColor: C.success, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
    btnConvertirText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    convertidaBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
    convertidaText: { color: C.success, fontWeight: '600', fontSize: 14 },
    btnPDF: { backgroundColor: '#7C3AED', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 12 },
    btnPDFText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  });
}
