import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

export default function ClienteDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { idcliente } = route.params;
  const [cliente, setCliente] = useState(null);
  const [proformas, setProformas] = useState([]);
  const [ventas, setVentas] = useState([]);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      const c = await db.getFirstAsync('SELECT * FROM clientes WHERE idcliente = ?', [idcliente]);
      setCliente(c);
      const p = await db.getAllAsync(
        'SELECT * FROM proformas WHERE idcliente = ? ORDER BY fecha DESC', [idcliente]
      );
      setProformas(p);
      const v = await db.getAllAsync(
        'SELECT * FROM ventas WHERE idcliente = ? ORDER BY fecha DESC', [idcliente]
      );
      setVentas(v);
    };
    cargar();
  }, [idcliente]));

  if (!cliente) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{cliente.nombre[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.nombre}>{cliente.nombre}</Text>
        {cliente.carnet_identidad ? <InfoRow icon="🪪" label="CI" value={cliente.carnet_identidad} /> : null}
        {cliente.celular ? <InfoRow icon="📱" label="Celular" value={cliente.celular} /> : null}
        {cliente.correo ? <InfoRow icon="📧" label="Correo" value={cliente.correo} /> : null}
        {cliente.contacto_referencia ? <InfoRow icon="👤" label="Referencia" value={cliente.contacto_referencia} /> : null}
        {cliente.detalle ? <InfoRow icon="📝" label="Detalle" value={cliente.detalle} /> : null}

        <TouchableOpacity
          style={styles.btnEditar}
          onPress={() => navigation.navigate('ClienteForm', { cliente })}
        >
          <Text style={styles.btnEditarText}>✏️ Editar Cliente</Text>
        </TouchableOpacity>
      </View>

      <SectionTitle title="Proformas" count={proformas.length} />
      {proformas.map(p => (
        <TouchableOpacity
          key={p.idproforma}
          style={[styles.miniCard, STYLES.shadow]}
          onPress={() => navigation.navigate('Proformas', { screen: 'ProformaDetail', params: { idproforma: p.idproforma } })}
        >
          <Text style={styles.miniCardTitle}>Proforma #{p.idproforma}</Text>
          <Text style={styles.miniCardSub}>{p.fecha} — <Text style={[styles.estado, estadoColor(p.estado)]}>{p.estado}</Text></Text>
        </TouchableOpacity>
      ))}
      {proformas.length === 0 && <Text style={styles.empty}>Sin proformas</Text>}

      <SectionTitle title="Ventas" count={ventas.length} />
      {ventas.map(v => (
        <TouchableOpacity
          key={v.idventa}
          style={[styles.miniCard, STYLES.shadow]}
          onPress={() => navigation.navigate('Ventas', { screen: 'VentaDetail', params: { idventa: v.idventa } })}
        >
          <Text style={styles.miniCardTitle}>Venta #{v.idventa}</Text>
          <Text style={styles.miniCardSub}>{v.fecha} — Total: Bs. {Number(v.total).toFixed(2)}</Text>
        </TouchableOpacity>
      ))}
      {ventas.length === 0 && <Text style={styles.empty}>Sin ventas</Text>}
    </ScrollView>
  );
}

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{icon} {label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const SectionTitle = ({ title, count }) => (
  <Text style={styles.sectionTitle}>{title} ({count})</Text>
);

const estadoColor = (estado) => {
  if (estado === 'convertida') return { color: COLORS.success };
  if (estado === 'rechazada') return { color: COLORS.danger };
  return { color: COLORS.warning };
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  avatarText: { color: COLORS.white, fontSize: 28, fontWeight: 'bold' },
  nombre: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 6, alignSelf: 'stretch' },
  infoLabel: { fontSize: 13, color: COLORS.textLight, width: 100, fontWeight: '600' },
  infoValue: { fontSize: 13, color: COLORS.text, flex: 1 },
  btnEditar: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 24, marginTop: 12,
  },
  btnEditarText: { color: COLORS.white, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  miniCard: {
    backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 6,
  },
  miniCardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  miniCardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  estado: { fontWeight: '600' },
  empty: { color: COLORS.textLight, fontSize: 13, marginBottom: 8 },
});
