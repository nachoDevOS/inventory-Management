# Documentación del Sistema — Inventory Management
> Desarrollado por Solución Digital — soluciondigital.dev

---

## 1. ¿Qué es esta app?

Aplicación móvil de gestión de inventario para Android. Permite administrar clientes, artículos, stock, cotizaciones (proformas) y ventas. Funciona 100% offline — no necesita internet para operar.

---

## 2. Tecnologías utilizadas

| Tecnología | Versión | Para qué se usa |
|------------|---------|-----------------|
| **React Native** | 0.83.2 | Framework principal de la app |
| **Expo** | SDK 55 | Herramientas de desarrollo y build |
| **JavaScript (JS)** | ES2022 | Lenguaje de programación |
| **SQLite** | expo-sqlite v15 | Base de datos local en el celular |
| **React Navigation** | v7 | Navegación entre pantallas |
| **expo-print** | ~55 | Generar PDFs |
| **expo-sharing** | ~55 | Compartir PDFs por WhatsApp, etc. |
| **expo-image-picker** | ~55 | Seleccionar fotos de la galería/cámara |
| **expo-application** | ~55 | Obtener ID único del dispositivo (licencias) |

---

## 3. Requisitos para desarrollar

### Software necesario
- **Node.js** v18 o superior → https://nodejs.org
- **Android Studio** → para el emulador y SDK de Android
- **Expo Go** (en el celular) → para probar en tiempo real

### Variables de entorno necesarias al compilar
```cmd
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
```

### Instalar dependencias (primera vez)
```cmd
npm install
```

### Iniciar en modo desarrollo
```cmd
npx expo start
```

### Iniciar limpiando caché (cuando hay errores raros)
```cmd
npx expo start --clear
```

---

## 4. Estructura de carpetas

```
appMovil/
├── src/
│   ├── context/
│   │   └── ThemeContext.js        → Modo claro/oscuro, colores globales
│   ├── database/
│   │   └── db.js                  → Schema SQLite + migraciones
│   ├── navigation/
│   │   └── AppNavigator.js        → Toda la navegación de la app
│   ├── screens/
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.js → Pantalla principal con resumen
│   │   ├── clientes/
│   │   │   ├── ClientesScreen.js       → Lista de clientes
│   │   │   ├── ClienteFormScreen.js    → Crear/editar cliente
│   │   │   └── ClienteDetailScreen.js  → Ver detalle del cliente
│   │   ├── articulos/
│   │   │   ├── ArticulosScreen.js      → Lista de artículos con stock
│   │   │   ├── ArticuloFormScreen.js   → Crear/editar artículo
│   │   │   └── ArticuloDetailScreen.js → Ver detalle + historial
│   │   ├── compras/
│   │   │   └── CompraFormScreen.js     → Agregar stock/compra
│   │   ├── proformas/
│   │   │   ├── ProformasScreen.js      → Lista de proformas
│   │   │   ├── ProformaFormScreen.js   → Crear/editar proforma
│   │   │   └── ProformaDetailScreen.js → Ver detalle + convertir a venta
│   │   ├── ventas/
│   │   │   ├── VentasScreen.js         → Lista de ventas
│   │   │   ├── VentaFormScreen.js      → Crear venta directa
│   │   │   └── VentaDetailScreen.js    → Ver detalle de venta
│   │   ├── configuracion/
│   │   │   └── ConfiguracionScreen.js  → Ajustes de la app
│   │   └── LicenciaScreen.js           → Activación de licencia
│   ├── utils/
│   │   ├── licencia.js            → Sistema de licencias por dispositivo
│   │   ├── generarPdfProforma.js  → Genera PDF de proforma/venta
│   │   ├── generarPdfReporte.js   → Genera PDF de reportes
│   │   └── backup.js              → Exportar/importar base de datos
│   └── theme.js                   → Colores y estilos globales
├── tools/
│   └── generar-licencias.js       → Script para generar claves de licencia
├── assets/                        → Imágenes, íconos, splash
├── app.json                       → Configuración de la app (nombre, package, etc.)
├── eas.json                       → Configuración de builds con EAS
├── DOCUMENTACION.md               → Este archivo
├── GENERAR-APK.md                 → Cómo generar la APK
└── GENERAR-LICENCIA.md            → Cómo generar claves de licencia
```

---

## 5. Base de datos (SQLite)

La base de datos vive en el celular del usuario. No hay servidor. Archivo gestionado automáticamente por `expo-sqlite`.

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `clientes` | Datos del cliente (CI, nombre, celular, correo, referencia) |
| `articulos` | Catálogo de productos (nombre, imagen, categoría, código de barras) |
| `categorias` | Categorías para clasificar artículos |
| `compras` | Entradas de stock (precio compra, envío, cantidad, fecha) |
| `proformas` | Cotizaciones (cliente, fecha, estado) |
| `proforma_detalle` | Artículos de cada proforma |
| `proforma_servicios` | Servicios adicionales de cada proforma |
| `ventas` | Ventas confirmadas |
| `venta_detalle` | Artículos de cada venta |
| `venta_servicios` | Servicios adicionales de cada venta |
| `configuracion` | Ajustes clave-valor (nombre negocio, moneda, etc.) |

### Stock (se calcula, no se almacena)
```sql
stock = SUM(compras.cantidad) - SUM(venta_detalle.cantidad)
```

### Migraciones
Cuando se agrega una columna nueva a una tabla existente, se hace con `ALTER TABLE ADD COLUMN` dentro de un `try/catch` en `db.js`. Esto evita errores en celulares que ya tienen la app instalada.

---

## 6. Navegación

La app tiene 6 tabs en la barra inferior:

```
📊 Dashboard → resumen general
👥 Clientes  → gestión de clientes
📦 Artículos → catálogo + stock + compras
📋 Proformas → cotizaciones
💰 Ventas    → ventas confirmadas
⚙️ Config.   → ajustes del negocio
```

Para navegar entre tabs desde código:
```javascript
navigation.navigate('NombreTab', { screen: 'NombrePantalla', params: { ... } });
```

---

## 7. Colores y estilos

Todos los colores están en `src/theme.js`. Para usar en pantallas:
```javascript
const { COLORS, STYLES } = useTheme();
const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
```

**Nunca escribir colores hardcodeados** — siempre usar `COLORS.primary`, `COLORS.bg`, etc.

---

## 8. Convenciones del código

- **Pantallas de formulario** → nombre termina en `FormScreen`
- **Pantallas de detalle** → nombre termina en `DetailScreen`
- **Recargar datos al volver a una pantalla** → usar `useFocusEffect` + `useCallback`
- **Confirmaciones antes de eliminar** → siempre usar `Alert.alert` con botón de confirmar
- **Fechas en pantalla** → formato `DD/MM/AAAA`
- **Fechas en base de datos** → formato `YYYY-MM-DD HH:MM:SS`

---

## 9. Sistema de licencias

Cada instalación necesita una clave de licencia válida por dispositivo y con vencimiento.

- El código del dispositivo se obtiene con `obtenerDeviceCode()` en `licencia.js`
- Las claves se generan con `node tools/generar-licencias.js <CODIGO_DISPOSITIVO> <SERIAL>`
- La clave se guarda en la tabla `configuracion` de SQLite
- Ver `GENERAR-LICENCIA.md` para el proceso completo

**Constante importante:** `SECRET` en `src/utils/licencia.js` — debe mantenerse privada y consistente entre builds para que las licencias ya emitidas sigan funcionando.

---

## 10. Generación de APK

### Opción A — EAS Build (recomendado, usa la nube)
```cmd
eas build -p android --profile preview
```
- Cuenta EAS: `ignacio1997` en expo.dev
- El keystore está guardado en la cuenta EAS — todas las APKs tienen la misma firma
- Se puede instalar como actualización sin desinstalar la app anterior

### Opción B — GitHub Actions (gratuito, automático)
1. Hacer push al repositorio: `git push`
2. Ir a: https://github.com/nachoDevOS/inventory-Management/actions
3. Ejecutar el workflow **"Build APK"**
4. Descargar desde **Summary → Artifacts → app-debug**

### Información del proyecto
- **Package name:** `com.nachodevos.inventorymanagement`
- **Cuenta EAS:** `ignacio1997`
- **Repositorio GitHub:** https://github.com/nachoDevOS/inventory-Management
- **EAS Project ID:** `6a9063a0-bbaf-4dd2-bacc-f0ccecd6e057`

---

## 11. Agregar una nueva pantalla (paso a paso)

1. Crear el archivo en `src/screens/<modulo>/NuevaPantallaScreen.js`
2. Importarla en `src/navigation/AppNavigator.js`
3. Agregarla al Stack correspondiente:
```javascript
<Stack.Screen name="NuevaPantalla" component={NuevaPantallaScreen} options={{ title: 'Título' }} />
```
4. Navegar a ella desde otra pantalla:
```javascript
navigation.navigate('NuevaPantalla', { params: { ... } });
```

---

## 12. Agregar una nueva columna a la base de datos

1. Agregar al `CREATE TABLE IF NOT EXISTS` en `db.js` (para instalaciones nuevas)
2. Agregar también en la sección de migraciones (para instalaciones existentes):
```javascript
const migraciones = [
  // ... migraciones existentes ...
  'ALTER TABLE nombre_tabla ADD COLUMN nueva_columna TIPO DEFAULT valor',
];
```

---

## 13. PDFs

Los PDFs se generan con HTML → `expo-print` → se comparten con `expo-sharing`.

- Proformas y ventas: `src/utils/generarPdfProforma.js`
- Reportes: `src/utils/generarPdfReporte.js`

El footer de todos los PDFs incluye: **Solución Digital — soluciondigital.dev**

---

## 14. Configuraciones importantes en app.json

| Campo | Valor | Descripción |
|-------|-------|-------------|
| `android.package` | `com.nachodevos.inventorymanagement` | ID único de la app en Android |
| `android.softwareKeyboardLayoutMode` | `pan` | El teclado sube la pantalla en vez de taparla |
| `owner` | `ignacio1997` | Cuenta de Expo asociada |
| `extra.eas.projectId` | `6a9063a0-...` | ID del proyecto en EAS |

---

## 15. Problemas comunes y soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| `JAVA_HOME is not set` | Java no encontrado | `set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"` |
| `SDK location not found` | Android SDK no configurado | Crear `android/local.properties` con `sdk.dir=C:\\Users\\Usuario\\AppData\\Local\\Android\\Sdk` |
| App no actualiza (firma distinta) | Build de cuenta diferente | Siempre usar la misma cuenta EAS (`ignacio1997`) |
| Módulo no encontrado al iniciar | Caché corrupta | `npx expo start --clear` |
| Licencia no válida | SECRET diferente entre builds | No cambiar `SECRET` en `licencia.js` |
