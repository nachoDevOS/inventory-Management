import React, { Suspense } from 'react';
import { ActivityIndicator, View, Text, Image, StyleSheet } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/db';

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.logoContainer}>
        <Image source={require('./assets/icon.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.appName}>Inventory Management</Text>
      <Text style={styles.empresa}>Solución Digital</Text>
      <Text style={styles.web}>www.soluciondigital.dev</Text>
      <ActivityIndicator size="large" color="#2563EB" style={styles.spinner} />
      <Text style={styles.cargando}>Iniciando...</Text>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Suspense fallback={<SplashScreen />}>
        <SQLiteProvider databaseName="gestion.db" onInit={initDatabase} useSuspense>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </SQLiteProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 90,
    height: 90,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  empresa: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 6,
    textAlign: 'center',
  },
  web: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 48,
  },
  cargando: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 10,
  },
});
