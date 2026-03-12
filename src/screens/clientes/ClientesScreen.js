import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Linking
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

export default function ClientesScreen({ navigation }) {
  const db = useSQLiteContext();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const cargarClientes = useCallback(async () => {
    const rows = await db.getAllAsync(
      `SELECT * FROM clientes WHERE nombre LIKE ? OR carnet_identidad LIKE ? ORDER BY nombre ASC`,
      [`%${busqueda}%`, `%${busqueda}%`]
    );
    setClientes(rows);
  }, [db, busqueda]);

  useFocusEffect(useCallback(() => { cargarClientes(); }, [cargarClientes]));

  const eliminar = (cliente) => {
    Alert.alert('Eliminar', `¿Eliminar a ${cliente.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.runAsync('DELETE FROM clientes WHERE idcliente = ?', [cliente.idcliente]);
          cargarClientes();
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, STYLES.shadow]}
      onPress={() => navigation.navigate('ClienteDetail', { idcliente: item.idcliente })}
    >
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.nombre[0].toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          {item.carnet_identidad ? <Text style={styles.sub}>CI: {item.carnet_identidad}</Text> : null}
          {item.celular ? <Text style={styles.sub}>📱 {item.celular}</Text> : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => navigation.navigate('ClienteForm', { cliente: item })}>
            <Text style={styles.btnEdit}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => eliminar(item)}>
            <Text style={styles.btnDelete}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar por nombre o CI..."
        value={busqueda}
        onChangeText={setBusqueda}
        onSubmitEditing={cargarClientes}
      />
      <FlatList
        data={clientes}
        keyExtractor={(item) => String(item.idcliente)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay clientes registrados</Text>}
        ListFooterComponent={
          <TouchableOpacity style={styles.footer} onPress={() => Linking.openURL('https://www.soluciondigital.dev/')}>
            <Text style={styles.footerApp}>Inventory Management</Text>
            <Text style={styles.footerText}>Desarrollado por Solución Digital</Text>
            <Text style={styles.footerLink}>www.soluciondigital.dev</Text>
          </TouchableOpacity>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ClienteForm', {})}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  search: {
    margin: 12, padding: 10, backgroundColor: COLORS.card,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.card, marginHorizontal: 12, marginBottom: 8,
    borderRadius: 10, padding: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  cardInfo: { flex: 1, marginLeft: 12 },
  nombre: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  btnEdit: { fontSize: 20, padding: 4 },
  btnDelete: { fontSize: 20, padding: 4 },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: COLORS.primary, width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    ...STYLES.shadow, elevation: 6,
  },
  fabText: { color: COLORS.white, fontSize: 28, lineHeight: 32 },
  footer: { alignItems: 'center', paddingVertical: 20, paddingBottom: 8 },
  footerApp: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  footerText: { fontSize: 11, color: COLORS.textLight },
  footerLink: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
});
