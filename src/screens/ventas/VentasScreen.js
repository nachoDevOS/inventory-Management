/**
 * VentasScreen — Lista de ventas con filtros de fecha y botón venta directa
 *
 * Filtros: Hoy | Semana | Mes | Todo
 * FAB verde (+) abre VentaFormScreen para registrar venta directa.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

const FILTROS = [
  { key: 'hoy',    label: 'Hoy',    sql: `DATE(v.fecha,'localtime') = DATE('now','localtime')` },
  { key: 'semana', label: 'Semana', sql: `DATE(v.fecha,'localtime') >= DATE('now','localtime','-6 days')` },
  { key: 'mes',    label: 'Mes',    sql: `strftime('%Y-%m',v.fecha) = strftime('%Y-%m','now','localtime')` },
  { key: 'todo',   label: 'Todo',   sql: '1=1' },
];

export default function VentasScreen({ navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [ventas, setVentas] = useState([]);
  const [filtro, setFiltro] = useState('todo');

  const cargar = useCallback(async () => {
    const f = FILTROS.find(f => f.key === filtro);
    const rows = await db.getAllAsync(`
      SELECT v.*, c.nombre as cliente_nombre
      FROM ventas v JOIN clientes c ON c.idcliente=v.idcliente
      WHERE ${f.sql}
      ORDER BY v.idventa DESC
    `);
    setVentas(rows);
  }, [db, filtro]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0);

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

  return (
    <View style={styles.container}>
      {/* Filtros de fecha */}
      <View style={styles.filtrosRow}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filtroBtn, filtro === f.key && styles.filtroBtnActivo]}
            onPress={() => setFiltro(f.key)}
          >
            <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActivo]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumen del filtro activo */}
      {ventas.length > 0 && (
        <View style={styles.resumen}>
          <Text style={styles.resumenLabel}>{ventas.length} ventas</Text>
          <Text style={styles.resumenTotal}>Bs. {totalVentas.toFixed(2)}</Text>
        </View>
      )}

      <FlatList
        data={ventas}
        keyExtractor={item => String(item.idventa)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay ventas en este período</Text>}
      />

      {/* FAB — Venta directa */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('VentaForm')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    filtrosRow: { flexDirection: 'row', backgroundColor: C.card, padding: 6, gap: 4 },
    filtroBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    filtroBtnActivo: { backgroundColor: C.primary },
    filtroText: { fontSize: 13, fontWeight: '600', color: C.textLight },
    filtroTextActivo: { color: '#fff' },
    resumen: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.primary, padding: 12, paddingHorizontal: 16 },
    resumenLabel: { color: '#BFDBFE', fontSize: 13 },
    resumenTotal: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    card: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardId: { fontSize: 15, fontWeight: 'bold', color: C.text },
    proformaBadge: { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    proformaText: { fontSize: 11, color: C.primary, fontWeight: '600' },
    cliente: { fontSize: 13, color: C.textLight, marginBottom: 6 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    fecha: { fontSize: 12, color: C.textLight },
    total: { fontSize: 15, fontWeight: 'bold', color: C.success },
    empty: { textAlign: 'center', color: C.textLight, marginTop: 40, fontSize: 15 },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      backgroundColor: C.success, width: 56, height: 56,
      borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6,
    },
    fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  });
}
