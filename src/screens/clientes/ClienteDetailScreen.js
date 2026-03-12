import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

export default function ClienteDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
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

  const estadoColor = (estado) => {
    if (estado === 'convertida') return { color: COLORS.success };
    if (estado === 'rechazada') return { color: COLORS.danger };
    return { color: COLORS.warning };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{cliente.nombre[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.nombre}>{cliente.nombre}</Text>
        {cliente.carnet_identidad ? <InfoRow icon="🪪" label="CI" value={cliente.carnet_identidad} S={styles} /> : null}
        {cliente.celular ? <InfoRow icon="📱" label="Celular" value={cliente.celular} S={styles} /> : null}
        {cliente.correo ? <InfoRow icon="📧" label="Correo" value={cliente.correo} S={styles} /> : null}
        {cliente.contacto_referencia ? <InfoRow icon="👤" label="Referencia" value={cliente.contacto_referencia} S={styles} /> : null}
        {cliente.detalle ? <InfoRow icon="📝" label="Detalle" value={cliente.detalle} S={styles} /> : null}

        <TouchableOpacity
          style={styles.btnEditar}
          onPress={() => navigation.navigate('ClienteForm', { cliente })}
        >
          <Text style={styles.btnEditarText}>✏️ Editar Cliente</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Proformas ({proformas.length})</Text>
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

      <Text style={styles.sectionTitle}>Ventas ({ventas.length})</Text>
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

const InfoRow = ({ icon, label, value, S }) => (
  <View style={S.infoRow}>
    <Text style={S.infoLabel}>{icon} {label}:</Text>
    <Text style={S.infoValue}>{value}</Text>
  </View>
);

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    card: {
      backgroundColor: C.card, borderRadius: 12, padding: 16,
      alignItems: 'center', marginBottom: 16,
    },
    avatar: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
    nombre: { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 12 },
    infoRow: { flexDirection: 'row', marginBottom: 6, alignSelf: 'stretch' },
    infoLabel: { fontSize: 13, color: C.textLight, width: 100, fontWeight: '600' },
    infoValue: { fontSize: 13, color: C.text, flex: 1 },
    btnEditar: {
      backgroundColor: C.primary, borderRadius: 8,
      paddingVertical: 10, paddingHorizontal: 24, marginTop: 12,
    },
    btnEditarText: { color: '#fff', fontWeight: 'bold' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: C.text, marginBottom: 8, marginTop: 4 },
    miniCard: {
      backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 6,
    },
    miniCardTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    miniCardSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
    estado: { fontWeight: '600' },
    empty: { color: C.textLight, fontSize: 13, marginBottom: 8 },
  });
}
