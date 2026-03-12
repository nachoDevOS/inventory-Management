# Inventory Management

App móvil de gestión de inventario desarrollada con **React Native + Expo**, con base de datos **SQLite local** (sin internet requerido).

Desarrollado por **[Solución Digital](https://www.soluciondigital.dev/)** para **Soluciones Tecnológicas**.

---

## Funcionalidades

### 📊 Dashboard — Panel de Control
- Resumen de ventas del día (cantidad e ingresos)
- Ingresos y número de ventas del mes actual
- Gráfico de barras: ventas de los últimos 7 días (Bs. y cantidad)
- Top 5 artículos más vendidos (barras de progreso + ingresos)
- Alertas de stock bajo (artículos con menos de 3 unidades)
- Últimas ventas del día con acceso directo al detalle

### 👥 Clientes
- CRUD completo: nombre, CI, celular, correo, contacto de referencia, detalle
- Búsqueda en tiempo real
- Detalle del cliente con historial de proformas y ventas vinculadas

### 📦 Artículos e Inventario
- CRUD completo con foto (cámara o galería)
- Stock calculado dinámicamente: `compras - ventas`
- Detalle del artículo con dos pestañas:
  - **Compras**: historial de todas las entradas de stock
  - **Ventas**: historial completo de ventas de ese artículo (cliente, fecha, precio, descuento, subtotal)
- Resumen: unidades compradas, unidades vendidas, ingresos totales

### 🛒 Registro de Compras / Stock
- Campos: cantidad, precio compra por unidad, precio envío total, precio venta sugerido
- **Calculadora de ganancia en tiempo real**:
  - Costo envío prorrateado: `precio_envio ÷ cantidad`
  - Costo real por unidad: `precio_compra + (precio_envio ÷ cantidad)`
  - Ganancia por unidad en Bs. y porcentaje de margen
  - Ganancia total estimada del lote
  - Advertencia si el precio de venta genera pérdida
  - Sugerencia de precio mínimo de venta

  **Ejemplo**: cantidad=5, compra=Bs.70, envío=Bs.50, venta=Bs.100
  ```
  Envío por unidad = 50 ÷ 5 = Bs. 10
  Costo real       = 70 + 10 = Bs. 80
  Ganancia unit.   = 100 - 80 = Bs. 20
  Margen           = (20 ÷ 80) × 100 = 25%
  Ganancia lote    = 20 × 5 = Bs. 100
  ```

### 📋 Proformas (Cotizaciones)
- Creación con selector de cliente y artículos
- Descuento por ítem (%)
- Desglose: subtotal bruto, descuentos aplicados, total
- Estados: `pendiente` → `aprobada` → `convertida` / `rechazada`
- **Exportar a PDF** (compartir por WhatsApp, email, etc.)
- Convertir proforma aprobada en venta directamente

### 💰 Ventas
- Lista con totales y filtro por cliente
- Detalle completo: artículos, precios, descuentos, ahorro
- Eliminar venta (restaura el estado de la proforma vinculada a `aprobada`)

---

## Tecnologías

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Expo SDK | 55 | Framework principal |
| React Native | 0.83 | UI nativa |
| expo-sqlite | 15 | Base de datos local SQLite |
| React Navigation | 7 | Navegación (Stack + Bottom Tabs) |
| expo-print | 55 | Generación de PDF desde HTML |
| expo-sharing | 55 | Compartir archivos |
| expo-image-picker | 55 | Fotos desde cámara/galería |

---

## Estructura del proyecto

```
appMovil/
├── App.js                          # Entry point: SQLiteProvider + NavigationContainer
├── app.json                        # Configuración Expo (nombre, iconos, plugins)
├── eas.json                        # Configuración de builds EAS
├── assets/
│   ├── icon.png                    # Ícono de la app (también usado como adaptive icon Android)
│   └── splash-icon.png             # Pantalla de carga
└── src/
    ├── theme.js                    # COLORS y STYLES compartidos
    ├── database/
    │   └── db.js                   # initDatabase: CREATE TABLE + migraciones
    ├── navigation/
    │   └── AppNavigator.js         # Bottom tabs + stacks de cada módulo
    ├── screens/
    │   ├── dashboard/
    │   │   └── DashboardScreen.js  # Panel principal con gráficos
    │   ├── clientes/               # ClientesScreen, ClienteFormScreen, ClienteDetailScreen
    │   ├── articulos/              # ArticulosScreen, ArticuloFormScreen, ArticuloDetailScreen
    │   ├── compras/
    │   │   └── CompraFormScreen.js # Registro de stock con calculadora de ganancia
    │   ├── proformas/              # ProformasScreen, ProformaFormScreen, ProformaDetailScreen
    │   └── ventas/                 # VentasScreen, VentaDetailScreen
    └── utils/
        └── generarPdfProforma.js   # Generación y compartición de PDF
```

---

## Schema de Base de Datos

```sql
clientes        (idcliente, carnet_identidad, nombre, celular, correo, contacto_referencia, detalle, fecha_registro)
articulos       (idarticulo, imagen, nombre, detalle)
compras         (idcompra, idarticulo, cantidad, precio_compra, precio_envio, precio_venta_sugerido, fecha, detalle)
proformas       (idproforma, idcliente, fecha, estado, detalle)
proforma_detalle(iddetalle, idproforma, idarticulo, cantidad, precio_cotizacion, descuento, subtotal)
ventas          (idventa, idproforma?, idcliente, fecha, total, detalle)
venta_detalle   (iddetalle, idventa, idarticulo, cantidad, precio_venta, descuento, subtotal)
```

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar con Expo Go (escanear QR con la app Expo Go)
npx expo start

# Si hay problemas de caché
npx expo start --clear
```

### Generar APK para Android

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Iniciar sesión (crear cuenta gratis en expo.dev)
eas login

# Configurar (solo la primera vez)
eas build:configure

# Generar APK instalable
eas build -p android --profile preview

# Descargar en expo.dev → Projects → Builds
```

---

## Créditos

Desarrollado por **[Solución Digital](https://www.soluciondigital.dev/)**
Para **Soluciones Tecnológicas** — Sistema de Gestión de Inventario
