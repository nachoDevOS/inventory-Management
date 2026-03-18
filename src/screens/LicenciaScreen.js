import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { validarLicencia, obtenerDeviceCode } from '../utils/licencia';

const WHATSAPP_NUMBER = '59167285914';

// ── Pantalla de activación ───────────────────────────────────────────────────
export default function LicenciaScreen({ onActivar }) {
  const db = useSQLiteContext();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [activando, setActivando] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');

  useEffect(() => {
    obtenerDeviceCode().then(setDeviceCode);
  }, []);

  const handleKeyChange = (text) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Formato nuevo: XXXX-XXXX-SSSS-MM (14 chars) o legacy: XXXX-XXXX-XXXX (12 chars)
    let formatted = '';
    for (let i = 0; i < clean.length && i < 14; i++) {
      if (i === 4 || i === 8 || i === 12) formatted += '-';
      formatted += clean[i];
    }
    setKey(formatted);
    setError('');
  };

  const activar = async () => {
    const cleanKey = key.replace(/[-\s]/g, '');
    if (cleanKey.length !== 12 && cleanKey.length !== 14) {
      setError('La clave debe tener formato XXXX-XXXX-XXXX o XXXX-XXXX-SSSS-MM');
      return;
    }
    const { valida, meses } = validarLicencia(key, deviceCode);
    if (!valida) {
      setError('Clave inválida o no corresponde a este dispositivo.');
      return;
    }
    setActivando(true);
    try {
      const ahora = new Date().toISOString();
      await db.runAsync("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_activada', '1')");
      await db.runAsync("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_key', ?)", [key.toUpperCase()]);
      await db.runAsync("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_fecha_activacion', ?)", [ahora]);
      await db.runAsync("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_meses', ?)", [String(meses)]);
      onActivar();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la activación. Intenta de nuevo.');
    } finally {
      setActivando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.appName}>Inventory Management</Text>
        <Text style={styles.subtitle}>Solución Digital</Text>

        {/* ── Código de dispositivo ── */}
        <View style={styles.deviceCard}>
          <Text style={styles.deviceTitle}>Código de tu dispositivo</Text>
          <Text style={styles.deviceCode}>{deviceCode || '...'}</Text>
          <TouchableOpacity
            style={styles.btnWhatsapp}
            onPress={() => {
              const msg = `Hola, necesito una clave de activación para Inventory Management.\n\nMi código de dispositivo es:\n${deviceCode}`;
              const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
              Linking.openURL(url).catch(() =>
                Alert.alert('Error', 'No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.')
              );
            }}
          >
            <Text style={styles.btnWhatsappText}>💬 Enviar código por WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔐 Activación de Licencia</Text>
          <Text style={styles.cardDesc}>
            Esta aplicación requiere una clave de licencia válida.
            La duración depende del plan contratado. Cada clave solo funciona en un dispositivo.
          </Text>

          <Text style={styles.inputLabel}>Clave de Licencia</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={key}
            onChangeText={handleKeyChange}
            placeholder="XXXX-XXXX-XXXX-XX"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={17}
          />
          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          <TouchableOpacity style={[styles.btnActivar, activando && { opacity: 0.7 }]} onPress={activar} disabled={activando}>
            {activando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnActivarText}>✅ Activar Aplicación</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.contacto}>
          <Text style={styles.contactoTitle}>¿Necesitas una licencia?</Text>
          <Text style={styles.contactoText}>Contacta a Solución Digital</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.soluciondigital.dev')}>
            <Text style={styles.contactoUrl}>www.soluciondigital.dev</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Pantalla de licencia vencida ─────────────────────────────────────────────
export function LicenciaExpiradaScreen({ diasRestantes, fechaExpiracion, onRenovar }) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.appName}>Inventory Management</Text>
        <Text style={styles.subtitle}>Solución Digital</Text>

        <View style={[styles.card, { borderTopWidth: 4, borderTopColor: '#EF4444' }]}>
          <Text style={[styles.cardTitle, { color: '#EF4444' }]}>⏰ Licencia Vencida</Text>
          <Text style={styles.cardDesc}>
            Tu licencia venció el <Text style={{ fontWeight: '700' }}>{fechaExpiracion}</Text>.{'\n'}
            Para continuar usando la aplicación, contacta a Solución Digital para renovar tu licencia anual.
          </Text>

          <View style={styles.vencidoBanner}>
            <Text style={styles.vencidoText}>La app estará bloqueada hasta que ingreses una nueva clave de renovación.</Text>
          </View>

          <TouchableOpacity style={styles.btnRenovar} onPress={onRenovar}>
            <Text style={styles.btnRenovarText}>🔑 Ingresar Clave de Renovación</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contacto}>
          <Text style={styles.contactoTitle}>Renovar licencia:</Text>
          <Text style={styles.contactoText}>Solución Digital</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.soluciondigital.dev')}>
            <Text style={styles.contactoUrl}>www.soluciondigital.dev</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap: {
    width: 90, height: 90, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  logo: { width: 64, height: 64 },
  appName: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#2563EB', fontWeight: '600', marginTop: 4, marginBottom: 16 },
  deviceCard: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, width: '100%',
    marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE',
  },
  deviceTitle: { fontSize: 12, color: '#3B82F6', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  deviceCode: { fontSize: 20, fontWeight: '800', color: '#1E40AF', letterSpacing: 2, marginBottom: 8 },
  deviceHint: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  btnWhatsapp: {
    marginTop: 10, backgroundColor: '#25D366', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center',
  },
  btnWhatsappText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, marginBottom: 20,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1',
    borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '700',
    color: '#1E293B', textAlign: 'center', letterSpacing: 2, marginBottom: 8,
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#EF4444', marginBottom: 12, textAlign: 'center' },
  btnActivar: { backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  btnActivarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  vencidoBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 16 },
  vencidoText: { fontSize: 12, color: '#DC2626', lineHeight: 18, textAlign: 'center' },
  btnRenovar: { backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnRenovarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  contacto: { alignItems: 'center' },
  contactoTitle: { fontSize: 13, color: '#64748B', marginBottom: 2 },
  contactoText: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  contactoUrl: { fontSize: 12, color: '#2563EB', marginTop: 2 },
});
