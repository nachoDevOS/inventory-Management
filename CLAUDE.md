# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Iniciar en modo desarrollo
npx expo start

# Iniciar limpiando caché (usar cuando hay problemas de módulos)
npx expo start --clear

# Abrir directamente en Android (emulador o dispositivo)
npx expo start --android

# Generar APK de prueba (requiere cuenta expo.dev)
eas build -p android --profile preview

# Generar AAB para Google Play Store
eas build -p android --profile production

# Ver estado del build
eas build:list
```

## Arquitectura general

App React Native (Expo SDK 55) con base de datos **SQLite local** (expo-sqlite v15). Todo el estado de la app vive en SQLite — no hay estado global ni Context adicional. Cada pantalla consulta la DB directamente con `useSQLiteContext()`.

### Flujo de navegación

```
Bottom Tab Navigator (5 tabs)
├── Dashboard     → DashboardStack  → DashboardScreen
├── Clientes      → ClientesStack   → ClientesScreen / ClienteFormScreen / ClienteDetailScreen
├── Artículos     → ArticulosStack  → ArticulosScreen / ArticuloFormScreen / ArticuloDetailScreen / CompraFormScreen / VentaDetailScreen
├── Proformas     → ProformasStack  → ProformasScreen / ProformaFormScreen / ProformaDetailScreen
└── Ventas        → VentasStack     → VentasScreen / VentaDetailScreen
```

### Base de datos (`src/database/db.js`)

Schema SQLite con 7 tablas:

| Tabla | Propósito |
|-------|-----------|
| `clientes` | Datos del cliente (CI, nombre, celular, correo, referencia) |
| `articulos` | Catálogo de productos (nombre, detalle, imagen URI) |
| `compras` | Entradas de stock (precio_compra, precio_envio, precio_venta_sugerido, cantidad) |
| `proformas` | Cotizaciones (cliente, fecha, estado: pendiente/aprobada/convertida/rechazada) |
| `proforma_detalle` | Items de proforma (cantidad, precio_cotizacion, descuento%, subtotal) |
| `ventas` | Ventas confirmadas (puede venir de proforma o crearse directo) |
| `venta_detalle` | Items de venta (cantidad, precio_venta, descuento%, subtotal) |

**Stock calculado dinámicamente** (no almacenado):
```sql
stock = SUM(compras.cantidad) - SUM(venta_detalle.cantidad)
```

**Descuento**: `subtotal = cantidad × precio × (1 - descuento/100)`

**Migraciones**: Se usan `try/catch` en `ALTER TABLE ADD COLUMN` para compatibilidad con instalaciones previas.

### Calculadora de ganancia (CompraFormScreen)

```
envio_x_unidad  = precio_envio / cantidad
costo_x_unidad  = precio_compra + envio_x_unidad
ganancia_unit   = precio_venta_sugerido - costo_x_unidad
margen_%        = (ganancia_unit / costo_x_unidad) × 100
```

Se muestra en tiempo real mientras el usuario escribe.

### Generación de PDF (`src/utils/generarPdfProforma.js`)

Usa `expo-print` para generar HTML→PDF y `expo-sharing` para compartir. El PDF incluye branding "Soluciones Tecnológicas / Inventory Management" y footer "Solución Digital — soluciondigital.dev".

## Convenciones clave

- **Tema**: todos los colores y sombras están en `src/theme.js` (COLORS, STYLES).
- **Pantallas**: cada módulo en `src/screens/<modulo>/`. Las pantallas de formulario terminan en `FormScreen`, las de detalle en `DetailScreen`.
- **Navegación cross-tab**: usar `navigation.navigate('NombreTab', { screen: 'NombrePantalla', params: {...} })`.
- **Datos**: siempre `useFocusEffect` + `useCallback` para recargar al volver a una pantalla.
- **Imágenes de artículos**: se guardan como URI local en el campo `imagen` de la tabla `articulos`.
