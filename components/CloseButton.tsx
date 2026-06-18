// components/CloseButton.tsx — STANDARD UNICO pulsante chiudi (X) per tutta l'app.
// Solo icona X, nessun cerchio/bordo/sfondo. Stessa dimensione, colore, posizione e hit area ovunque.
// Default: router.back() con fallback alla dashboard. onPress override per chiudere modal/sheet/dialog.
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Icon from './Icon';
import { colors } from '../design/colors';

export default function CloseButton({ onPress, color, size = 24 }: { onPress?: () => void; color?: string; size?: number }) {
  const handle = onPress || (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <Pressable onPress={handle} hitSlop={12} style={styles.btn} accessibilityRole="button" accessibilityLabel="Chiudi">
      <Icon name="close" size={size} color={color || colors.textSecondary} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  btn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
