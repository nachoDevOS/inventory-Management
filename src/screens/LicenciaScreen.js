import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { validarLicencia } from '../utils/licencia';

// ── Pantalla de activación ───────────────────────────────────────────────────
export default function LicenciaScreen({ onActivar }) {
  const db = useSQLiteContext();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [activando, setActivando] = useState(false);

  const handleKeyChange = (text) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < clean.length && i < 12; i++) {
      if (i === 4 || i === 8) formatted += '-';
      formatted += clean[i];
    }
    setKey(formatted);
    setError('');
  };

  const activar = async () => {
    if (key.replace(/[-\s]/g, '').length < 12) {
      setError('La clave debe tener 12 caracteres (XXXX-XXXX-XXXX)');
      return;
    }
    if (!validarLicencia(key)) {
      setError('Clave inválida. Verifica que la escribiste correctamente.');
      return;
    }
    setActivando(true);
    try {
      const ahora = new Date().toISOString();
      await db.runAsync(
        "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_activada', '1')"
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_key', ?)", [key.toUpperCase()]
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_fecha_activacion', ?)", [ahora]
      );
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔐 Activación de Licencia</Text>
          <Text style={styles.cardDesc}>
            Esta aplicación requiere una clave de licencia válida. La licencia es válida por{' '}
            <Text style={{ fontWeight: '700', color: '#2563EB' }}>1 año</Text> desde la activación.
          </Text>

          <Text style={styles.inputLabel}>Clave de Licencia</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={key}
            onChangeText={handleKeyChange}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={14}
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
          <Text style={styles.contactoUrl}>www.soluciondigital.dev</Text>
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
          <Text style={styles.contactoUrl}>www.soluciondigital.dev</Text>
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
  subtitle: { fontSize: 14, color: '#2563EB', fontWeight: '600', marginTop: 4, marginBottom: 24 },
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
