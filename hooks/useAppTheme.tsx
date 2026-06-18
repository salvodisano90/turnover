// hooks/useAppTheme.tsx — Aspetto dell'app: TEMA (7 temi) + ACCESSIBILITÀ (testo/card/densità).
// Applica i token mutabili (/design) e rimonta l'albero (key) così gli StyleSheet.create si rigenerano:
// tema e scaling raggiungono TUTTE le schermate. Persistenza per-utente.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme, getThemeId } from '../design/colors';
import { DEFAULT_THEME_ID } from '../design/themes';
import { applyAccessibility, DEFAULT_A11Y, A11yPrefs, TextSize, CardSize, Density } from '../design/accessibility';
import { loadThemeId, saveThemeId, loadA11y, saveA11y } from '../services/storage';
import { useStore } from './useStore';

interface AppThemeValue {
  themeId: string; setThemeId: (id: string) => void;
  a11y: A11yPrefs;
  setTextSize: (v: TextSize) => void;
  setCardSize: (v: CardSize) => void;
  setDensity: (v: Density) => void;
  epoch: number;
}
const Ctx = createContext<AppThemeValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(getThemeId() || DEFAULT_THEME_ID);
  const [a11y, setA11y] = useState<A11yPrefs>(DEFAULT_A11Y);
  const [epoch, setEpoch] = useState(0);

  // carica tema + accessibilità all'avvio / al cambio utente
  useEffect(() => {
    let on = true;
    Promise.all([loadThemeId(), loadA11y()]).then(([tid, a]) => {
      if (!on) return;
      const nextTheme = tid || DEFAULT_THEME_ID;
      const nextA11y: A11yPrefs = { ...DEFAULT_A11Y, ...(a || {}) };
      applyTheme(nextTheme);
      applyAccessibility(nextA11y);
      setThemeIdState(nextTheme); setA11y(nextA11y); setEpoch((e) => e + 1);
    }).catch(() => {});
    return () => { on = false; };
  }, []);

  const setThemeId = useCallback((id: string) => {
    applyTheme(id); setThemeIdState(id); setEpoch((e) => e + 1); void saveThemeId(id);
  }, []);

  const persistA11y = useCallback((next: A11yPrefs) => {
    applyAccessibility(next); setA11y(next); setEpoch((e) => e + 1); void saveA11y(next);
  }, []);

  const setTextSize = useCallback((v: TextSize) => persistA11y({ ...a11y, textSize: v }), [a11y, persistA11y]);
  const setCardSize = useCallback((v: CardSize) => persistA11y({ ...a11y, cardSize: v }), [a11y, persistA11y]);
  const setDensity = useCallback((v: Density) => persistA11y({ ...a11y, density: v }), [a11y, persistA11y]);

  const value = useMemo(() => ({ themeId, setThemeId, a11y, setTextSize, setCardSize, setDensity, epoch }),
    [themeId, setThemeId, a11y, setTextSize, setCardSize, setDensity, epoch]);
  return <Ctx.Provider value={value}><React.Fragment key={epoch}>{children}</React.Fragment></Ctx.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAppTheme must be used within AppThemeProvider');
  return c;
}
