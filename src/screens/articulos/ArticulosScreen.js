/**
 * ArticulosScreen — Lista de artículos con:
 *  - Búsqueda por nombre
 *  - Filtro por categoría (chips horizontales)
 *  - Stock calculado dinámicamente
 *  - Valor total del inventario = SUM(stock × costo_unitario)
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Image, ScrollView
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';

export default function ArticulosScreen({ navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [articulos, setArticulos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [marcas, setMarcas] = useState([]);
  const [marcaFiltro, setMarcaFiltro] = useState(null);
  const [valorInventario, setValorInventario] = useState(0);

  const cargar = useCallback(async () => {
    const cats = await db.getAllAsync('SELECT * FROM categorias ORDER BY nombre ASC');
    setCategorias(cats);
    const ms = await db.getAllAsync(
      "SELECT DISTINCT marca FROM articulos WHERE marca IS NOT NULL AND marca != '' ORDER BY marca ASC"
    );
    setMarcas(ms.map(r => r.marca));

    let sql = `
      SELECT a.*,
        cat.nombre as categoria_nombre, cat.color as categoria_color,
        COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo = a.idarticulo), 0) -
        COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = a.idarticulo), 0) AS stock,
        COALESCE((SELECT c.precio_venta_sugerido FROM compras c WHERE c.idarticulo = a.idarticulo ORDER BY c.fecha DESC LIMIT 1), 0) AS precio_venta,
        COALESCE((SELECT c.precio_compra + c.precio_envio / MAX(c.cantidad, 1) FROM compras c WHERE c.idarticulo = a.idarticulo ORDER BY c.fecha DESC LIMIT 1), 0) AS costo_unitario
      FROM articulos a
      LEFT JOIN categorias cat ON cat.idcategoria = a.idcategoria
      WHERE a.nombre LIKE ?
    `;
    const params = [`%${busqueda}%`];
    if (categoriaFiltro !== null) { sql += ' AND a.idcategoria = ?'; params.push(categoriaFiltro); }
    if (marcaFiltro !== null) { sql += ' AND a.marca = ?'; params.push(marcaFiltro); }
    sql += ' ORDER BY a.nombre ASC';

    const rows = await db.getAllAsync(sql, params);
    setArticulos(rows);
    setValorInventario(rows.reduce((s, a) => s + Math.max(a.stock, 0) * (a.costo_unitario || 0), 0));
  }, [db, busqueda, categoriaFiltro, marcaFiltro]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const eliminar = (item) => {
    Alert.alert('Eliminar', `¿Eliminar ${item.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await db.runAsync('DELETE FROM articulos WHERE idarticulo = ?', [item.idarticulo]);
          cargar();
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, STYLES.shadow]}
      onPress={() => navigation.navigate('ArticuloDetail', { idarticulo: item.idarticulo })}
    >
      <View style={styles.row}>
        {item.imagen
          ? <Image source={{ uri: item.imagen }} style={styles.img} />
          : <View style={styles.imgPlaceholder}><Text style={{ fontSize: 28 }}>📦</Text></View>
        }
        <View style={styles.info}>
          <View style={styles.nombreRow}>
            <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
            {item.categoria_nombre && (
              <View style={[styles.catBadge, { backgroundColor: (item.categoria_color || '#2563EB') + '22' }]}>
                <Text style={[styles.catText, { color: item.categoria_color || '#2563EB' }]}>{item.categoria_nombre}</Text>
              </View>
            )}
            {item.marca ? (
              <View style={styles.marcaBadge}>
                <Text style={styles.marcaText}>{item.marca}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.stockRow}>
            <View style={[styles.stockBadge, { backgroundColor: item.stock > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.stockText, { color: item.stock > 0 ? COLORS.success : COLORS.danger }]}>
                Stock: {item.stock}
              </Text>
            </View>
            {item.precio_venta > 0 && <Text style={styles.precio}>Bs. {Number(item.precio_venta).toFixed(2)}</Text>}
          </View>
          {item.detalle ? <Text style={styles.detalle} numberOfLines={1}>{item.detalle}</Text> : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('ArticuloForm', { articulo: item })}>
            <Text style={{ fontSize: 20 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => eliminar(item)}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar artículos..."
        placeholderTextColor={COLORS.textLight}
        value={busqueda}
        onChangeText={setBusqueda}
        onSubmitEditing={cargar}
      />

      {/* Filtro de categorías */}
      {categorias.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.catsScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            style={[styles.catFiltro, categoriaFiltro === null && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
            onPress={() => setCategoriaFiltro(null)}
          >
            <Text style={[styles.catFiltroText, categoriaFiltro === null && { color: '#fff' }]}>Todas</Text>
          </TouchableOpacity>
          {categorias.map(c => (
            <TouchableOpacity
              key={c.idcategoria}
              style={[styles.catFiltro, categoriaFiltro === c.idcategoria && { backgroundColor: c.color, borderColor: c.color }]}
              onPress={() => setCategoriaFiltro(categoriaFiltro === c.idcategoria ? null : c.idcategoria)}
            >
              <Text style={[styles.catFiltroText, categoriaFiltro === c.idcategoria && { color: '#fff' }]}>{c.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Filtro de marcas */}
      {marcas.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.catsScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            style={[styles.catFiltro, styles.marcaFiltroBase, marcaFiltro === null && { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]}
            onPress={() => setMarcaFiltro(null)}
          >
            <Text style={[styles.catFiltroText, marcaFiltro === null && { color: '#fff' }]}>🏷️ Todas las marcas</Text>
          </TouchableOpacity>
          {marcas.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.catFiltro, styles.marcaFiltroBase, marcaFiltro === m && { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]}
              onPress={() => setMarcaFiltro(marcaFiltro === m ? null : m)}
            >
              <Text style={[styles.catFiltroText, marcaFiltro === m && { color: '#fff' }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Valor del inventario */}
      {articulos.length > 0 && (
        <View style={styles.inventarioBanner}>
          <Text style={styles.inventarioLabel}>{articulos.length} artículos · Valor inventario:</Text>
          <Text style={styles.inventarioValor}>Bs. {valorInventario.toFixed(2)}</Text>
        </View>
      )}

      <FlatList
        data={articulos}
        keyExtractor={item => String(item.idarticulo)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay artículos registrados</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ArticuloForm', {})}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    search: {
      margin: 12, marginBottom: 4, padding: 10, backgroundColor: C.card,
      borderRadius: 10, borderWidth: 1, borderColor: C.border, fontSize: 14, color: C.text,
    },
    catsScroll: { maxHeight: 44 },
    catFiltro: {
      backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
      borderWidth: 1, borderColor: C.border,
    },
    catFiltroText: { fontSize: 12, fontWeight: '600', color: C.textLight },
    inventarioBanner: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    inventarioLabel: { fontSize: 12, color: C.textLight },
    inventarioValor: { fontSize: 14, fontWeight: '800', color: C.primary },
    card: { backgroundColor: C.card, marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    img: { width: 60, height: 60, borderRadius: 8 },
    imgPlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 10 },
    nombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    nombre: { fontSize: 15, fontWeight: '600', color: C.text },
    catBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    catText: { fontSize: 10, fontWeight: '700' },
    marcaBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#F3E8FF' },
    marcaText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
    marcaFiltroBase: { borderColor: '#7C3AED33' },
    stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    stockBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    stockText: { fontSize: 12, fontWeight: '600' },
    precio: { fontSize: 12, color: C.textLight },
    detalle: { fontSize: 11, color: C.textLight, marginTop: 2 },
    actions: { flexDirection: 'column', gap: 6, marginLeft: 8 },
    empty: { textAlign: 'center', color: C.textLight, marginTop: 40, fontSize: 15 },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      backgroundColor: C.primary, width: 56, height: 56,
      borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6,
    },
    fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  });
}
