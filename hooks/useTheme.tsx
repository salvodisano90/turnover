// hooks/useTheme.tsx — theme context (dark default) with persistence

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeMode } from '../types';
import { getTheme, ThemeColors } from '../utils/theme';
import { loadThemeMode, saveThemeMode, loadThemePalette, saveThemePalette, loadUserBackground, saveUserBackground } from '../services/storage';
import { useStore } from './useStore';
import { deriveTheme, DEFAULT_PALETTE, ThemePalette } from '../utils/themeEngine';

export interface UserBackground { uri: string; overlay: number; blur: number; darken: number; }

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
  palette: ThemePalette;
  setPalette: (p: ThemePalette) => void;
  background: UserBackground | null;
  setBackground: (b: UserBackground | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [palette, setPaletteState] = useState<ThemePalette>(DEFAULT_PALETTE);
  const [background, setBgState] = useState<UserBackground | null>(null);

  useEffect(() => {
    let mounted = true;
    loadThemeMode().then((m) => { if (mounted && m) setModeState(m); });
    loadThemePalette().then((p) => { if (mounted && p && p.bg) setPaletteState(p); else if (mounted) setPaletteState(DEFAULT_PALETTE); });
    loadUserBackground().then((b) => { if (mounted) setBgState(b && b.uri ? b : null); });
    return () => { mounted = false; };
  }, []);

  const setPalette = useCallback((p: ThemePalette) => { setPaletteState(p); void saveThemePalette(p); }, []);
  const setBackground = useCallback((b: UserBackground | null) => { setBgState(b); void saveUserBackground(b); }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void saveThemeMode(m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      void saveThemeMode(next);
      return next;
    });
  }, []);

  // DARK ONLY: tema forzato a dark in tutta l'app. setMode/toggle resi inerti, nessuna palette light.
  const value = useMemo<ThemeContextValue>(
    () => ({ colors: deriveTheme(palette), mode: 'dark', setMode: () => {}, toggle: () => {}, palette, setPalette, background, setBackground }),
    [palette, setPalette, background, setBackground],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
