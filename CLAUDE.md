# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS (macOS only)
npx expo start --tunnel  # Run with tunnel (for physical devices on different network)
```

## Architecture

**Stack:** Expo (SDK 55) + React Native + expo-sqlite v15 + React Navigation v7

**Entry point:** `App.js` — wraps everything in `GestureHandlerRootView`, `SQLiteProvider` (with `useSuspense`), and `NavigationContainer`.

**Database:** `src/database/db.js` exports `initDatabase(db)` called once by `SQLiteProvider.onInit`. All screens access the DB via the `useSQLiteContext()` hook. No separate query layer — SQL is written inline in each screen.

**Stock calculation:** Stock is never stored as a column. It is always calculated as `SUM(compras.cantidad) - SUM(venta_detalle.cantidad)` per article via SQL.

**Navigation:** Bottom tabs (Clientes, Artículos, Proformas, Ventas), each tab has its own Stack navigator defined in `src/navigation/AppNavigator.js`.

**Proforma → Venta flow:** `ProformaDetailScreen` creates a venta + venta_detalle rows from proforma_detalle rows, then sets `proformas.estado = 'convertida'`. Deleting a venta reverts the proforma estado back to `'aprobada'`.

**Screens per module:**
- `clientes/` — List, Form (add/edit), Detail (shows linked proformas & ventas)
- `articulos/` — List (shows live stock), Form (add/edit + image picker), Detail (stock summary + purchase history)
- `compras/` — Form only (accessed from ArticuloDetail, params: `idarticulo`)
- `proformas/` — List, Form (selects client + articles via modals), Detail (estado management + convert to venta)
- `ventas/` — List (total summary header), Detail

**Theming:** All colors and shadow styles are in `src/theme.js` (`COLORS`, `STYLES`).
