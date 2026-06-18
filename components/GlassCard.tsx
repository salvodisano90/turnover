// components/GlassCard.tsx — Card principale Apple. Per spec #8 le CARD PRINCIPALI NON hanno backdrop blur:
// superficie SOLIDA elegante e leggibile (surface del tema), bordo sottile, ombra morbida.
// Il blur (Liquid Glass) resta su bottom bar, header modali e picker (componenti dedicati).
// Opzione `blur` disponibile per popup/modali/picker che lo richiedono esplicitamente.
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import * as ExpoBlur from 'expo-blur';
import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { shadows } from '../design/shadows';
import { metrics } from '../design/metrics';
const BlurView: any = (ExpoBlur as any) && (ExpoBlur as any).BlurView;

export default function GlassCard({
  children, style, intensity = 30, large = false, padded = true, tint = 'dark', blur = false,
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  large?: boolean;
  padded?: boolean;
  tint?: 'dark' | 'light' | 'default';
  blur?: boolean; // true solo per popup/modali/picker (spec #8)
}) {
  const r = large ? radius.largeCard : radius.card;
  const pad = padded ? Math.round(spacing.xl * (metrics.cardScale || 1)) : 0;
  // CARD PRINCIPALE: superficie solida (no blur) — elegante e leggibile
  if (!blur || !BlurView) {
    return (
      <View style={[styles.solid, { borderRadius: r, padding: pad }, shadows.glass, style]}>
        {children}
      </View>
    );
  }
  // POPUP/MODALE/PICKER: Liquid Glass con blur reale
  return (
    <View style={[styles.wrap, { borderRadius: r }, shadows.glass, style]}>
      <BlurView intensity={intensity} tint={tint} style={[StyleSheet.absoluteFill, { borderRadius: r }]} pointerEvents="none" />
      <View style={[styles.glassSurface, { borderRadius: r, padding: pad }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // superficie solida: surface del tema (colors.card è derivato dal tema attivo) su bordo sottile
  solid: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  wrap: { overflow: 'hidden', backgroundColor: colors.glass },
  glassSurface: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
});
