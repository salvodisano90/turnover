// components/TopBar.tsx — Top bar condivisa: [reparto] · [titolo] · [campanella+avatar].
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import PressableScale from './PressableScale';
import Icon from './Icon';
import BackButton from './BackButton';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const initials = (n?: string, c?: string) => `${(n || '').trim()[0] || ''}${(c || '').trim()[0] || ''}`.toUpperCase();

export default function TopBar({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useStore();
  const reparto = ctx.reparti[0]?.nome || 'Nessun reparto';
  const pending = 0;
  const ini = '';

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.s, backgroundColor: colors.bg }]}>
      <BackButton />
      <View style={styles.titleCol}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.reparto} numberOfLines={1}>{reparto}</Text>
      </View>
      <View style={styles.right}>
        
        <PressableScale onPress={() => router.push('/personalizzazione')} hitSlop={8} style={styles.avatar}>
          <Icon name="person" size={20} color={colors.textDisabled} />
        </PressableScale>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.xxl, paddingBottom: spacing.m, gap: spacing.m },
  titleCol: { flex: 1, minWidth: 0 },
  reparto: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  title: { ...typography.pageTitle, color: colors.textPrimary },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 90, justifyContent: 'flex-end' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
