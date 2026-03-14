/**
 * DashboardScreen — Panel de control principal
 *
 * Secciones:
 *  - Resumen del día (ventas, ingresos, proformas pendientes, clientes)
 *  - Ganancia estimada (ingresos - costo de compra prorrateado)
 *  - Resumen del mes
 *  - Gráfico barras: ventas últimos 7 días
 *  - Top 5 artículos más vendidos
 *  - Alertas stock bajo
 *  - Últimas ventas del día
 *  - Botón exportar reporte PDF
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { STYLES } from '../../theme';
import { generarYCompartirReporte } from '../../utils/generarPdfReporte';
import { verificarExpiracion } from '../../utils/licencia';

const { width: SW } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const db = useSQLiteContext();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [stats, setStats] = useState({ ventasHoy: 0, ingresosHoy: 0, proformasPendientes: 0, totalClientes: 0 });
  const [gananciaHoy, setGananciaHoy] = useState(0);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [topArticulos, setTopArticulos] = useState([]);
  const [stockBajoList, setStockBajoList] = useState([]);
  const [ultimasVentas, setUltimasVentas] = useState([]);
  const [ventasMes, setVentasMes] = useState({ total: 0, count: 0 });
  const [gananciasMes, setGananciasMes] = useState(0);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [stockMinimo, setStockMinimo] = useState(3);
  const [negocio, setNegocio] = useState('Soluciones Tecnológicas');
  const [negocioData, setNegocioData] = useState({});
  const [licencia, setLicencia] = useState(null);

  const cargar = useCallback(async () => {
    // Configuración
    const cfgMin = await db.getFirstAsync("SELECT valor FROM configuracion WHERE clave='stock_minimo'");
    const cfgRows = await db.getAllAsync("SELECT clave, valor FROM configuracion WHERE clave IN ('nombre_negocio','telefono','direccion','nit')");
    const cfgMap = {};
    cfgRows.forEach(r => { cfgMap[r.clave] = r.valor; });
    const minStock = parseInt(cfgMin?.valor || '3');
    setStockMinimo(minStock);
    setNegocio(cfgMap.nombre_negocio || 'Soluciones Tecnológicas');
    setNegocioData(cfgMap);

    const exp = await verificarExpiracion(db);
    setLicencia(exp);

    // Stats hoy
    const hoy = await db.getFirstAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
      FROM ventas WHERE DATE(fecha,'localtime') = DATE('now','localtime')
    `);

    // Ganancia estimada hoy
    // = SUM(vd.subtotal) - SUM(vd.cantidad * costo_unitario)
    // costo_unitario = precio_compra + precio_envio/cantidad_lote (última compra)
    const ganHoy = await db.getFirstAsync(`
      SELECT COALESCE(SUM(
        vd.subtotal - vd.cantidad * (
          COALESCE((
            SELECT c.precio_compra + c.precio_envio / MAX(c.cantidad, 1)
            FROM compras c WHERE c.idarticulo = vd.idarticulo
            ORDER BY c.fecha DESC LIMIT 1
          ), 0)
        )
      ), 0) as ganancia
      FROM venta_detalle vd
      JOIN ventas v ON v.idventa = vd.idventa
      WHERE DATE(v.fecha,'localtime') = DATE('now','localtime')
    `);

    // Stats mes
    const mes = await db.getFirstAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
      FROM ventas WHERE strftime('%Y-%m',fecha) = strftime('%Y-%m','now','localtime')
    `);

    // Ganancia estimada mes
    const ganMes = await db.getFirstAsync(`
      SELECT COALESCE(SUM(
        vd.subtotal - vd.cantidad * (
          COALESCE((
            SELECT c.precio_compra + c.precio_envio / MAX(c.cantidad, 1)
            FROM compras c WHERE c.idarticulo = vd.idarticulo
            ORDER BY c.fecha DESC LIMIT 1
          ), 0)
        )
      ), 0) as ganancia
      FROM venta_detalle vd
      JOIN ventas v ON v.idventa = vd.idventa
      WHERE strftime('%Y-%m',v.fecha) = strftime('%Y-%m','now','localtime')
    `);

    const pendientes = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM proformas WHERE estado='pendiente'`
    );
    const clientes = await db.getFirstAsync(`SELECT COUNT(*) as count FROM clientes`);

    // Ventas últimos 7 días
    const semana = await db.getAllAsync(`
      SELECT DATE(fecha,'localtime') as dia,
             COALESCE(SUM(total),0) as total, COUNT(*) as cantidad
      FROM ventas
      WHERE DATE(fecha,'localtime') >= DATE('now','localtime','-6 days')
      GROUP BY DATE(fecha,'localtime') ORDER BY dia ASC
    `);

    // Top 5 artículos
    const top = await db.getAllAsync(`
      SELECT a.idarticulo, a.nombre,
             SUM(vd.cantidad) as total_vendido, SUM(vd.subtotal) as ingresos
      FROM venta_detalle vd JOIN articulos a ON a.idarticulo = vd.idarticulo
      GROUP BY vd.idarticulo ORDER BY total_vendido DESC LIMIT 5
    `);

    // Stock bajo
    const bajo = await db.getAllAsync(`
      SELECT a.idarticulo, a.nombre,
        (COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo=a.idarticulo),0) -
         COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo=a.idarticulo),0)) as stock
      FROM articulos a
      WHERE (COALESCE((SELECT SUM(c.cantidad) FROM compras c WHERE c.idarticulo=a.idarticulo),0) -
             COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.idarticulo=a.idarticulo),0)) < ?
      ORDER BY stock ASC LIMIT 8
    `, [minStock]);

    // Últimas ventas del día
    const ultimas = await db.getAllAsync(`
      SELECT v.idventa, v.total, v.fecha, c.nombre as cliente_nombre
      FROM ventas v JOIN clientes c ON c.idcliente=v.idcliente
      WHERE DATE(v.fecha,'localtime') = DATE('now','localtime')
      ORDER BY v.fecha DESC LIMIT 5
    `);

    setStats({ ventasHoy: hoy?.count||0, ingresosHoy: hoy?.total||0, proformasPendientes: pendientes?.count||0, totalClientes: clientes?.count||0 });
    setGananciaHoy(ganHoy?.ganancia || 0);
    setVentasMes({ total: mes?.total||0, count: mes?.count||0 });
    setGananciasMes(ganMes?.ganancia || 0);
    setVentasSemana(semana);
    setTopArticulos(top);
    setStockBajoList(bajo);
    setUltimasVentas(ultimas);
  }, [db]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const exportarPDF = async (periodo) => {
    setGenerandoPDF(true);
    try {
      let ventas, titulo, periodoStr;
      if (periodo === 'hoy') {
        ventas = ultimasVentas.length > 0 ? await db.getAllAsync(`
          SELECT v.idventa, v.total, v.fecha, c.nombre as cliente_nombre
          FROM ventas v JOIN clientes c ON c.idcliente=v.idcliente
          WHERE DATE(v.fecha,'localtime')=DATE('now','localtime') ORDER BY v.fecha DESC
        `) : [];
        titulo = 'Reporte de Hoy';
        periodoStr = new Date().toLocaleDateString('es-BO', { year:'numeric', month:'long', day:'numeric' });
      } else {
        ventas = await db.getAllAsync(`
          SELECT v.idventa, v.total, v.fecha, c.nombre as cliente_nombre
          FROM ventas v JOIN clientes c ON c.idcliente=v.idcliente
          WHERE strftime('%Y-%m',v.fecha)=strftime('%Y-%m','now','localtime') ORDER BY v.fecha DESC
        `);
        titulo = 'Reporte del Mes';
        periodoStr = new Date().toLocaleDateString('es-BO', { year:'numeric', month:'long' });
      }
      await generarYCompartirReporte({
        titulo, periodo: periodoStr, ventas,
        gananciaEst: periodo === 'hoy' ? gananciaHoy : gananciasMes,
        negocio,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el reporte');
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Construir array de 7 días
  const ahora = new Date();
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ahora); d.setDate(ahora.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const found = ventasSemana.find(v => v.dia === iso);
    return { dia: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()], total: found?.total||0, cantidad: found?.cantidad||0, esHoy: i===6 };
  });
  const maxVenta = Math.max(...dias7.map(d => d.total), 1);
  const maxTop = Math.max(...topArticulos.map(a => a.total_vendido), 1);
  const fechaHoy = ahora.toLocaleDateString('es-BO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const margenHoy = stats.ingresosHoy > 0 ? (gananciaHoy / stats.ingresosHoy) * 100 : 0;
  const margenMes = ventasMes.total > 0 ? (gananciasMes / ventasMes.total) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de Control</Text>
          <Text style={styles.headerFecha}>{fechaHoy}</Text>
        </View>
        <Text style={{ fontSize: 26 }}>📊</Text>
      </View>

      {/* ── Licencia ── */}
      {licencia && (() => {
        const d = licencia.diasRestantes;
        const urgente = d <= 15;
        const advertencia = d <= 30 && d > 15;
        const bg = urgente ? '#FEF2F2' : advertencia ? '#FFF7ED' : '#F0FDF4';
        const color = urgente ? '#DC2626' : advertencia ? '#D97706' : '#16A34A';
        const icono = urgente ? '🔴' : advertencia ? '🟡' : '🟢';
        return (
          <View style={[styles.licenciaCard, { backgroundColor: bg, borderColor: color }]}>
            <Text style={[styles.licenciaText, { color }]}>
              {icono}  Licencia: <Text style={{ fontWeight: '800' }}>{d} día{d !== 1 ? 's' : ''} restante{d !== 1 ? 's' : ''}</Text>
              {licencia.fechaExpiracion ? `  ·  vence ${licencia.fechaExpiracion}` : ''}
            </Text>
          </View>
        );
      })()}

      {/* ── Stats hoy ── */}
      <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="🛒" label="Ventas hoy" value={String(stats.ventasHoy)} color={COLORS.primary} bg={COLORS.card} styles={styles} />
        <StatCard icon="💰" label="Ingresos hoy" value={`Bs. ${Number(stats.ingresosHoy).toFixed(2)}`} color={COLORS.success} bg={COLORS.card} styles={styles} />
        <StatCard icon="📈" label="Ganancia est." value={`Bs. ${Number(gananciaHoy).toFixed(2)}`} color={gananciaHoy >= 0 ? COLORS.success : COLORS.danger} bg={COLORS.card} styles={styles} />
        <StatCard icon="📋" label="Proformas pend." value={String(stats.proformasPendientes)} color={COLORS.warning} bg={COLORS.card} styles={styles} />
      </View>

      {/* ── Ganancia hoy ── */}
      {stats.ventasHoy > 0 && (
        <View style={[styles.gananciaCard, STYLES.shadow]}>
          <Text style={styles.gananciaTitle}>💡 Rentabilidad de Hoy</Text>
          <View style={styles.gananciaRow}>
            <View style={styles.gananciaItem}>
              <Text style={styles.gananciaLabel}>Ingresos</Text>
              <Text style={[styles.gananciaValor, { color: COLORS.primary }]}>Bs. {Number(stats.ingresosHoy).toFixed(2)}</Text>
            </View>
            <Text style={styles.gananciaOp}>−</Text>
            <View style={styles.gananciaItem}>
              <Text style={styles.gananciaLabel}>Costo est.</Text>
              <Text style={[styles.gananciaValor, { color: COLORS.danger }]}>Bs. {Number(stats.ingresosHoy - gananciaHoy).toFixed(2)}</Text>
            </View>
            <Text style={styles.gananciaOp}>=</Text>
            <View style={styles.gananciaItem}>
              <Text style={styles.gananciaLabel}>Ganancia</Text>
              <Text style={[styles.gananciaValor, { color: COLORS.success, fontSize: 18 }]}>Bs. {Number(gananciaHoy).toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.margenBadge}>
            <Text style={styles.margenText}>Margen estimado: {margenHoy.toFixed(1)}%</Text>
          </View>
        </View>
      )}

      {/* ── Resumen mes ── */}
      <View style={[styles.mesCard, STYLES.shadow]}>
        <View style={styles.mesItem}>
          <Text style={styles.mesValor}>{ventasMes.count}</Text>
          <Text style={styles.mesLabel}>ventas este mes</Text>
        </View>
        <View style={styles.mesSep} />
        <View style={styles.mesItem}>
          <Text style={[styles.mesValor, { color: COLORS.success }]}>Bs. {Number(ventasMes.total).toFixed(2)}</Text>
          <Text style={styles.mesLabel}>ingresos del mes</Text>
        </View>
        <View style={styles.mesSep} />
        <View style={styles.mesItem}>
          <Text style={[styles.mesValor, { color: COLORS.primary }]}>{margenMes.toFixed(1)}%</Text>
          <Text style={styles.mesLabel}>margen est.</Text>
        </View>
      </View>

      {/* ── Exportar PDF ── */}
      <View style={styles.pdfRow}>
        <TouchableOpacity
          style={[styles.btnPDF, { backgroundColor: '#7C3AED', flex: 1 }]}
          onPress={() => exportarPDF('hoy')} disabled={generandoPDF}
        >
          {generandoPDF ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPDFText}>📄 PDF Hoy</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPDF, { backgroundColor: COLORS.primary, flex: 1 }]}
          onPress={() => exportarPDF('mes')} disabled={generandoPDF}
        >
          {generandoPDF ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPDFText}>📄 PDF Mes</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Gráfico 7 días ── */}
      <Text style={styles.sectionTitle}>Ventas últimos 7 días (Bs.)</Text>
      <View style={[styles.card, STYLES.shadow]}>
        <View style={styles.barChart}>
          {dias7.map((d, i) => (
            <View key={i} style={styles.barCol}>
              {d.total > 0 && <Text style={styles.barValue}>{d.total >= 1000 ? `${(d.total/1000).toFixed(1)}k` : d.total.toFixed(0)}</Text>}
              <View style={styles.barWrapper}>
                <View style={[styles.bar, { height: Math.max((d.total/maxVenta)*100, d.total>0?6:0), backgroundColor: d.esHoy ? COLORS.primary : COLORS.border }]} />
              </View>
              <Text style={[styles.barLabel, d.esHoy && { color: COLORS.primary, fontWeight:'700' }]}>{d.dia}</Text>
              {d.cantidad > 0 && <Text style={styles.barCant}>{d.cantidad}</Text>}
            </View>
          ))}
        </View>
        <View style={styles.barLegend}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.border }]} />
          <Text style={styles.legendText}>Días anteriores</Text>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary, marginLeft: 12 }]} />
          <Text style={styles.legendText}>Hoy · Número = ventas</Text>
        </View>
      </View>

      {/* ── Top artículos ── */}
      {topArticulos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏆 Artículos más vendidos</Text>
          <View style={[styles.card, STYLES.shadow]}>
            {topArticulos.map((a, i) => (
              <TouchableOpacity key={i} onPress={() => navigation.navigate('Articulos', { screen:'ArticuloDetail', params:{ idarticulo: a.idarticulo } })}>
                <View style={[styles.topRow, i < topArticulos.length - 1 && styles.divider]}>
                  <View style={styles.topLeft}>
                    <Text style={styles.topRank}>#{i+1}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={styles.topNombre} numberOfLines={1}>{a.nombre}</Text>
                      <Text style={styles.topSub}>{a.total_vendido} unid. · Bs. {Number(a.ingresos).toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={styles.topBarBg}>
                    <View style={[styles.topBar, { width:`${(a.total_vendido/maxTop)*100}%` }]} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Stock bajo ── */}
      {stockBajoList.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚠️ Stock bajo (menos de {stockMinimo} unidades)</Text>
          <View style={[styles.card, STYLES.shadow]}>
            {stockBajoList.map((a, i) => (
              <TouchableOpacity key={i} style={[styles.stockRow, i < stockBajoList.length-1 && styles.divider]}
                onPress={() => navigation.navigate('Articulos', { screen:'ArticuloDetail', params:{ idarticulo: a.idarticulo } })}>
                <Text style={styles.stockNombre} numberOfLines={1}>{a.nombre}</Text>
                <View style={[styles.stockBadge, { backgroundColor: a.stock<=0 ? '#FEE2E2' : '#FEF3C7' }]}>
                  <Text style={[styles.stockBadgeText, { color: a.stock<=0 ? COLORS.danger : COLORS.warning }]}>
                    {a.stock<=0 ? '❌ Sin stock' : `⚠️ ${a.stock} unid.`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Últimas ventas del día ── */}
      {ultimasVentas.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🕐 Últimas ventas de hoy</Text>
          <View style={[styles.card, STYLES.shadow]}>
            {ultimasVentas.map((v, i) => (
              <TouchableOpacity key={i} style={[styles.ventaRow, i < ultimasVentas.length-1 && styles.divider]}
                onPress={() => navigation.navigate('Ventas', { screen:'VentaDetail', params:{ idventa: v.idventa } })}>
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

      {stats.ventasHoy === 0 && topArticulos.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 52, textAlign:'center' }}>📦</Text>
          <Text style={styles.emptyTitle}>Sin ventas registradas aún</Text>
          <Text style={styles.emptySub}>Las estadísticas aparecerán automáticamente cuando registres ventas.</Text>
        </View>
      )}

      {/* ── Footer negocio ── */}
      <View style={styles.footerCard}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerNegocio}>{negocio}</Text>
        {negocioData.nit ? <Text style={styles.footerDato}>NIT: {negocioData.nit}</Text> : null}
        {negocioData.direccion ? <Text style={styles.footerDato}>📍 {negocioData.direccion}</Text> : null}
        {negocioData.telefono ? <Text style={styles.footerDato}>📞 {negocioData.telefono}</Text> : null}
      </View>

      {/* ── Publicidad Solución Digital ── */}
      <View style={styles.adCard}>
        <View style={styles.adTop}>
          <View style={styles.adLogoBox}>
            <Text style={styles.adLogoText}>SD</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.adBrand}>Solución Digital</Text>
            <Text style={styles.adTagline}>Transformamos tu negocio con tecnología</Text>
          </View>
        </View>
        <View style={styles.adDivider} />
        <Text style={styles.adDesc}>
          ¿Necesitas una app para tu empresa? Desarrollamos sistemas a medida: inventarios, ventas, facturación y más.
        </Text>
        <View style={styles.adFeatures}>
          <Text style={styles.adFeatureItem}>📱 Apps móviles</Text>
          <Text style={styles.adFeatureItem}>🖥️ Sistemas web</Text>
          <Text style={styles.adFeatureItem}>🗄️ Bases de datos</Text>
        </View>
        <View style={styles.adFooter}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.soluciondigital.dev')}>
            <Text style={styles.adWeb}>🌐 soluciondigital.dev</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
}

function StatCard({ icon, label, value, color, styles }) {
  return (
    <View style={[styles.statCard, STYLES.shadow]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex:1, backgroundColor: C.bg },
    header: { backgroundColor: C.primary, borderRadius:10, padding:11, marginBottom:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
    headerTitle: { fontSize:16, fontWeight:'800', color:'#fff' },
    headerFecha: { fontSize:10, color:'#BFDBFE', marginTop:2, textTransform:'capitalize' },
    sectionTitle: { fontSize:14, fontWeight:'700', color: C.text, marginBottom:8, marginTop:4 },
    statsGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:14 },
    statCard: { borderRadius:12, padding:14, alignItems:'center', width:'47%', backgroundColor: C.card },
    statIcon: { fontSize:26, marginBottom:4 },
    statValue: { fontSize:17, fontWeight:'800' },
    statLabel: { fontSize:11, color: C.textLight, textAlign:'center', marginTop:2 },
    // Ganancia card
    gananciaCard: { backgroundColor: C.card, borderRadius:12, padding:16, marginBottom:14 },
    gananciaTitle: { fontSize:14, fontWeight:'700', color: C.text, marginBottom:12 },
    gananciaRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
    gananciaItem: { alignItems:'center', flex:1 },
    gananciaLabel: { fontSize:11, color: C.textLight },
    gananciaValor: { fontSize:15, fontWeight:'800', marginTop:2 },
    gananciaOp: { fontSize:20, color: C.textLight, fontWeight:'300' },
    margenBadge: { backgroundColor:'#EFF6FF', borderRadius:8, padding:8, marginTop:10, alignItems:'center' },
    margenText: { fontSize:13, fontWeight:'700', color: C.primary },
    // Mes card
    mesCard: { backgroundColor: C.card, borderRadius:12, padding:16, flexDirection:'row', alignItems:'center', marginBottom:14 },
    mesItem: { flex:1, alignItems:'center' },
    mesValor: { fontSize:17, fontWeight:'800', color: C.primary },
    mesLabel: { fontSize:10, color: C.textLight, marginTop:2, textAlign:'center' },
    mesSep: { width:1, height:36, backgroundColor: C.border },
    // PDF
    pdfRow: { flexDirection:'row', gap:10, marginBottom:16 },
    btnPDF: { borderRadius:10, padding:12, alignItems:'center' },
    btnPDFText: { color:'#fff', fontWeight:'700', fontSize:13 },
    // Card
    card: { backgroundColor: C.card, borderRadius:12, padding:16, marginBottom:16 },
    divider: { borderBottomWidth:1, borderBottomColor: C.border, marginVertical:6 },
    // Bar chart
    barChart: { flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', height:150, paddingHorizontal:2 },
    barCol: { flex:1, alignItems:'center' },
    barValue: { fontSize:9, color: C.textLight, marginBottom:2, textAlign:'center' },
    barWrapper: { height:100, justifyContent:'flex-end', width:'65%' },
    bar: { width:'100%', borderRadius:4 },
    barLabel: { fontSize:10, color: C.textLight, marginTop:5 },
    barCant: { fontSize:9, color: C.primary, fontWeight:'700' },
    barLegend: { flexDirection:'row', alignItems:'center', marginTop:10, flexWrap:'wrap' },
    legendDot: { width:10, height:10, borderRadius:5 },
    legendText: { fontSize:10, color: C.textLight, marginLeft:4 },
    // Top
    topRow: { paddingVertical:8 },
    topLeft: { flexDirection:'row', alignItems:'center', marginBottom:6 },
    topRank: { fontSize:18, fontWeight:'800', color: C.primary, width:32 },
    topNombre: { fontSize:13, fontWeight:'600', color: C.text },
    topSub: { fontSize:11, color: C.textLight, marginTop:1 },
    topBarBg: { height:7, backgroundColor: C.border, borderRadius:4, marginLeft:32 },
    topBar: { height:7, backgroundColor: C.primary, borderRadius:4 },
    // Stock
    stockRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10 },
    stockNombre: { fontSize:13, color: C.text, flex:1, marginRight:8 },
    stockBadge: { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
    stockBadgeText: { fontSize:12, fontWeight:'700' },
    // Ventas
    ventaRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10 },
    ventaCliente: { fontSize:13, fontWeight:'600', color: C.text },
    ventaFecha: { fontSize:11, color: C.textLight, marginTop:2 },
    ventaTotal: { fontSize:15, fontWeight:'bold', color: C.success },
    // Empty
    empty: { alignItems:'center', paddingVertical:32, paddingHorizontal:16 },
    emptyTitle: { fontSize:16, fontWeight:'600', color: C.text, marginTop:14 },
    emptySub: { fontSize:13, color: C.textLight, textAlign:'center', marginTop:6, lineHeight:20 },
    // Licencia
    licenciaCard: { borderRadius: 8, borderWidth: 1, padding: 7, marginBottom: 14, alignItems: 'center' },
    licenciaText: { fontSize: 11, fontWeight: '600' },
    // Footer negocio
    footerCard: { alignItems:'center', paddingVertical:16, paddingHorizontal:16, marginBottom:12 },
    footerDivider: { height:1, backgroundColor: C.border, width:'100%', marginBottom:14 },
    footerNegocio: { fontSize:15, fontWeight:'800', color: C.text, textAlign:'center' },
    footerDato: { fontSize:12, color: C.textLight, marginTop:4, textAlign:'center' },
    // Publicidad
    adCard: { borderRadius:14, padding:16, marginBottom:8, backgroundColor:'#0F172A', borderWidth:1, borderColor:'#1E40AF' },
    adTop: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 },
    adLogoBox: { width:44, height:44, borderRadius:10, backgroundColor:'#2563EB', alignItems:'center', justifyContent:'center' },
    adLogoText: { color:'#fff', fontWeight:'900', fontSize:16 },
    adBrand: { fontSize:16, fontWeight:'800', color:'#fff' },
    adTagline: { fontSize:11, color:'#93C5FD', marginTop:2 },
    adDivider: { height:1, backgroundColor:'#1E3A5F', marginBottom:12 },
    adDesc: { fontSize:12, color:'#CBD5E1', lineHeight:18, marginBottom:12 },
    adFeatures: { flexDirection:'row', gap:8, flexWrap:'wrap', marginBottom:12 },
    adFeatureItem: { fontSize:11, color:'#93C5FD', backgroundColor:'#1E3A5F', paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
    adFooter: { alignItems:'center' },
    adWeb: { fontSize:13, fontWeight:'700', color:'#60A5FA' },
  });
}
