/**
 * VentaFormScreen — Crear una venta directa (sin necesidad de proforma previa)
 *
 * Flujo: seleccionar cliente → agregar artículos y/o servicios
 *        → calcular total → guardar
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, FlatList, Modal
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

const calcSubtotal = (cantidad, precio, descuento) =>
  (parseFloat(cantidad) || 0) * (parseFloat(precio) || 0) * (1 - (parseFloat(descuento) || 0) / 100);

const hoyFormateado = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parsearFecha = (str) => {
  const parts = str.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const [dd, mm, yyyy] = parts;
  if (isNaN(Number(dd)) || isNaN(Number(mm)) || isNaN(Number(yyyy))) return null;
  return `${yyyy}-${mm}-${dd} 00:00:00`;
};

export default function VentaFormScreen({ navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [items, setItems] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [detalle, setDetalle] = useState('');
  const [fecha, setFecha] = useState(hoyFormateado());
  const [modalClientes, setModalClientes] = useState(false);
  const [modalArticulos, setModalArticulos] = useState(false);
  const [modalServicio, setModalServicio] = useState(false);
  const [busqCliente, setBusqCliente] = useState('');
  const [busqArticulo, setBusqArticulo] = useState('');
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', cantidad: '1', precio: '', descuento: '0' });

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

  const agregarItem = (art) => {
    const existe = items.find(i => i.idarticulo === art.idarticulo);
    if (existe) {
      setItems(items.map(i => i.idarticulo === art.idarticulo
        ? { ...i, cantidad: i.cantidad + 1, subtotal: calcSubtotal(i.cantidad + 1, i.precio_venta, i.descuento) }
        : i
      ));
    } else {
      const precio = art.precio_sugerido || 0;
      setItems([...items, {
        idarticulo: art.idarticulo,
        nombre: art.nombre,
        cantidad: 1,
        precio_venta: precio,
        descuento: 0,
        subtotal: precio,
        stock: art.stock,
      }]);
    }
    setModalArticulos(false);
  };

  const actualizarItem = (idarticulo, campo, valor) => {
    setItems(items.map(i => {
      if (i.idarticulo !== idarticulo) return i;
      const updated = { ...i, [campo]: valor };
      updated.subtotal = calcSubtotal(updated.cantidad, updated.precio_venta, updated.descuento);
      return updated;
    }));
  };

  const quitarItem = (idarticulo, nombre) => {
    Alert.alert('Quitar artículo', `¿Quitar "${nombre}" de la venta?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => setItems(items.filter(i => i.idarticulo !== idarticulo)) },
    ]);
  };

  const agregarServicio = () => {
    if (!nuevoServicio.nombre.trim()) { Alert.alert('Error', 'Ingresa el nombre del servicio'); return; }
    if (!nuevoServicio.precio || parseFloat(nuevoServicio.precio) <= 0) { Alert.alert('Error', 'Ingresa un precio válido'); return; }
    const subtotal = calcSubtotal(nuevoServicio.cantidad, nuevoServicio.precio, nuevoServicio.descuento);
    setServicios([...servicios, {
      _key: String(Date.now()),
      nombre: nuevoServicio.nombre.trim(),
      cantidad: parseFloat(nuevoServicio.cantidad) || 1,
      precio: parseFloat(nuevoServicio.precio) || 0,
      descuento: parseFloat(nuevoServicio.descuento) || 0,
      subtotal,
    }]);
    setNuevoServicio({ nombre: '', cantidad: '1', precio: '', descuento: '0' });
    setModalServicio(false);
  };

  const actualizarServicio = (_key, campo, valor) => {
    setServicios(servicios.map(s => {
      if (s._key !== _key) return s;
      const updated = { ...s, [campo]: valor };
      updated.subtotal = calcSubtotal(updated.cantidad, updated.precio, updated.descuento);
      return updated;
    }));
  };

  const quitarServicio = (_key, nombre) => {
    Alert.alert('Quitar servicio', `¿Quitar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => setServicios(servicios.filter(s => s._key !== _key)) },
    ]);
  };

  const totalBruto = items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_venta) || 0), 0)
    + servicios.reduce((s, sv) => s + (parseFloat(sv.cantidad) || 0) * (parseFloat(sv.precio) || 0), 0);
  const totalDescuento = items.reduce((s, i) =>
    s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_venta) || 0) * (parseFloat(i.descuento) || 0) / 100, 0)
    + servicios.reduce((s, sv) => s + (parseFloat(sv.cantidad) || 0) * (parseFloat(sv.precio) || 0) * (parseFloat(sv.descuento) || 0) / 100, 0);
  const total = items.reduce((s, i) => s + (i.subtotal || 0), 0)
    + servicios.reduce((s, sv) => s + (sv.subtotal || 0), 0);

  const guardar = async () => {
    if (!clienteSel) { Alert.alert('Error', 'Selecciona un cliente'); return; }
    if (items.length === 0 && servicios.length === 0) { Alert.alert('Error', 'Agrega al menos un artículo o servicio'); return; }
    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0) {
        Alert.alert('Error', `Cantidad inválida en ${item.nombre}`); return;
      }
      if (item.cantidad > item.stock) {
        Alert.alert('Stock insuficiente', `Solo hay ${item.stock} unidades de ${item.nombre}`); return;
      }
    }

    const result = await db.runAsync(
      'INSERT INTO ventas (idcliente, total, detalle, fecha) VALUES (?,?,?,?)',
      [clienteSel.idcliente, total, detalle, parsearFecha(fecha) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
    );
    const idventa = result.lastInsertRowId;

    for (const item of items) {
      await db.runAsync(
        'INSERT INTO venta_detalle (idventa, idarticulo, cantidad, precio_venta, descuento, subtotal) VALUES (?,?,?,?,?,?)',
        [idventa, item.idarticulo, item.cantidad, item.precio_venta, item.descuento || 0, item.subtotal]
      );
    }
    for (const sv of servicios) {
      await db.runAsync(
        'INSERT INTO venta_servicios (idventa, nombre, cantidad, precio, descuento, subtotal) VALUES (?,?,?,?,?,?)',
        [idventa, sv.nombre, sv.cantidad, sv.precio, sv.descuento || 0, sv.subtotal]
      );
    }

    navigation.replace('VentaDetail', { idventa });
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

      {/* ── Cliente ── */}
      <Text style={styles.sectionTitle}>Cliente *</Text>
      <TouchableOpacity style={styles.selectorBtn} onPress={() => setModalClientes(true)}>
        <Text style={clienteSel ? styles.selectorSel : styles.selectorPlaceholder}>
          {clienteSel ? `👤 ${clienteSel.nombre}` : 'Seleccionar cliente...'}
        </Text>
        <Text style={{ color: COLORS.textLight }}>▼</Text>
      </TouchableOpacity>

      {/* ── Fecha ── */}
      <View style={{ marginTop: 16, marginBottom: 14 }}>
        <Text style={styles.label}>Fecha (DD/MM/AAAA)</Text>
        <TextInput
          style={styles.input}
          value={fecha}
          onChangeText={setFecha}
          keyboardType="numeric"
          placeholder="DD/MM/AAAA"
          placeholderTextColor={COLORS.textLight}
          maxLength={10}
        />
      </View>

      {/* ── Artículos ── */}
      <Text style={styles.sectionTitle}>Artículos *</Text>
      {items.map(item => (
        <View key={item.idarticulo} style={[styles.itemCard, STYLES.shadow]}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemNombre}>{item.nombre}</Text>
            <TouchableOpacity onPress={() => quitarItem(item.idarticulo, item.nombre)}>
              <Text style={{ color: COLORS.danger, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
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
                value={String(item.precio_venta)}
                onChangeText={v => actualizarItem(item.idarticulo, 'precio_venta', parseFloat(v) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Desc. %</Text>
              <TextInput
                style={[styles.itemInput, item.descuento > 0 && { borderColor: COLORS.danger }]}
                value={String(item.descuento)}
                onChangeText={v => actualizarItem(item.idarticulo, 'descuento', Math.min(100, parseFloat(v) || 0))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          {item.descuento > 0 && (
            <Text style={styles.descText}>
              Ahorro: Bs. {((parseFloat(item.cantidad)||0)*(parseFloat(item.precio_venta)||0)*(parseFloat(item.descuento)||0)/100).toFixed(2)}
            </Text>
          )}
          <Text style={styles.itemSubtotal}>Subtotal: Bs. {Number(item.subtotal).toFixed(2)}</Text>
          <Text style={styles.itemStock}>Stock disponible: {item.stock} unid.</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.btnAgregarArt} onPress={() => setModalArticulos(true)}>
        <Text style={styles.btnAgregarText}>＋ Agregar artículo</Text>
      </TouchableOpacity>

      {/* ── Servicios ── */}
      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Servicios adicionales</Text>
      {servicios.map(sv => (
        <View key={sv._key} style={[styles.itemCard, styles.servicioCard, STYLES.shadow]}>
          <View style={styles.itemHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
              <Text style={styles.itemNombre}>{sv.nombre}</Text>
              <View style={styles.servicioBadge}><Text style={styles.servicioBadgeText}>SERVICIO</Text></View>
            </View>
            <TouchableOpacity onPress={() => quitarServicio(sv._key, sv.nombre)}>
              <Text style={{ color: COLORS.danger, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.itemRow}>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Cantidad</Text>
              <TextInput
                style={styles.itemInput}
                value={String(sv.cantidad)}
                onChangeText={v => actualizarServicio(sv._key, 'cantidad', parseFloat(v) || 0)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Precio (Bs.)</Text>
              <TextInput
                style={styles.itemInput}
                value={String(sv.precio)}
                onChangeText={v => actualizarServicio(sv._key, 'precio', parseFloat(v) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.itemField}>
              <Text style={styles.itemLabel}>Desc. %</Text>
              <TextInput
                style={[styles.itemInput, sv.descuento > 0 && { borderColor: COLORS.danger }]}
                value={String(sv.descuento)}
                onChangeText={v => actualizarServicio(sv._key, 'descuento', Math.min(100, parseFloat(v) || 0))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          {sv.descuento > 0 && (
            <Text style={styles.descText}>
              Ahorro: Bs. {((parseFloat(sv.cantidad)||0)*(parseFloat(sv.precio)||0)*(parseFloat(sv.descuento)||0)/100).toFixed(2)}
            </Text>
          )}
          <Text style={styles.itemSubtotal}>Subtotal: Bs. {Number(sv.subtotal).toFixed(2)}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.btnAgregarServicio} onPress={() => setModalServicio(true)}>
        <Text style={styles.btnAgregarServicioText}>＋ Agregar servicio</Text>
      </TouchableOpacity>

      {/* ── Total ── */}
      {(items.length > 0 || servicios.length > 0) && (
        <View style={styles.totalContainer}>
          {totalDescuento > 0.001 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelSub}>Subtotal bruto:</Text>
                <Text style={styles.totalValorSub}>Bs. {totalBruto.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabelSub, { color: COLORS.danger }]}>Descuentos:</Text>
                <Text style={[styles.totalValorSub, { color: COLORS.danger }]}>- Bs. {totalDescuento.toFixed(2)}</Text>
              </View>
              <View style={styles.separador} />
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBig}>Total Venta:</Text>
            <Text style={styles.totalValorBig}>Bs. {total.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* ── Detalle ── */}
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.label}>Detalle / Observaciones</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          value={detalle} onChangeText={setDetalle}
          placeholder="Notas de la venta" multiline
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
        <Text style={styles.btnGuardarText}>💰 Registrar Venta</Text>
      </TouchableOpacity>

      {/* ── Modal Clientes ── */}
      <Modal visible={modalClientes} animationType="slide" onRequestClose={() => setModalClientes(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
            <TouchableOpacity onPress={() => setModalClientes(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.modalSearch} placeholder="Buscar..." placeholderTextColor={COLORS.textLight}
            value={busqCliente} onChangeText={setBusqCliente} />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={c => String(c.idcliente)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setClienteSel(item); setModalClientes(false); }}>
                <Text style={styles.modalItemText}>{item.nombre}</Text>
                {item.carnet_identidad ? <Text style={styles.modalItemSub}>CI: {item.carnet_identidad}</Text> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Modal Artículos ── */}
      <Modal visible={modalArticulos} animationType="slide" onRequestClose={() => setModalArticulos(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Artículo</Text>
            <TouchableOpacity onPress={() => setModalArticulos(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.modalSearch} placeholder="Buscar..." placeholderTextColor={COLORS.textLight}
            value={busqArticulo} onChangeText={setBusqArticulo} />
          <FlatList
            data={articulosFiltrados}
            keyExtractor={a => String(a.idarticulo)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, item.stock <= 0 && { opacity: 0.5 }]}
                onPress={() => item.stock > 0 && agregarItem(item)}
              >
                <Text style={styles.modalItemText}>{item.nombre}</Text>
                <Text style={styles.modalItemSub}>
                  Stock: {item.stock} | Bs. {Number(item.precio_sugerido).toFixed(2)}
                  {item.stock <= 0 ? ' — SIN STOCK' : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Modal Nuevo Servicio ── */}
      <Modal visible={modalServicio} animationType="slide" transparent onRequestClose={() => setModalServicio(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalServicioContainer}>
            <View style={styles.modalServicioHeader}>
              <Text style={styles.modalServicioTitle}>Agregar Servicio</Text>
              <TouchableOpacity onPress={() => setModalServicio(false)}>
                <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={styles.label}>Nombre del servicio *</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                value={nuevoServicio.nombre}
                onChangeText={v => setNuevoServicio({ ...nuevoServicio, nombre: v })}
                placeholder="Ej: Instalación, Soporte técnico..."
                placeholderTextColor={COLORS.textLight}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoServicio.cantidad}
                    onChangeText={v => setNuevoServicio({ ...nuevoServicio, cantidad: v })}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Precio (Bs.) *</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoServicio.precio}
                    onChangeText={v => setNuevoServicio({ ...nuevoServicio, precio: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Descuento %</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoServicio.descuento}
                    onChangeText={v => setNuevoServicio({ ...nuevoServicio, descuento: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.btnGuardar} onPress={agregarServicio}>
                <Text style={styles.btnGuardarText}>Agregar servicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
    selectorBtn: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12,
    },
    selectorSel: { fontSize: 14, color: C.text, fontWeight: '500' },
    selectorPlaceholder: { fontSize: 14, color: C.textLight },
    itemCard: { backgroundColor: C.card, borderRadius: 8, padding: 10, marginBottom: 8 },
    servicioCard: { borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    itemNombre: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
    itemRow: { flexDirection: 'row', gap: 8 },
    itemField: { flex: 1 },
    itemLabel: { fontSize: 11, color: C.textLight, marginBottom: 2 },
    itemInput: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
      borderRadius: 6, padding: 6, fontSize: 13, textAlign: 'center', color: C.text,
    },
    descText: { fontSize: 11, color: C.danger, marginTop: 4 },
    itemSubtotal: { fontSize: 13, fontWeight: 'bold', color: C.success, marginTop: 4 },
    itemStock: { fontSize: 11, color: C.textLight, marginTop: 2 },
    servicioBadge: { backgroundColor: '#EDE9FE', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
    servicioBadgeText: { fontSize: 10, color: '#7C3AED', fontWeight: '700' },
    btnAgregarArt: {
      borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed',
      borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12,
    },
    btnAgregarServicio: {
      borderWidth: 1.5, borderColor: '#7C3AED', borderStyle: 'dashed',
      borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12,
    },
    btnAgregarText: { color: C.primary, fontWeight: '600', fontSize: 14 },
    btnAgregarServicioText: { color: '#7C3AED', fontWeight: '600', fontSize: 14 },
    totalContainer: { backgroundColor: C.card, borderRadius: 8, padding: 14, marginBottom: 14 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalLabelSub: { fontSize: 13, color: C.textLight },
    totalValorSub: { fontSize: 13, color: C.textLight },
    separador: { height: 1, backgroundColor: C.border, marginVertical: 6 },
    totalLabelBig: { fontSize: 15, fontWeight: '600', color: C.text },
    totalValorBig: { fontSize: 18, fontWeight: 'bold', color: C.success },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
    input: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      borderRadius: 8, padding: 10, fontSize: 14, color: C.text,
    },
    btnGuardar: { backgroundColor: C.success, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
    btnGuardarText: { color: C.white, fontWeight: 'bold', fontSize: 16 },
    modal: { flex: 1, backgroundColor: C.bg },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 16, backgroundColor: C.primary,
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    modalClose: { fontSize: 20, color: '#fff', padding: 4 },
    modalSearch: {
      margin: 12, padding: 10, backgroundColor: C.card,
      borderRadius: 8, borderWidth: 1, borderColor: C.border, fontSize: 14, color: C.text,
    },
    modalItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
    modalItemText: { fontSize: 15, color: C.text, fontWeight: '500' },
    modalItemSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalServicioContainer: { backgroundColor: C.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    modalServicioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#7C3AED', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    modalServicioTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  });
}
