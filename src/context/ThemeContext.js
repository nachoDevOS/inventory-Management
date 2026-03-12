/**
 * ThemeContext.js — Proveedor de tema (claro / oscuro)
 *
 * Uso en cualquier pantalla:
 *   const { COLORS, isDark, toggleTheme } = useTheme();
 *
 * El ThemeProvider debe estar DENTRO del SQLiteProvider para poder
 * leer/escribir la preferencia en la tabla `configuracion`.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

// ── Paleta de colores claros ────────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  inputBg: '#FFFFFF',
};

// ── Paleta de colores oscuros ───────────────────────────────────────────────
export const DARK_COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  bg: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textLight: '#94A3B8',
  border: '#334155',
  white: '#FFFFFF',
  inputBg: '#0F172A',
};

const ThemeContext = createContext({
  COLORS: LIGHT_COLORS,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const db = useSQLiteContext();
  const [isDark, setIsDark] = useState(false);

  // Cargar preferencia guardada
  useEffect(() => {
    db.getFirstAsync("SELECT valor FROM configuracion WHERE clave = 'dark_mode'")
      .then(row => { if (row?.valor === '1') setIsDark(true); })
      .catch(() => {});
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('dark_mode', ?)",
        [next ? '1' : '0']
      );
    } catch (_) {}
  };

  return (
    <ThemeContext.Provider value={{
      COLORS: isDark ? DARK_COLORS : LIGHT_COLORS,
      isDark,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook para usar el tema en cualquier componente */
export const useTheme = () => useContext(ThemeContext);
