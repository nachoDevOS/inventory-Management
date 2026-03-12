import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS, STYLES } from '../../theme';

/**
 * CompraFormScreen — Registro de compras / entrada de stock
 *
 * Fórmula de ganancia por unidad:
 *   costo_envio_unit = precio_envio / cantidad
 *   costo_unit       = precio_compra + costo_envio_unit
 *   ganancia_unit    = precio_venta_sugerido - costo_unit
 *   margen_%         = (ganancia_unit / costo_unit) * 100
 *
 * Ejemplo: cantidad=5, precio_compra=70, precio_envio=50, precio_venta=100
 *   costo_envio_unit = 50/5 = 10
 *   costo_unit       = 70+10 = 80
 *   ganancia_unit    = 100-80 = 20
 *   margen           = (20/80)*100 = 25%
 */
export default function CompraFormScreen({ route, navigation }) {
  const db = useSQLiteContext();
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
    db.getFirstAsync('SELECT * FROM articulos WHERE idarticulo = ?', [idarticulo])
      .then(setArticulo);
  }, [idarticulo]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Cálculos en tiempo real ──────────────────────────────────────────────
  const cantidad        = Math.max(parseInt(form.cantidad) || 1, 1);
  const precioCompra    = parseFloat(form.precio_compra) || 0;
  const precioEnvio     = parseFloat(form.precio_envio) || 0;
  const precioVenta     = parseFloat(form.precio_venta_sugerido) || 0;

  const envioXUnidad    = precioEnvio / cantidad;           // envío prorrateado
  const costoXUnidad    = precioCompra + envioXUnidad;      // costo real por unidad
  const costoTotalLote  = costoXUnidad * cantidad;          // costo total del lote

  const gananciaXUnidad = precioVenta - costoXUnidad;       // ganancia por unidad
  const gananciaTotalLote = gananciaXUnidad * cantidad;     // ganancia total si se vende todo
  const margenPct       = costoXUnidad > 0
    ? (gananciaXUnidad / costoXUnidad) * 100
    : 0;

  const hayVenta = precioVenta > 0 && precioCompra > 0;
  const esGanancia = gananciaXUnidad >= 0;

  // ── Guardar ──────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!cantidad || cantidad <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }
    if (isNaN(precioCompra) || precioCompra < 0) {
      Alert.alert('Error', 'Ingresa un precio de compra válido');
      return;
    }
    await db.runAsync(
      `INSERT INTO compras (idarticulo, cantidad, precio_compra, precio_envio, precio_venta_sugerido, detalle)
       VALUES (?,?,?,?,?,?)`,
      [idarticulo, cantidad, precioCompra, precioEnvio,
       precioVenta || 0, form.detalle]
    );
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>

      {/* ── Artículo ── */}
      {articulo && (
        <View style={styles.articuloInfo}>
          <Text style={styles.articuloLabel}>Artículo</Text>
          <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
        </View>
      )}

      {/* ── Campos ── */}
      <Campo
        label="Cantidad *"
        value={form.cantidad}
        onChangeText={v => set('cantidad', v)}
        keyboardType="numeric"
        placeholder="1"
        hint="Número de unidades que compraste"
      />
      <Campo
        label="Precio de Compra por Unidad (Bs.) *"
        value={form.precio_compra}
        onChangeText={v => set('precio_compra', v)}
        keyboardType="decimal-pad"
        placeholder="0.00"
        hint="Costo individual de cada unidad"
      />
      <Campo
        label="Precio de Envío Total (Bs.)"
        value={form.precio_envio}
        onChangeText={v => set('precio_envio', v)}
        keyboardType="decimal-pad"
        placeholder="0.00"
        hint={`Se divide entre ${cantidad} unid. → Bs. ${envioXUnidad.toFixed(2)} por unidad`}
      />
      <Campo
        label="Precio de Venta Sugerido (Bs.)"
        value={form.precio_venta_sugerido}
        onChangeText={v => set('precio_venta_sugerido', v)}
        keyboardType="decimal-pad"
        placeholder="0.00"
        hint="Precio al que planeas vender cada unidad"
      />
      <Campo
        label="Detalle / Observaciones"
        value={form.detalle}
        onChangeText={v => set('detalle', v)}
        placeholder="Notas de la compra (proveedor, número de factura, etc.)"
        multiline
        numberOfLines={2}
      />

      {/* ── Resumen de costos ── */}
      <View style={[styles.resumenCosto, STYLES.shadow]}>
        <Text style={styles.resumenTitulo}>💼 Resumen de Costos</Text>
        <FilaCalculo
          label="Precio compra por unidad"
          valor={`Bs. ${precioCompra.toFixed(2)}`}
        />
        <FilaCalculo
          label={`Envío (Bs. ${precioEnvio.toFixed(2)} ÷ ${cantidad} unid.)`}
          valor={`Bs. ${envioXUnidad.toFixed(2)}`}
        />
        <View style={styles.separador} />
        <FilaCalculo
          label="Costo real por unidad"
          valor={`Bs. ${costoXUnidad.toFixed(2)}`}
          negrita
        />
        <FilaCalculo
          label={`Costo total del lote (×${cantidad})`}
          valor={`Bs. ${costoTotalLote.toFixed(2)}`}
          negrita
        />
      </View>

      {/* ── Calculadora de ganancia ── */}
      {hayVenta && (
        <View style={[
          styles.resumenGanancia,
          STYLES.shadow,
          { borderLeftColor: esGanancia ? COLORS.success : COLORS.danger },
        ]}>
          <Text style={styles.resumenTitulo}>
            {esGanancia ? '📈 Análisis de Ganancia' : '📉 Análisis de Pérdida'}
          </Text>

          <FilaCalculo
            label="Precio de venta"
            valor={`Bs. ${precioVenta.toFixed(2)}`}
          />
          <FilaCalculo
            label="Costo real por unidad"
            valor={`Bs. ${costoXUnidad.toFixed(2)}`}
          />
          <View style={styles.separador} />

          {/* Ganancia por unidad */}
          <View style={styles.gananciaDestacada}>
            <Text style={styles.gananciaTituloChip}>Por cada unidad vendida</Text>
            <View style={styles.gananciaChipRow}>
              <View style={[
                styles.gananciaChip,
                { backgroundColor: esGanancia ? '#DCFCE7' : '#FEE2E2' },
              ]}>
                <Text style={[
                  styles.gananciaChipValor,
                  { color: esGanancia ? COLORS.success : COLORS.danger },
                ]}>
                  {esGanancia ? '+' : ''}Bs. {gananciaXUnidad.toFixed(2)}
                </Text>
                <Text style={[
                  styles.gananciaChipLabel,
                  { color: esGanancia ? COLORS.success : COLORS.danger },
                ]}>ganancia</Text>
              </View>
              <View style={[
                styles.gananciaChip,
                { backgroundColor: esGanancia ? '#EFF6FF' : '#FEF3C7' },
              ]}>
                <Text style={[
                  styles.gananciaChipValor,
                  { color: esGanancia ? COLORS.primary : COLORS.warning },
                ]}>
                  {margenPct.toFixed(1)}%
                </Text>
                <Text style={[
                  styles.gananciaChipLabel,
                  { color: esGanancia ? COLORS.primary : COLORS.warning },
                ]}>margen</Text>
              </View>
            </View>
          </View>

          {/* Ganancia total del lote */}
          <View style={styles.separador} />
          <Text style={styles.gananciaTituloChip}>Si vendes todo el lote ({cantidad} unid.)</Text>
          <View style={styles.gananciaChipRow}>
            <View style={[
              styles.gananciaChipGrande,
              { backgroundColor: esGanancia ? '#F0FDF4' : '#FEF2F2', borderColor: esGanancia ? '#BBF7D0' : '#FECACA' },
            ]}>
              <Text style={[
                styles.gananciaChipGrandeValor,
                { color: esGanancia ? COLORS.success : COLORS.danger },
              ]}>
                {esGanancia ? '+' : ''}Bs. {gananciaTotalLote.toFixed(2)}
              </Text>
              <Text style={styles.gananciaChipGrandeLabel}>ganancia total estimada</Text>
            </View>
          </View>

          {/* Advertencia si precio de venta es bajo */}
          {!esGanancia && (
            <View style={styles.advertencia}>
              <Text style={styles.advertenciaText}>
                ⚠️ El precio de venta (Bs. {precioVenta.toFixed(2)}) es menor al costo real por unidad (Bs. {costoXUnidad.toFixed(2)}). Perderías Bs. {Math.abs(gananciaXUnidad).toFixed(2)} por unidad.
              </Text>
            </View>
          )}

          {/* Precio mínimo de venta para no perder */}
          {!esGanancia && (
            <View style={styles.sugerencia}>
              <Text style={styles.sugerenciaText}>
                💡 Precio mínimo sin pérdida: <Text style={{ fontWeight: '800' }}>Bs. {costoXUnidad.toFixed(2)}</Text>
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Botón guardar */}
      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>✅ Registrar Compra</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Campo({ label, hint, multiline, ...props }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 70, textAlignVertical: 'top' }]}
        multiline={multiline}
        placeholderTextColor={COLORS.textLight}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function FilaCalculo({ label, valor, negrita }) {
  return (
    <View style={styles.filaCalculo}>
      <Text style={[styles.filaLabel, negrita && { fontWeight: '700', color: COLORS.text }]}>
        {label}
      </Text>
      <Text style={[styles.filaValor, negrita && { fontWeight: '800', color: COLORS.text }]}>
        {valor}
      </Text>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  articuloInfo: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  articuloLabel: { fontSize: 11, color: COLORS.textLight, textTransform: 'uppercase' },
  articuloNombre: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },

  campo: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text,
  },
  hint: { fontSize: 11, color: COLORS.textLight, marginTop: 3, marginLeft: 2 },

  // Resumen costos
  resumenCosto: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  resumenTitulo: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  filaCalculo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  filaLabel: { fontSize: 13, color: COLORS.textLight, flex: 1 },
  filaValor: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  separador: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  // Ganancia
  resumenGanancia: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginBottom: 16, borderLeftWidth: 4,
  },
  gananciaDestacada: { marginVertical: 4 },
  gananciaTituloChip: { fontSize: 12, color: COLORS.textLight, marginBottom: 6 },
  gananciaChipRow: { flexDirection: 'row', gap: 10 },
  gananciaChip: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  gananciaChipValor: { fontSize: 20, fontWeight: '800' },
  gananciaChipLabel: { fontSize: 11, marginTop: 2 },
  gananciaChipGrande: {
    flex: 1, borderRadius: 10, padding: 14, alignItems: 'center',
    borderWidth: 1,
  },
  gananciaChipGrandeValor: { fontSize: 24, fontWeight: '800' },
  gananciaChipGrandeLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },

  advertencia: {
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 10,
  },
  advertenciaText: { fontSize: 12, color: COLORS.danger, lineHeight: 18 },
  sugerencia: {
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 6,
  },
  sugerenciaText: { fontSize: 12, color: COLORS.warning },

  btnGuardar: {
    backgroundColor: COLORS.success, borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 8,
  },
  btnGuardarText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
