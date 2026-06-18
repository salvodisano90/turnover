// design/spacing.ts — scala 8pt. MUTABILE per densità interfaccia (accessibilità).
// applyDensity(factor) ricalcola gli spazi dai valori BASE; il remount rigenera gli stili.
const BASE = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, h: 32, hh: 40, g: 48, gg: 64 } as const;
export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, h: 32, hh: 40, g: 48, gg: 64 };
export type SpacingToken = keyof typeof spacing;

let densityFactor = 1;
export function getDensityFactor(): number { return densityFactor; }
export function applyDensity(factor: number): void {
  densityFactor = factor;
  (Object.keys(BASE) as (keyof typeof BASE)[]).forEach((k) => {
    // gli spazi piccoli (xs/s) scalano meno per non rompere gli allineamenti fini
    const soft = k === 'xs' || k === 's' ? 1 + (factor - 1) * 0.5 : factor;
    (spacing as any)[k] = Math.max(2, Math.round((BASE[k] as number) * soft));
  });
}
