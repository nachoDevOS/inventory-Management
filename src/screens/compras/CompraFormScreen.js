import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

/**
 * CompraFormScreen — Registro de compras / entrada de stock
 *
 * Fórmula de ganancia por unidad:
 *   costo_envio_unit = precio_envio / cantidad
 *   costo_unit       = precio_compra + costo_envio_unit
 *   ganancia_unit    = precio_venta_sugerido - costo_unit
 *   margen_%         = (ganancia_unit / costo_unit) * 100
 */
export default function CompraFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { idarticulo } = route.params;
  const [articulo, setArticulo] = useState(null);
  const [form, setForm] = useState({
    cantidad: '1',
    precio_compra: '',
    precio_envio: '0',
    precio_venta_sugerido: '',
    detalle: '',
  });

  useEffect(() => {
    db.getFirstAsync('SELECT * FROM articulos WHERE idarticulo = ?', [idarticulo]).then(setArticulo);
  }, [idarticulo]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const cantidad        = Math.max(parseInt(form.cantidad) || 1, 1);
  const precioCompra    = parseFloat(form.precio_compra) || 0;
  const precioEnvio     = parseFloat(form.precio_envio) || 0;
  const precioVenta     = parseFloat(form.precio_venta_sugerido) || 0;

  const envioXUnidad    = precioEnvio / cantidad;
  const costoXUnidad    = precioCompra + envioXUnidad;
  const costoTotalLote  = costoXUnidad * cantidad;
  const gananciaXUnidad = precioVenta - costoXUnidad;
  const gananciaTotalLote = gananciaXUnidad * cantidad;
  const margenPct       = costoXUnidad > 0 ? (gananciaXUnidad / costoXUnidad) * 100 : 0;

  const hayVenta = precioVenta > 0 && precioCompra > 0;
  const esGanancia = gananciaXUnidad >= 0;

  const guardar = async () => {
    if (!cantidad || cantidad <= 0) { Alert.alert('Error', 'La cantidad debe ser mayor a 0'); return; }
    if (isNaN(precioCompra) || precioCompra < 0) { Alert.alert('Error', 'Ingresa un precio de compra válido'); return; }
    await db.runAsync(
      `INSERT INTO compras (idarticulo, cantidad, precio_compra, precio_envio, precio_venta_sugerido, detalle) VALUES (?,?,?,?,?,?)`,
      [idarticulo, cantidad, precioCompra, precioEnvio, precioVenta || 0, form.detalle]
    );
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>

      {articulo && (
        <View style={styles.articuloInfo}>
          <Text style={styles.articuloLabel}>Artículo</Text>
          <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
        </View>
      )}

      <Campo label="Cantidad *" value={form.cantidad} onChangeText={v => set('cantidad', v)}
        keyboardType="numeric" placeholder="1" hint="Número de unidades que compraste" S={styles} C={COLORS} />
      <Campo label="Precio de Compra por Unidad (Bs.) *" value={form.precio_compra}
        onChangeText={v => set('precio_compra', v)} keyboardType="decimal-pad" placeholder="0.00"
        hint="Costo individual de cada unidad" S={styles} C={COLORS} />
      <Campo label="Precio de Envío Total (Bs.)" value={form.precio_envio}
        onChangeText={v => set('precio_envio', v)} keyboardType="decimal-pad" placeholder="0.00"
        hint={`Se divide entre ${cantidad} unid. → Bs. ${envioXUnidad.toFixed(2)} por unidad`} S={styles} C={COLORS} />
      <Campo label="Precio de Venta Sugerido (Bs.)" value={form.precio_venta_sugerido}
        onChangeText={v => set('precio_venta_sugerido', v)} keyboardType="decimal-pad" placeholder="0.00"
        hint="Precio al que planeas vender cada unidad" S={styles} C={COLORS} />
      <Campo label="Detalle / Observaciones" value={form.detalle} onChangeText={v => set('detalle', v)}
        placeholder="Notas de la compra (proveedor, número de factura, etc.)" multiline numberOfLines={2} S={styles} C={COLORS} />

      {/* ── Resumen de costos ── */}
      <View style={[styles.resumenCosto, STYLES.shadow]}>
        <Text style={styles.resumenTitulo}>💼 Resumen de Costos</Text>
        <FilaCalculo label="Precio compra por unidad" valor={`Bs. ${precioCompra.toFixed(2)}`} S={styles} />
        <FilaCalculo label={`Envío (Bs. ${precioEnvio.toFixed(2)} ÷ ${cantidad} unid.)`} valor={`Bs. ${envioXUnidad.toFixed(2)}`} S={styles} />
        <View style={styles.separador} />
        <FilaCalculo label="Costo real por unidad" valor={`Bs. ${costoXUnidad.toFixed(2)}`} negrita S={styles} />
        <FilaCalculo label={`Costo total del lote (×${cantidad})`} valor={`Bs. ${costoTotalLote.toFixed(2)}`} negrita S={styles} />
      </View>

      {/* ── Calculadora de ganancia ── */}
      {hayVenta && (
        <View style={[styles.resumenGanancia, STYLES.shadow, { borderLeftColor: esGanancia ? COLORS.success : COLORS.danger }]}>
          <Text style={styles.resumenTitulo}>
            {esGanancia ? '📈 Análisis de Ganancia' : '📉 Análisis de Pérdida'}
          </Text>

          <FilaCalculo label="Precio de venta" valor={`Bs. ${precioVenta.toFixed(2)}`} S={styles} />
          <FilaCalculo label="Costo real por unidad" valor={`Bs. ${costoXUnidad.toFixed(2)}`} S={styles} />
          <View style={styles.separador} />

          <View style={styles.gananciaDestacada}>
            <Text style={styles.gananciaTituloChip}>Por cada unidad vendida</Text>
            <View style={styles.gananciaChipRow}>
              <View style={[styles.gananciaChip, { backgroundColor: esGanancia ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[styles.gananciaChipValor, { color: esGanancia ? COLORS.success : COLORS.danger }]}>
                  {esGanancia ? '+' : ''}Bs. {gananciaXUnidad.toFixed(2)}
                </Text>
                <Text style={[styles.gananciaChipLabel, { color: esGanancia ? COLORS.success : COLORS.danger }]}>ganancia</Text>
              </View>
              <View style={[styles.gananciaChip, { backgroundColor: esGanancia ? '#EFF6FF' : '#FEF3C7' }]}>
                <Text style={[styles.gananciaChipValor, { color: esGanancia ? COLORS.primary : COLORS.warning }]}>
                  {margenPct.toFixed(1)}%
                </Text>
                <Text style={[styles.gananciaChipLabel, { color: esGanancia ? COLORS.primary : COLORS.warning }]}>margen</Text>
              </View>
            </View>
          </View>

          <View style={styles.separador} />
          <Text style={styles.gananciaTituloChip}>Si vendes todo el lote ({cantidad} unid.)</Text>
          <View style={styles.gananciaChipRow}>
            <View style={[styles.gananciaChipGrande, { backgroundColor: esGanancia ? '#F0FDF4' : '#FEF2F2', borderColor: esGanancia ? '#BBF7D0' : '#FECACA' }]}>
              <Text style={[styles.gananciaChipGrandeValor, { color: esGanancia ? COLORS.success : COLORS.danger }]}>
                {esGanancia ? '+' : ''}Bs. {gananciaTotalLote.toFixed(2)}
              </Text>
              <Text style={styles.gananciaChipGrandeLabel}>ganancia total estimada</Text>
            </View>
          </View>

          {!esGanancia && (
            <View style={styles.advertencia}>
              <Text style={styles.advertenciaText}>
                ⚠️ El precio de venta (Bs. {precioVenta.toFixed(2)}) es menor al costo real por unidad (Bs. {costoXUnidad.toFixed(2)}). Perderías Bs. {Math.abs(gananciaXUnidad).toFixed(2)} por unidad.
              </Text>
            </View>
          )}
          {!esGanancia && (
            <View style={styles.sugerencia}>
              <Text style={styles.sugerenciaText}>
                💡 Precio mínimo sin pérdida: <Text style={{ fontWeight: '800' }}>Bs. {costoXUnidad.toFixed(2)}</Text>
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>✅ Registrar Compra</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Campo({ label, hint, multiline, S, C, ...props }) {
  return (
    <View style={S.campo}>
      <Text style={S.label}>{label}</Text>
      <TextInput
        style={[S.input, multiline && { height: 70, textAlignVertical: 'top' }]}
        multiline={multiline}
        placeholderTextColor={C.textLight}
        {...props}
      />
      {hint ? <Text style={S.hint}>{hint}</Text> : null}
    </View>
  );
}

function FilaCalculo({ label, valor, negrita, S }) {
  return (
    <View style={S.filaCalculo}>
      <Text style={[S.filaLabel, negrita && { fontWeight: '700', color: S.filaValor.color }]}>{label}</Text>
      <Text style={[S.filaValor, negrita && { fontWeight: '800' }]}>{valor}</Text>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    articuloInfo: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.primary },
    articuloLabel: { fontSize: 11, color: C.textLight, textTransform: 'uppercase' },
    articuloNombre: { fontSize: 16, fontWeight: 'bold', color: C.text, marginTop: 2 },
    campo: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
    input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, fontSize: 14, color: C.text },
    hint: { fontSize: 11, color: C.textLight, marginTop: 3, marginLeft: 2 },
    resumenCosto: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.primary },
    resumenTitulo: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
    filaCalculo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    filaLabel: { fontSize: 13, color: C.textLight, flex: 1 },
    filaValor: { fontSize: 13, color: C.text, fontWeight: '600' },
    separador: { height: 1, backgroundColor: C.border, marginVertical: 8 },
    resumenGanancia: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 4 },
    gananciaDestacada: { marginVertical: 4 },
    gananciaTituloChip: { fontSize: 12, color: C.textLight, marginBottom: 6 },
    gananciaChipRow: { flexDirection: 'row', gap: 10 },
    gananciaChip: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
    gananciaChipValor: { fontSize: 20, fontWeight: '800' },
    gananciaChipLabel: { fontSize: 11, marginTop: 2 },
    gananciaChipGrande: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1 },
    gananciaChipGrandeValor: { fontSize: 24, fontWeight: '800' },
    gananciaChipGrandeLabel: { fontSize: 12, color: C.textLight, marginTop: 3 },
    advertencia: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 10 },
    advertenciaText: { fontSize: 12, color: C.danger, lineHeight: 18 },
    sugerencia: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 6 },
    sugerenciaText: { fontSize: 12, color: C.warning },
    btnGuardar: { backgroundColor: C.success, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
    btnGuardarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  });
}
