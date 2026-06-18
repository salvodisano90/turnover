// design/radius.ts — raggi Apple Liquid Glass.
export const radius = {
  input: 24, button: 24, card: 28, largeCard: 32,
  smallCard: 22, modal: 32, bottomNav: 38, pill: 999, avatar: 999, fab: 999,
} as const;
export type RadiusToken = keyof typeof radius;
