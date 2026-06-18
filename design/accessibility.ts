// design/accessibility.ts — preferenze accessibilità: dimensione testo, dimensione card, densità.
// Mappa i livelli UI a fattori e li applica ai token mutabili (typography/spacing/metrics).
import { applyTextScale } from './typography';
import { applyDensity } from './spacing';
import { applyCardScale } from './metrics';

export type TextSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type CardSize = 'compact' | 'normal' | 'wide';
export type Density = 'high' | 'medium' | 'low';

export interface A11yPrefs { textSize: TextSize; cardSize: CardSize; density: Density; }
export const DEFAULT_A11Y: A11yPrefs = { textSize: 'm', cardSize: 'normal', density: 'medium' };

export const TEXT_FACTOR: Record<TextSize, number> = { xs: 0.85, s: 0.92, m: 1, l: 1.12, xl: 1.28 };
export const CARD_FACTOR: Record<CardSize, number> = { compact: 0.82, normal: 1, wide: 1.22 };
export const DENSITY_FACTOR: Record<Density, number> = { high: 0.85, medium: 1, low: 1.18 };

export const TEXT_LABEL: Record<TextSize, string> = { xs: 'Molto piccolo', s: 'Piccolo', m: 'Normale', l: 'Grande', xl: 'Molto grande' };
export const CARD_LABEL: Record<CardSize, string> = { compact: 'Compatta', normal: 'Normale', wide: 'Ampia' };
export const DENSITY_LABEL: Record<Density, string> = { high: 'Alta', medium: 'Media', low: 'Bassa' };

export function applyAccessibility(p: A11yPrefs): void {
  applyTextScale(TEXT_FACTOR[p.textSize] ?? 1);
  applyDensity(DENSITY_FACTOR[p.density] ?? 1);
  applyCardScale(CARD_FACTOR[p.cardSize] ?? 1);
}
