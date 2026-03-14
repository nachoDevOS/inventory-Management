import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';
import { generarYCompartirPDF } from '../../utils/generarPdfProforma';

const ESTADO_COLOR = {
  pendiente: { bg: '#FEF3C7', text: '#D97706' },
  convertida: { bg: '#DBEAFE', text: '#2563EB' },
};

export default function ProformaDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { idproforma } = route.params;
  const [proforma, setProforma] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [items, setItems] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [negocio, setNegocio] = useState({});

  const cargar = useCallback(async () => {
    const rows = await db.getAllAsync(
      "SELECT clave, valor FROM configuracion WHERE clave IN ('nombre_negocio','telefono','direccion','nit')"
    );
    const map = {};
    rows.forEach(r => { map[r.clave] = r.valor; });
    setNegocio(map);
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
      const sv = await db.getAllAsync(
        'SELECT * FROM proforma_servicios WHERE idproforma = ?', [idproforma]
      );
      setServicios(sv);
    }
  }, [idproforma]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const exportarPDF = async () => {
    setGenerandoPDF(true);
    try {
      await generarYCompartirPDF({ proforma, cliente, items, servicios, negocio });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const eliminarProforma = () => {
    if (proforma?.estado === 'convertida') {
      Alert.alert(
        'No se puede eliminar',
        'Esta proforma ya fue convertida a venta. Primero elimina la venta asociada y luego podrás eliminar la proforma.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    Alert.alert('Eliminar Proforma', '¿Seguro que quieres eliminar esta proforma?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.runAsync('DELETE FROM proforma_detalle WHERE idproforma = ?', [idproforma]);
          await db.runAsync('DELETE FROM proforma_servicios WHERE idproforma = ?', [idproforma]);
          await db.runAsync('DELETE FROM proformas WHERE idproforma = ?', [idproforma]);
          navigation.goBack();
        }
      }
    ]);
  };

  const convertirAVenta = async () => {
    if (proforma?.estado === 'convertida') { Alert.alert('Info', 'Esta proforma ya fue convertida a venta'); return; }

    const stockActual = await db.getAllAsync(`
      SELECT pd.idarticulo, pd.cantidad, a.nombre,
        COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo = pd.idarticulo), 0) -
        COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = pd.idarticulo), 0) AS stock
      FROM proforma_detalle pd
      JOIN articulos a ON a.idarticulo = pd.idarticulo
      WHERE pd.idproforma = ?
    `, [idproforma]);

    for (const item of stockActual) {
      if (item.cantidad > item.stock) {
        Alert.alert(
          'Stock insuficiente',
          `No se puede convertir a venta.\n\n"${item.nombre}" necesita ${item.cantidad} unidad(es) pero solo hay ${item.stock} en stock.\n\nEdita la proforma o espera reponer el stock.`
        );
        return;
      }
    }

    Alert.alert('Convertir a Venta', '¿Convertir esta proforma en una venta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          const totalItems = items.reduce((s, i) => s + i.subtotal, 0);
          const totalServicios = servicios.reduce((s, sv) => s + sv.subtotal, 0);
          const total = totalItems + totalServicios;
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
          for (const sv of servicios) {
            await db.runAsync(
              'INSERT INTO venta_servicios (idventa, nombre, cantidad, precio, descuento, subtotal) VALUES (?,?,?,?,?,?)',
              [idventa, sv.nombre, sv.cantidad, sv.precio, sv.descuento || 0, sv.subtotal]
            );
          }
          await db.runAsync('UPDATE proformas SET estado = ? WHERE idproforma = ?', ['convertida', idproforma]);
          navigation.navigate('Ventas', { screen: 'VentaDetail', params: { idventa } });
        }
      }
    ]);
  };

  if (!proforma || !cliente) return null;

  const totalItems = items.reduce((s, i) => s + i.subtotal, 0);
  const totalServicios = servicios.reduce((s, sv) => s + sv.subtotal, 0);
  const total = totalItems + totalServicios;
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

      {items.length > 0 && (
        <>
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
                    <View style={styles.descuentoBadge}><Text style={styles.descuentoText}>{sv.descuento}% desc.</Text></View>
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
        const brutoItems = items.reduce((s, i) => s + i.cantidad * i.precio_cotizacion, 0);
        const brutoServ = servicios.reduce((s, sv) => s + sv.cantidad * sv.precio, 0);
        const brutoTotal = brutoItems + brutoServ;
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
        <TouchableOpacity style={styles.btnEditar} onPress={() => navigation.navigate('ProformaForm', { idproforma })}>
          <Text style={styles.btnEditarText}>✏️ Editar Proforma</Text>
        </TouchableOpacity>
      )}

      {proforma.estado !== 'convertida' && (
        <TouchableOpacity style={styles.btnConvertir} onPress={convertirAVenta}>
          <Text style={styles.btnConvertirText}>💰 Convertir a Venta</Text>
        </TouchableOpacity>
      )}

      {proforma.estado === 'convertida' && (
        <View style={styles.convertidaBadge}>
          <Text style={styles.convertidaText}>✅ Esta proforma fue convertida a venta</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btnEliminar} onPress={eliminarProforma}>
        <Text style={styles.btnEliminarText}>🗑️ Eliminar Proforma</Text>
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
    estadoBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
    estadoText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
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
    totalValor: { fontSize: 20, fontWeight: 'bold', color: C.primary },
    btnConvertir: { backgroundColor: C.success, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
    btnConvertirText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    convertidaBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
    convertidaText: { color: C.success, fontWeight: '600', fontSize: 14 },
    btnPDF: { backgroundColor: '#7C3AED', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 12 },
    btnPDFText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    btnEditar: { backgroundColor: C.card, borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: C.primary },
    btnEditarText: { color: C.primary, fontWeight: 'bold', fontSize: 15 },
    btnEliminar: { borderWidth: 1, borderColor: C.danger, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
    btnEliminarText: { color: C.danger, fontWeight: '600', fontSize: 14 },
  });
}
