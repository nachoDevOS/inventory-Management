import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import { COLORS } from '../theme';

// Dashboard
import DashboardScreen from '../screens/dashboard/DashboardScreen';

// Clientes
import ClientesScreen from '../screens/clientes/ClientesScreen';
import ClienteFormScreen from '../screens/clientes/ClienteFormScreen';
import ClienteDetailScreen from '../screens/clientes/ClienteDetailScreen';

// Artículos
import ArticulosScreen from '../screens/articulos/ArticulosScreen';
import ArticuloFormScreen from '../screens/articulos/ArticuloFormScreen';
import ArticuloDetailScreen from '../screens/articulos/ArticuloDetailScreen';
import CompraFormScreen from '../screens/compras/CompraFormScreen';

// Proformas
import ProformasScreen from '../screens/proformas/ProformasScreen';
import ProformaFormScreen from '../screens/proformas/ProformaFormScreen';
import ProformaDetailScreen from '../screens/proformas/ProformaDetailScreen';

// Ventas
import VentasScreen from '../screens/ventas/VentasScreen';
import VentaDetailScreen from '../screens/ventas/VentaDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: 'bold' },
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: 'Panel de Control' }} />
    </Stack.Navigator>
  );
}

function ClientesStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="ClientesList" component={ClientesScreen} options={{ title: 'Clientes' }} />
      <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={({ route }) => ({ title: route.params?.cliente ? 'Editar Cliente' : 'Nuevo Cliente' })} />
      <Stack.Screen name="ClienteDetail" component={ClienteDetailScreen} options={{ title: 'Detalle Cliente' }} />
    </Stack.Navigator>
  );
}

function ArticulosStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="ArticulosList" component={ArticulosScreen} options={{ title: 'Artículos' }} />
      <Stack.Screen name="ArticuloForm" component={ArticuloFormScreen} options={({ route }) => ({ title: route.params?.articulo ? 'Editar Artículo' : 'Nuevo Artículo' })} />
      <Stack.Screen name="ArticuloDetail" component={ArticuloDetailScreen} options={{ title: 'Detalle Artículo' }} />
      <Stack.Screen name="CompraForm" component={CompraFormScreen} options={{ title: 'Agregar Compra / Stock' }} />
      <Stack.Screen name="VentaDetail" component={VentaDetailScreen} options={{ title: 'Detalle Venta' }} />
    </Stack.Navigator>
  );
}

function ProformasStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="ProformasList" component={ProformasScreen} options={{ title: 'Proformas' }} />
      <Stack.Screen name="ProformaForm" component={ProformaFormScreen} options={{ title: 'Nueva Proforma' }} />
      <Stack.Screen name="ProformaDetail" component={ProformaDetailScreen} options={{ title: 'Detalle Proforma' }} />
    </Stack.Navigator>
  );
}

function VentasStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="VentasList" component={VentasScreen} options={{ title: 'Ventas' }} />
      <Stack.Screen name="VentaDetail" component={VentaDetailScreen} options={{ title: 'Detalle Venta' }} />
    </Stack.Navigator>
  );
}

const TabIcon = ({ emoji }) => (
  <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 32, lineHeight: 40, textAlign: 'center' }}>{emoji}</Text>
  </View>
);

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: { paddingBottom: 8, paddingTop: 6, height: 86 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 0 },
        tabBarIconStyle: { marginBottom: 0 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />, tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientesStack}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} />, tabBarLabel: 'Clientes' }}
      />
      <Tab.Screen
        name="Articulos"
        component={ArticulosStack}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} />, tabBarLabel: 'Artículos' }}
      />
      <Tab.Screen
        name="Proformas"
        component={ProformasStack}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />, tabBarLabel: 'Proformas' }}
      />
      <Tab.Screen
        name="Ventas"
        component={VentasStack}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} />, tabBarLabel: 'Ventas' }}
      />
    </Tab.Navigator>
  );
}
