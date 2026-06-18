// design/themes.ts — 7 temi Apple Liquid Glass. Ogni tema definisce background/surface/accent;
// il resto (glass, bordi, testo, turni) è derivato per coerenza. Fonte unica per applyTheme().
export interface ThemeDef {
  id: string;
  name: string;
  bg: string;        // sfondo primario (AMOLED-friendly)
  bgSecondary: string;
  surface: string;   // base card (poi resa glass via alpha bianco)
  accent: string;    // accento principale
}

export const THEMES: ThemeDef[] = [
  { id: 'amoled',   name: 'AMOLED',   bg: '#000000', bgSecondary: '#0A0A0A', surface: '#0A0A0A', accent: '#0A84FF' },
  { id: 'ocean',    name: 'Ocean',    bg: '#061A2C', bgSecondary: '#081f33', surface: '#0B2540', accent: '#0A84FF' },
  { id: 'forest',   name: 'Forest',   bg: '#071D12', bgSecondary: '#0a2417', surface: '#103122', accent: '#30D158' },
  { id: 'graphite', name: 'Graphite', bg: '#111111', surface: '#1C1C1E', bgSecondary: '#161616', accent: '#8E8E93' },
  { id: 'sunset',   name: 'Sunset',   bg: '#2B0D0D', bgSecondary: '#330f0f', surface: '#3C1515', accent: '#FF9F0A' },
  { id: 'violet',   name: 'Violet',   bg: '#180028', bgSecondary: '#1d0033', surface: '#25003A', accent: '#BF5AF2' },
  { id: 'ruby',     name: 'Ruby',     bg: '#240000', bgSecondary: '#2c0404', surface: '#380909', accent: '#FF453A' },
  { id: 'pink',     name: 'Pink',     bg: '#1A0F14', bgSecondary: '#22121A', surface: '#2A1620', accent: '#FF4FA3' },
];

export const DEFAULT_THEME_ID = 'amoled';
export function getTheme(id: string): ThemeDef { return THEMES.find((t) => t.id === id) || THEMES[0]; }
