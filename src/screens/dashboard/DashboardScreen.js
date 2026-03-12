import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STYLES } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({
    ventasHoy: 0, ingresosHoy: 0,
    proformasPendientes: 0, totalClientes: 0,
  });
  const [ventasSemana, setVentasSemana] = useState([]);
  const [topArticulos, setTopArticulos] = useState([]);
  const [stockBajoList, setStockBajoList] = useState([]);
  const [ultimasVentas, setUltimasVentas] = useState([]);
  const [ventasMes, setVentasMes] = useState({ total: 0, count: 0 });

  const cargar = useCallback(async () => {
    const hoy = await db.getFirstAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(fecha) = DATE('now','localtime')
    `);

    const mes = await db.getFirstAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now','localtime')
    `);

    const pendientes = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM proformas WHERE estado = 'pendiente'`
    );

    const clientes = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM clientes`
    );

    // Ventas últimos 7 días
    const semana = await db.getAllAsync(`
      SELECT DATE(fecha,'localtime') as dia,
             COALESCE(SUM(total),0) as total,
             COUNT(*) as cantidad
      FROM ventas
      WHERE DATE(fecha,'localtime') >= DATE('now','localtime','-6 days')
      GROUP BY DATE(fecha,'localtime')
      ORDER BY dia ASC
    `);

    // Top 5 artículos más vendidos (todos los tiempos)
    const top = await db.getAllAsync(`
      SELECT a.idarticulo, a.nombre,
             SUM(vd.cantidad) as total_vendido,
             SUM(vd.subtotal) as ingresos
      FROM venta_detalle vd
      JOIN articulos a ON a.idarticulo = vd.idarticulo
      GROUP BY vd.idarticulo
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    // Stock bajo (< 3 unidades)
    const bajo = await db.getAllAsync(`
      SELECT a.idarticulo, a.nombre,
        (COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo = a.idarticulo),0) -
         COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = a.idarticulo),0)) as stock
      FROM articulos a
      WHERE (
        COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo = a.idarticulo),0) -
        COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo = a.idarticulo),0)
      ) < 3
      ORDER BY stock ASC
      LIMIT 8
    `);

    // Últimas 5 ventas del día
    const ultimas = await db.getAllAsync(`
      SELECT v.idventa, v.total, v.fecha, c.nombre as cliente_nombre
      FROM ventas v
      JOIN clientes c ON c.idcliente = v.idcliente
      WHERE DATE(v.fecha,'localtime') = DATE('now','localtime')
      ORDER BY v.fecha DESC
      LIMIT 5
    `);

    setStats({
      ventasHoy: hoy?.count || 0,
      ingresosHoy: hoy?.total || 0,
      proformasPendientes: pendientes?.count || 0,
      totalClientes: clientes?.count || 0,
    });
    setVentasMes({ total: mes?.total || 0, count: mes?.count || 0 });
    setVentasSemana(semana);
    setTopArticulos(top);
    setStockBajoList(bajo);
    setUltimasVentas(ultimas);
  }, [db]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Rellenar los 7 días aunque no tengan ventas
  const ahora = new Date();
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ahora);
    d.setDate(ahora.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const found = ventasSemana.find(v => v.dia === iso);
    const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return {
      dia: nombres[d.getDay()],
      total: found?.total || 0,
      cantidad: found?.cantidad || 0,
      esHoy: i === 6,
    };
  });

  const maxVenta = Math.max(...dias7.map(d => d.total), 1);
  const maxTop = Math.max(...topArticulos.map(a => a.total_vendido), 1);

  const fechaHoy = ahora.toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de Control</Text>
          <Text style={styles.headerFecha}>{fechaHoy}</Text>
        </View>
        <Text style={{ fontSize: 36 }}>📊</Text>
      </View>

      {/* ── STATS HOY ── */}
      <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon="🛒" label="Ventas hoy"
          value={String(stats.ventasHoy)}
          color={COLORS.primary} bg="#EFF6FF"
        />
        <StatCard
          icon="💰" label="Ingresos hoy"
          value={`Bs. ${Number(stats.ingresosHoy).toFixed(2)}`}
          color={COLORS.success} bg="#F0FDF4"
        />
        <StatCard
          icon="📋" label="Proformas\npendientes"
          value={String(stats.proformasPendientes)}
          color={COLORS.warning} bg="#FFFBEB"
        />
        <StatCard
          icon="👥" label="Clientes"
          value={String(stats.totalClientes)}
          color="#7C3AED" bg="#F5F3FF"
        />
      </View>

      {/* ── RESUMEN MES ── */}
      <View style={[styles.mesCard, STYLES.shadow]}>
        <View style={styles.mesItem}>
          <Text style={styles.mesValor}>{ventasMes.count}</Text>
          <Text style={styles.mesLabel}>ventas este mes</Text>
        </View>
        <View style={styles.mesSep} />
        <View style={styles.mesItem}>
          <Text style={[styles.mesValor, { color: COLORS.success }]}>
            Bs. {Number(ventasMes.total).toFixed(2)}
          </Text>
          <Text style={styles.mesLabel}>ingresos este mes</Text>
        </View>
      </View>

      {/* ── GRÁFICO 7 DÍAS ── */}
      <Text style={styles.sectionTitle}>Ventas últimos 7 días (Bs.)</Text>
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.barChart}>
          {dias7.map((d, i) => (
            <View key={i} style={styles.barCol}>
              {d.total > 0 && (
                <Text style={styles.barValue}>
                  {d.total >= 1000
                    ? `${(d.total / 1000).toFixed(1)}k`
                    : d.total.toFixed(0)}
                </Text>
              )}
              <View style={styles.barWrapper}>
                <View style={[
                  styles.bar,
                  {
                    height: Math.max((d.total / maxVenta) * 100, d.total > 0 ? 6 : 0),
                    backgroundColor: d.esHoy ? COLORS.primary : '#93C5FD',
                  },
                ]} />
              </View>
              <Text style={[styles.barLabel, d.esHoy && styles.barLabelHoy]}>
                {d.dia}
              </Text>
              {d.cantidad > 0 && (
                <Text style={styles.barCantidad}>{d.cantidad}</Text>
              )}
            </View>
          ))}
        </View>
        <View style={styles.barLegend}>
          <View style={[styles.legendDot, { backgroundColor: '#93C5FD' }]} />
          <Text style={styles.legendText}>Días anteriores</Text>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary, marginLeft: 12 }]} />
          <Text style={styles.legendText}>Hoy · Número = cantidad de ventas</Text>
        </View>
      </View>

      {/* ── TOP ARTÍCULOS ── */}
      {topArticulos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏆 Artículos más vendidos</Text>
          <View style={[styles.card, STYLES.shadow]}>
            {topArticulos.map((a, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => navigation.navigate('Articulos', {
                  screen: 'ArticuloDetail', params: { idarticulo: a.idarticulo },
                })}
              >
                <View style={styles.topRow}>
                  <View style={styles.topLeft}>
                    <Text style={styles.topRank}>#{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topNombre} numberOfLines={1}>{a.nombre}</Text>
                      <Text style={styles.topSub}>
                        {a.total_vendido} unid. vendidas · Bs. {Number(a.ingresos).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.topBarBg}>
                    <View style={[
                      styles.topBar,
                      { width: `${(a.total_vendido / maxTop) * 100}%` },
                    ]} />
                  </View>
                </View>
                {i < topArticulos.length - 1 && <View style={styles.divider} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── STOCK BAJO ── */}
      {stockBajoList.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚠️ Artículos con stock bajo</Text>
          <View style={[styles.card, STYLES.shadow]}>
            {stockBajoList.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.stockRow, i < stockBajoList.length - 1 && styles.divider]}
                onPress={() => navigation.navigate('Articulos', {
                  screen: 'ArticuloDetail', params: { idarticulo: a.idarticulo },
                })}
              >
                <Text style={styles.stockNombre} numberOfLines={1}>{a.nombre}</Text>
                <View style={[
                  styles.stockBadge,
                  { backgroundColor: a.stock <= 0 ? '#FEE2E2' : '#FEF3C7' },
                ]}>
                  <Text style={[
                    styles.stockBadgeText,
                    { color: a.stock <= 0 ? COLORS.danger : COLORS.warning },
                  ]}>
                    {a.stock <= 0 ? '❌ Sin stock' : `⚠️ ${a.stock} unid.`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── ÚLTIMAS VENTAS HOY ── */}
      {ultimasVentas.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🕐 Últimas ventas de hoy</Text>
          <View style={[styles.card, STYLES.shadow]}>
            {ultimasVentas.map((v, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.ventaRow, i < ultimasVentas.length - 1 && styles.divider]}
                onPress={() => navigation.navigate('Ventas', {
                  screen: 'VentaDetail', params: { idventa: v.idventa },
                })}
              >
                <View>
                  <Text style={styles.ventaCliente}>{v.cliente_nombre}</Text>
                  <Text style={styles.ventaFecha}>{v.fecha}</Text>
                </View>
                <Text style={styles.ventaTotal}>Bs. {Number(v.total).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── EMPTY STATE ── */}
      {stats.ventasHoy === 0 && topArticulos.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 52, textAlign: 'center' }}>📦</Text>
          <Text style={styles.emptyTitle}>Sin ventas registradas aún</Text>
          <Text style={styles.emptySubtitle}>
            Las estadísticas y gráficos aparecerán automáticamente cuando registres ventas.
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }, STYLES.shadow]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 18,
    marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerFecha: { fontSize: 12, color: '#BFDBFE', marginTop: 3, textTransform: 'capitalize' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.text,
    marginBottom: 8, marginTop: 4,
  },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { borderRadius: 12, padding: 14, alignItems: 'center', width: '47%' },
  statIcon: { fontSize: 26, marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 2 },

  // Mes card
  mesCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  mesItem: { flex: 1, alignItems: 'center' },
  mesValor: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  mesLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  mesSep: { width: 1, height: 40, backgroundColor: COLORS.border },

  // Card genérica
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 6 },

  // Bar chart
  barChart: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', height: 150, paddingHorizontal: 2,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 9, color: COLORS.textLight, marginBottom: 2, textAlign: 'center' },
  barWrapper: { height: 100, justifyContent: 'flex-end', width: '65%' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 5 },
  barLabelHoy: { color: COLORS.primary, fontWeight: '700' },
  barCantidad: { fontSize: 9, color: COLORS.primary, fontWeight: '700' },
  barLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: COLORS.textLight, marginLeft: 4 },

  // Top artículos
  topRow: { paddingVertical: 8 },
  topLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  topRank: { fontSize: 18, fontWeight: '800', color: COLORS.primary, width: 32 },
  topNombre: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  topSub: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  topBarBg: { height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, marginLeft: 32 },
  topBar: { height: 7, backgroundColor: COLORS.primary, borderRadius: 4 },

  // Stock bajo
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  stockNombre: { fontSize: 13, color: COLORS.text, flex: 1, marginRight: 8 },
  stockBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  stockBadgeText: { fontSize: 12, fontWeight: '700' },

  // Últimas ventas
  ventaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  ventaCliente: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  ventaFecha: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  ventaTotal: { fontSize: 15, fontWeight: 'bold', color: COLORS.success },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
