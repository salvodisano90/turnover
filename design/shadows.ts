// design/shadows.ts — ombre Liquid Glass (morbide, profonde).
export const shadows = {
  glass:      { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 30, elevation: 10 },
  largeGlass: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.40, shadowRadius: 60, elevation: 20 },
  // alias storici (le schermate migrate usano shadows.card / shadows.elevated)
  card:       { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 30, elevation: 10 },
  elevated:   { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.40, shadowRadius: 60, elevation: 20 },
} as const;
export type ShadowToken = keyof typeof shadows;
