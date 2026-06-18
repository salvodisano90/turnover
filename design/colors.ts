// design/colors.ts — Apple Liquid Glass (dark, AMOLED). Oggetto MUTABILE alimentato dal tema attivo.
// applyTheme(id) riscrive i campi in-place; il root rimonta l'albero (vedi ThemeRoot) così anche
// gli StyleSheet.create si rigenerano e TUTTA l'app cambia tema. Default = AMOLED (look attuale invariato).
import { getTheme, DEFAULT_THEME_ID, ThemeDef } from './themes';

function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// oggetto vivo: le schermate fanno `import { colors }` e leggono questi campi
export const colors = {
  // background / superfici
  bg: '#000000', bgSecondary: '#0A0A0A',
  elevated: 'rgba(255,255,255,0.05)', glass: 'rgba(255,255,255,0.08)', glassStrong: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.07)', cardHover: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.08)', divider: 'rgba(255,255,255,0.05)', separator: 'rgba(255,255,255,0.05)',
  bgEco: '#000000', cardEco: 'rgba(255,255,255,0.07)', borderEco: 'rgba(255,255,255,0.08)',
  // testo
  textPrimary: '#FFFFFF', textSecondary: 'rgba(235,235,245,0.60)', textDisabled: 'rgba(235,235,245,0.30)',
  // accenti (accent = tema; gli altri restano Apple system per i colori semantici)
  blue: '#0A84FF', green: '#32D74B', orange: '#FF9F0A', purple: '#BF5AF2', red: '#FF453A', teal: '#64D2FF', indigo: '#5E5CE6',
  warning: '#FF9F0A', danger2: '#FF453A',
  // accent per FUNZIONE
  fnPianificazione: '#32D74B', fnPersonale: '#64D2FF', fnReport: '#FF9F0A', fnCriticita: '#FF453A',
  fnDirezione: '#BF5AF2', fnRichieste: '#5E5CE6', fnSimulazione: '#30D158', fnReparti: '#0A84FF',
  // turni
  shiftMattina: '#32D74B', shiftPomeriggio: '#0A84FF', shiftNotte: '#BF5AF2',
  shiftReperibilita: '#FF9F0A', shiftFerie: '#FF9F0A', shiftMalattia: '#FF453A', daySelected: '#0A84FF',
};
export type ColorToken = keyof typeof colors;

// mappa funzione->accento (riletta dopo applyTheme)
export const fnColor: Record<string, string> = {
  pianificazione: colors.fnPianificazione, personale: colors.fnPersonale, report: colors.fnReport,
  criticita: colors.fnCriticita, direzione: colors.fnDirezione, richieste: colors.fnRichieste,
  simulazione: colors.fnSimulazione, reparti: colors.fnReparti, dashboard: colors.fnPianificazione,
};

let currentThemeId = DEFAULT_THEME_ID;
export function getThemeId(): string { return currentThemeId; }

// applica un tema riscrivendo i campi dell'oggetto colors in-place
export function applyTheme(id: string): void {
  const t: ThemeDef = getTheme(id);
  currentThemeId = t.id;
  colors.bg = t.bg;
  colors.bgSecondary = t.bgSecondary;
  colors.bgEco = t.bg;
  // superfici glass derivate dal surface del tema (overlay bianco) per coerenza Liquid Glass
  colors.elevated = hexToRgba('#FFFFFF', 0.05);
  colors.glass = hexToRgba('#FFFFFF', 0.08);
  colors.glassStrong = hexToRgba('#FFFFFF', 0.12);
  colors.card = hexToRgba('#FFFFFF', 0.07);
  colors.cardEco = colors.card;
  colors.cardHover = hexToRgba('#FFFFFF', 0.12);
  colors.border = hexToRgba('#FFFFFF', 0.08);
  colors.borderEco = colors.border;
  colors.divider = hexToRgba('#FFFFFF', 0.05);
  colors.separator = colors.divider;
  // accento del tema → blue/daySelected/fnReparti (gli accenti "neutri" di sistema)
  colors.blue = t.accent;
  colors.daySelected = t.accent;
  colors.fnReparti = t.accent;
  fnColor.reparti = t.accent;
}
