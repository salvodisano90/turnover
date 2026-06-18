// components/HubCard.tsx — card hub Apple Liquid Glass: glass r28 + blur reale, tile icona accent.
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import PressableScale from './PressableScale';
import Icon from './Icon';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

export default function HubCard({ icon, title, subtitle, onPress, color, chevron, badge, full, style }: {
  icon: string; title: string; subtitle?: string; onPress: () => void; color?: string;
  chevron?: boolean; badge?: number; full?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const accent = color || colors.blue;
  return (
    <PressableScale onPress={onPress} style={full ? styles.full : styles.flex}>
      <View style={[styles.card, shadows.glass, chevron && styles.cardRow, style]}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.inner, chevron && styles.innerRow]}>
          <View style={[styles.tile, { backgroundColor: accent + '22' }]}>
            <Icon name={icon} size={24} color={accent} />
            {badge ? <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeTxt}>{badge > 9 ? '9+' : badge}</Text></View> : null}
          </View>
          <View style={chevron ? styles.txtRow : styles.txtCol}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.sub} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          {chevron ? <Icon name="chevron-forward" size={18} color={colors.textDisabled} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  full: { width: '100%' },
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', minHeight: 120 },
  cardRow: { minHeight: 84 },
  inner: { padding: spacing.xl },
  innerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.l },
  tile: { width: 48, height: 48, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  txtCol: { marginTop: spacing.m },
  txtRow: { flex: 1 },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
