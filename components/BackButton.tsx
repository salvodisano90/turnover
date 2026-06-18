// components/BackButton.tsx — STANDARD UNICO freccia indietro per tutta l'app.
// Solo icona, nessun cerchio/bordo/sfondo. Stessa dimensione, colore, posizione e hit area ovunque.
// Default: router.back() con fallback alla dashboard. onPress override per casi speciali (es. step wizard).
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Icon from './Icon';
import { colors } from '../design/colors';

export default function BackButton({ onPress, color, size = 26 }: { onPress?: () => void; color?: string; size?: number }) {
  const handle = onPress || (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <Pressable onPress={handle} hitSlop={12} style={styles.btn} accessibilityRole="button" accessibilityLabel="Indietro">
      <Icon name="chevron-back" size={size} color={color || colors.textPrimary} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  btn: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center', marginLeft: -6 },
});
