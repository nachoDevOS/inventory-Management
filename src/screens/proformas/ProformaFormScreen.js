import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, FlatList, Modal
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS, STYLES } from '../../theme';

// subtotal = cantidad * precio * (1 - descuento/100)
const calcSubtotal = (cantidad, precio, descuento) =>
  (parseFloat(cantidad) || 0) * (parseFloat(precio) || 0) * (1 - (parseFloat(descuento) || 0) / 100);

export default function ProformaFormScreen({ navigation }) {
  const db = useSQLiteContext();
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [items, setItems] = useState([]);
  const [detalle, setDetalle] = useState('');
  const [modalClientes, setModalClientes] = useState(false);
  const [modalArticulos, setModalArticulos] = useState(false);
  const [busqCliente, setBusqCliente] = useState('');
  const [busqArticulo, setBusqArticulo] = useState('');

  useEffect(() => {
    db.getAllAsync('SELECT * FROM clientes ORDER BY nombre ASC').then(setClientes);
    db.getAllAsync(`
      SELECT a.*,
        COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo = a.idarticulo), 0) -
        COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = a.idarticulo), 0) AS stock,
        COALESCE((SELECT MAX(c.precio_venta_sugerido) FROM compras c WHERE c.idarticulo = a.idarticulo ORDER BY c.fecha DESC LIMIT 1), 0) AS precio_sugerido
      FROM articulos a ORDER BY a.nombre ASC
    `).then(setArticulos);
  }, []);

  const agregarItem = (articulo) => {
    const existe = items.find(i => i.idarticulo === articulo.idarticulo);
    if (existe) {
      setItems(items.map(i => i.idarticulo === articulo.idarticulo
        ? { ...i, cantidad: i.cantidad + 1, subtotal: calcSubtotal(i.cantidad + 1, i.precio_cotizacion, i.descuento) }
        : i
      ));
    } else {
      const precio = articulo.precio_sugerido || 0;
      setItems([...items, {
        idarticulo: articulo.idarticulo,
        nombre: articulo.nombre,
        cantidad: 1,
        precio_cotizacion: precio,
        descuento: 0,
        subtotal: precio,
        stock: articulo.stock,
      }]);
    }
    setModalArticulos(false);
  };

  const actualizarItem = (idarticulo, campo, valor) => {
    setItems(items.map(i => {
      if (i.idarticulo !== idarticulo) return i;
      const updated = { ...i, [campo]: valor };
      updated.subtotal = calcSubtotal(updated.cantidad, updated.precio_cotizacion, updated.descuento);
      return updated;
    }));
  };

  const quitarItem = (idarticulo) => setItems(items.filter(i => i.idarticulo !== idarticulo));

  const totalBruto = items.reduce((s, i) =>
    s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_cotizacion) || 0), 0);
  const totalDescuento = items.reduce((s, i) =>
    s + ((parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_cotizacion) || 0) * (parseFloat(i.descuento) || 0) / 100), 0);
  const total = items.reduce((s, i) => s + (i.subtotal || 0), 0);

  const guardar = async () => {
    if (!clienteSeleccionado) { Alert.alert('Error', 'Selecciona un cliente'); return; }
    if (items.length === 0) { Alert.alert('Error', 'Agrega al menos un artículo'); return; }
    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0) {
        Alert.alert('Error', `Cantidad inválida en ${item.nombre}`); return;
      }
    }

    const result = await db.runAsync(
      'INSERT INTO proformas (idcliente, detalle) VALUES (?,?)',
      [clienteSeleccionado.idcliente, detalle]
    );
    const idproforma = result.lastInsertRowId;

    for (const item of items) {
      await db.runAsync(
        'INSERT INTO proforma_detalle (idproforma, idarticulo, cantidad, precio_cotizacion, descuento, subtotal) VALUES (?,?,?,?,?,?)',
        [idproforma, item.idarticulo, item.cantidad, item.precio_cotizacion, item.descuento || 0, item.subtotal]
      );
    }
    navigation.replace('ProformaDetail', { idproforma });
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqCliente.toLowerCase()) ||
    (c.carnet_identidad || '').includes(busqCliente)
  );
  const articulosFiltrados = articulos.filter(a =>
    a.nombre.toLowerCase().includes(busqArticulo.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Cliente */}
      <Text style={styles.sectionTitle}>Cliente *</Text>
      <TouchableOpacity style={styles.selectorBtn} onPress={() => setModalClientes(true)}>
        <Text style={clienteSeleccionado ? styles.selectorSelected : styles.selectorPlaceholder}>
          {clienteSeleccionado ? `👤 ${clienteSeleccionado.nombre}` : 'Seleccionar cliente...'}
        </Text>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>

      {/* Artículos */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Artículos</Text>
      {items.map(item => (
        <View key={item.idarticulo} style={[styles.itemCard, STYLES.shadow]}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemNombre}>{item.nombre}</Text>
            <TouchableOpacity onPress={() => quitarItem(item.idarticulo)}>
              <Text style={{ color: COLORS.danger, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Fila 1: cantidad y precio */}
          <View style={styles.itemRow}>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Cantidad</Text>
              <TextInput
                style={styles.itemInput}
                value={String(item.cantidad)}
                onChangeText={v => actualizarItem(item.idarticulo, 'cantidad', parseFloat(v) || 0)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Precio (Bs.)</Text>
              <TextInput
                style={styles.itemInput}
                value={String(item.precio_cotizacion)}
                onChangeText={v => actualizarItem(item.idarticulo, 'precio_cotizacion', parseFloat(v) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Descuento %</Text>
              <TextInput
                style={[styles.itemInput, item.descuento > 0 && styles.itemInputDescuento]}
                value={String(item.descuento)}
                onChangeText={v => {
                  const d = Math.min(100, Math.max(0, parseFloat(v) || 0));
                  actualizarItem(item.idarticulo, 'descuento', d);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          {/* Subtotal con desglose */}
          <View style={styles.itemSubtotalRow}>
            {item.descuento > 0 && (
              <Text style={styles.itemDescuentoText}>
                - Bs. {((parseFloat(item.cantidad)||0)*(parseFloat(item.precio_cotizacion)||0)*(parseFloat(item.descuento)||0)/100).toFixed(2)} ({item.descuento}% desc.)
              </Text>
            )}
            <Text style={styles.itemSubtotal}>Subtotal: Bs. {Number(item.subtotal).toFixed(2)}</Text>
          </View>
          <Text style={styles.itemStock}>Stock disponible: {item.stock}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.btnAgregarArticulo} onPress={() => setModalArticulos(true)}>
        <Text style={styles.btnAgregarText}>＋ Agregar artículo</Text>
      </TouchableOpacity>

      {/* Resumen total */}
      <View style={styles.totalContainer}>
        {totalDescuento > 0 && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal bruto:</Text>
              <Text style={styles.totalValorSub}>Bs. {totalBruto.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: COLORS.danger }]}>Descuentos:</Text>
              <Text style={[styles.totalValorSub, { color: COLORS.danger }]}>- Bs. {totalDescuento.toFixed(2)}</Text>
            </View>
            <View style={styles.separador} />
          </>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabelBig}>Total Proforma:</Text>
          <Text style={styles.totalValorBig}>Bs. {total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Detalle */}
      <View style={styles.campo}>
        <Text style={styles.label}>Detalle / Observaciones</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          value={detalle} onChangeText={setDetalle}
          placeholder="Notas de la proforma" multiline
        />
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>💾 Guardar Proforma</Text>
      </TouchableOpacity>

      {/* Modal Clientes */}
      <Modal visible={modalClientes} animationType="slide" onRequestClose={() => setModalClientes(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
            <TouchableOpacity onPress={() => setModalClientes(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <TextInput style={styles.modalSearch} placeholder="Buscar..." value={busqCliente} onChangeText={setBusqCliente} />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={c => String(c.idcliente)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setClienteSeleccionado(item); setModalClientes(false); }}>
                <Text style={styles.modalItemText}>{item.nombre}</Text>
                {item.carnet_identidad ? <Text style={styles.modalItemSub}>CI: {item.carnet_identidad}</Text> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Modal Artículos */}
      <Modal visible={modalArticulos} animationType="slide" onRequestClose={() => setModalArticulos(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Artículo</Text>
            <TouchableOpacity onPress={() => setModalArticulos(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <TextInput style={styles.modalSearch} placeholder="Buscar..." value={busqArticulo} onChangeText={setBusqArticulo} />
          <FlatList
            data={articulosFiltrados}
            keyExtractor={a => String(a.idarticulo)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => agregarItem(item)}>
                <Text style={styles.modalItemText}>{item.nombre}</Text>
                <Text style={styles.modalItemSub}>
                  Stock: {item.stock} | Precio sugerido: Bs. {Number(item.precio_sugerido).toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  selectorBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 12,
  },
  selectorSelected: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  selectorPlaceholder: { fontSize: 14, color: COLORS.textLight },
  selectorArrow: { color: COLORS.textLight },
  itemCard: { backgroundColor: COLORS.card, borderRadius: 8, padding: 10, marginBottom: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemNombre: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  itemRow: { flexDirection: 'row', gap: 8 },
  itemField: { flex: 1 },
  itemLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 2 },
  itemInput: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 6, padding: 6, fontSize: 13, textAlign: 'center',
  },
  itemInputDescuento: { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' },
  itemSubtotalRow: { alignItems: 'flex-end', marginTop: 6 },
  itemDescuentoText: { fontSize: 11, color: COLORS.danger, marginBottom: 1 },
  itemSubtotal: { fontSize: 13, fontWeight: 'bold', color: COLORS.success },
  itemStock: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  btnAgregarArticulo: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
    borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12,
  },
  btnAgregarText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  totalContainer: {
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 14, marginBottom: 14,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 13, color: COLORS.textLight },
  totalValorSub: { fontSize: 13, color: COLORS.textLight },
  separador: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  totalLabelBig: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  totalValorBig: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  campo: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text,
  },
  btnGuardar: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center',
  },
  btnGuardarText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  modal: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: COLORS.primary,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.white },
  modalClose: { fontSize: 20, color: COLORS.white, padding: 4 },
  modalSearch: {
    margin: 12, padding: 10, backgroundColor: COLORS.card,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, fontSize: 14,
  },
  modalItem: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  modalItemText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  modalItemSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
});
