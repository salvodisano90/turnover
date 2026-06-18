// utils/themeEngine.ts — Theme Engine globale (FASE 1/3/4): da una PALETTE { bg, surface, accent, iconColor }
// deriva l'intero ThemeColors. Funzione PURA e testabile → garantisce che TUTTA l'app (che legge colors.*)
// si aggiorni da un'unica fonte runtime. 6 temi predefiniti + palette personalizzabili.
import { DS } from './designSystem';
import { ThemeColors } from './theme';

export interface ThemePalette { id: string; nome: string; bg: string; surface: string; accent: string; iconColor: string; }

export const PRESET_THEMES: ThemePalette[] = [
  { id: 'amoled',   nome: 'AMOLED',   bg: '#000000', surface: '#121212', accent: '#0A84FF', iconColor: '#0A84FF' },
  { id: 'ocean',    nome: 'Ocean',    bg: '#07111F', surface: '#11243C', accent: '#0A84FF', iconColor: '#4DA3FF' },
  { id: 'forest',   nome: 'Forest',   bg: '#07140D', surface: '#11281A', accent: '#30D158', iconColor: '#30D158' },
  { id: 'graphite', nome: 'Graphite', bg: '#111111', surface: '#222222', accent: '#8E8E93', iconColor: '#D1D1D6' },
  { id: 'crimson',  nome: 'Crimson',  bg: '#180707', surface: '#2A1111', accent: '#FF453A', iconColor: '#FF6961' },
  { id: 'midnight', nome: 'Midnight', bg: '#050505', surface: '#1C1C1E', accent: '#5E5CE6', iconColor: '#7D7AFF' },
  { id: 'liquidglass', nome: 'Liquid Glass', bg: '#0D0D12', surface: '#1A1F24', accent: '#7C5CFF', iconColor: '#7C5CFF' },
];

export const BG_PALETTE = ['#000000', '#111111', '#1C1C1E', '#07111F', '#07140D', '#180707', '#1A1325', '#102030', '#202020'];
export const ICON_PALETTE = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FFD60A', '#FFFFFF', '#8E8E93'];

// #RRGGBB → rgba con alpha (per i "soft" derivati dall'accent).
export function withAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Deriva il ThemeColors completo da una palette. bg/surface guidano sfondi e card; accent guida
// blue/selezioni/progress; iconColor è esposto per le icone tematizzate.
export function deriveTheme(p: ThemePalette): ThemeColors {
  return {
    mode: 'dark',
    bg: p.bg,
    bgElevated: p.surface,
    card: withAlpha('#FFFFFF', 0.05),
    card2: withAlpha('#FFFFFF', 0.08),
    text: '#FFFFFF',
    text2: '#8E8E93',
    text3: '#636366',
    line: withAlpha('#FFFFFF', 0.10),
    separator: 'rgba(84,84,88,0.65)',
    blue: p.accent,
    blueSoft: withAlpha(p.accent, 0.16),
    green: DS.color.success,
    greenSoft: DS.color.successSoft,
    yellow: DS.color.warning,
    yellowSoft: DS.color.warningSoft,
    red: DS.color.danger,
    redSoft: DS.color.dangerSoft,
    purple: DS.color.purple,
    overlay: DS.color.overlay,
    tabInactive: '#636366',
    iconColor: p.iconColor,
    shift: {
      M: { fg: '#79B8FF', bg: 'rgba(121,184,255,0.24)' },
      P: { fg: '#F2B84B', bg: 'rgba(242,184,75,0.24)' },
      N: { fg: '#B69CFF', bg: 'rgba(182,156,255,0.24)' },
      R: { fg: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.10)' },
      S: { fg: '#64D2FF', bg: 'rgba(100,210,255,0.24)' },
      G: { fg: '#F2B84B', bg: 'rgba(242,184,75,0.24)' },
      F: { fg: '#7BC47F', bg: 'rgba(123,196,127,0.24)' },
    },
  } as ThemeColors;
}

export const DEFAULT_PALETTE = PRESET_THEMES[0];
