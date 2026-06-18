// design/typography.ts — SF Pro Display. MUTABILE per scaling testo (accessibilità).
// applyTextScale(factor) ricalcola i fontSize dai valori BASE; il remount (AppThemeProvider) rigenera gli stili.
const BASE = {
  largeHero: 48, pageTitle: 40, sectionTitle: 30, cardTitle: 22, body: 17, secondary: 15, caption: 13,
} as const;

export const typography = {
  largeHero:    { fontSize: BASE.largeHero, fontWeight: '700' as const, letterSpacing: 0.37 },
  pageTitle:    { fontSize: BASE.pageTitle, fontWeight: '700' as const, letterSpacing: 0.37 },
  sectionTitle: { fontSize: BASE.sectionTitle, fontWeight: '700' as const, letterSpacing: 0.35 },
  cardTitle:    { fontSize: BASE.cardTitle, fontWeight: '600' as const, letterSpacing: 0.35 },
  body:         { fontSize: BASE.body, fontWeight: '400' as const },
  secondary:    { fontSize: BASE.secondary, fontWeight: '400' as const },
  caption:      { fontSize: BASE.caption, fontWeight: '500' as const },
};
export type TypographyToken = keyof typeof typography;

let textFactor = 1;
export function getTextFactor(): number { return textFactor; }
export function applyTextScale(factor: number): void {
  textFactor = factor;
  (Object.keys(BASE) as (keyof typeof BASE)[]).forEach((k) => {
    (typography as any)[k].fontSize = Math.round((BASE[k] as number) * factor);
  });
}
