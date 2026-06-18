// design/metrics.ts — metriche scalabili (accessibilità). cardScale per il padding/altezza delle card.
export const metrics = { cardScale: 1 };
export function applyCardScale(factor: number): void { metrics.cardScale = factor; }
