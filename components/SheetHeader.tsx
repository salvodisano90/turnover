// components/SheetHeader.tsx — header modale Apple Liquid Glass: titolo 30/700, pulsanti glass, safe-area.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoBlur from 'expo-blur';
import BackButton from './BackButton';
import CloseButton from './CloseButton';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';
const BlurView: any = (ExpoBlur as any) && (ExpoBlur as any).BlurView;

interface Props { title: string; subtitle?: string; onClose: () => void; left?: React.ReactNode; }

export default function SheetHeader({ title, subtitle, onClose, left }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.head, { paddingTop: insets.top + spacing.s }]}>
      {BlurView ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
      <View style={styles.row}>
        {left || <BackButton onPress={onClose} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      <CloseButton onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.xxl, paddingBottom: spacing.m, gap: spacing.m },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, flex: 1 },
  title: { ...typography.sectionTitle, color: colors.textPrimary },
  sub: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
});
