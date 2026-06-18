// screens/ProfileScreen.tsx — Profilo (Apple Liquid Glass). SOLO UI.
// ProfileScreen — profilo Coordinatore (single-user): avatar, personalizzazione, attività.
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { AVATAR_COLORS } from '../utils/designSystem';
import VectorAvatar, { AVATAR_CATALOG } from '../components/avatar/VectorAvatars';
import { countWork, monteTurni } from '../services/engine';
import { daysInMonth } from '../utils/helpers';
import { colors, fnColor } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const ACCENT = fnColor.direzione;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, ctx, currentPiano, reparti, year, month } = useStore();

  const roleLabel = 'Coordinatore';
  const avatarRole = 'Coordinatore';
  const displayName = ((profile as any) && (profile as any).nome) ? (profile as any).nome : roleLabel;
  const dim = daysInMonth(year, month);

  // Attività (dati reali) — solo coordinatore/owner
  const turniGestiti = React.useMemo(() => (ctx.staff || []).reduce((a, s) => a + countWork(currentPiano, s.id, dim), 0), [ctx.staff, currentPiano, dim]);
  const oreMese = turniGestiti * 8;
  const attivita = [
    { icon: 'calendar', label: 'Turni gestiti', value: `${turniGestiti}`, c: colors.fnPianificazione },
    { icon: 'people', label: 'Personale coordinato', value: `${(ctx.staff || []).length}`, c: colors.fnPersonale },
    { icon: 'business', label: 'Reparti', value: `${(reparti || []).length}`, c: colors.fnReparti },
    { icon: 'time', label: 'Ore mese', value: `${oreMese}`, c: colors.fnReport },
  ];

  const Section = ({ children }: { children: React.ReactNode }) => <Text style={styles.section}>{children}</Text>;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <Text style={[styles.pageTitle, { flex: 1 }]}>Profilo</Text>
        <PressableScale onPress={() => router.push('/impostazioni')} hitSlop={8} style={styles.iconBtn}><Icon name="settings-outline" size={22} color={colors.textPrimary} /></PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* avatar con glow accent */}
        <View style={styles.avatarArea}>
          <View style={[styles.glow, { shadowColor: ACCENT }]}>
            <View style={[styles.ring, { borderColor: ACCENT }]}><Avatar nome={displayName} ruolo={avatarRole} size={150} config={profile} /></View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{roleLabel}</Text>
        </View>

        {/* Attività (coordinatore) */}
        {attivita.length ? (<>
          <Section>Attività</Section>
          <GlassCard style={{ marginBottom: spacing.l }} padded={false}>
            {attivita.map((a, i) => (
              <View key={a.label} style={[styles.actRow, i < attivita.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                <View style={[styles.actIcon, { backgroundColor: a.c + '22' }]}><Icon name={a.icon} size={18} color={a.c} /></View>
                <Text style={styles.actLabel}>{a.label}</Text>
                <Text style={styles.actValue}>{a.value}</Text>
              </View>
            ))}
          </GlassCard>
        </>) : null}

        {/* Impostazioni link glass */}
        <PressableScale onPress={() => router.push('/impostazioni')} style={{ marginTop: spacing.m }}>
          <GlassCard padded={false}>
            <View style={styles.linkRow}>
              <View style={[styles.actIcon, { backgroundColor: colors.glassStrong }]}><Icon name="settings-outline" size={18} color={colors.textSecondary} /></View>
              <Text style={[styles.actLabel, { flex: 1 }]}>Impostazioni</Text>
              <Icon name="chevron-forward" size={18} color={colors.textDisabled} />
            </View>
          </GlassCard>
        </PressableScale>

        {/* Personalizzazione avatar */}
        <Section>Colore avatar</Section>
        <GlassCard style={{ marginBottom: spacing.l }}>
          <View style={styles.swatches}>
            {AVATAR_COLORS.map((col) => {
              const on = profile.color === col;
              return (
                <PressableScale key={col} onPress={() => setProfile({ color: col })}>
                  <View style={[styles.swatch, { backgroundColor: col, borderColor: on ? colors.textPrimary : 'transparent', borderWidth: on ? 3 : 0 }]}>{on ? <Icon name="checkmark" size={16} color="#fff" /> : null}</View>
                </PressableScale>
              );
            })}
          </View>
        </GlassCard>

        <Section>Iniziali personalizzate</Section>
        <GlassCard style={{ marginBottom: spacing.l }}>
          <TextInput style={styles.initInput} placeholder="es. SD" placeholderTextColor={colors.textDisabled} autoCapitalize="characters" maxLength={2} value={profile.kind === 'initials' ? (profile.initials || '') : ''} onChangeText={(t) => setProfile({ kind: 'initials', initials: t.toUpperCase().slice(0, 2) })} />
          <Text style={styles.hint}>Massimo 2 lettere. Lascia vuoto per usare le iniziali del nome.</Text>
        </GlassCard>

        <Section>Avatar</Section>
        {AVATAR_CATALOG.map((cat) => (
          <View key={cat.category}>
            <Text style={styles.catTitle}>{cat.category}</Text>
            <View style={styles.iconGrid}>
              {cat.items.map((it) => {
                const on = profile.kind === 'vector' && (profile as any).vector === it.id;
                return (
                  <PressableScale key={it.id} onPress={() => setProfile({ kind: 'vector', vector: it.id, icon: undefined, emoji: undefined })} style={styles.iconWrap}>
                    <View style={[styles.avCell, on ? { borderColor: ACCENT, borderWidth: 2 } : { borderColor: colors.border, borderWidth: 1 }]}>
                      <VectorAvatar id={it.id} size={56} color={profile.color || ACCENT} />
                    </View>
                    <Text style={styles.iconLbl} numberOfLines={1}>{it.label}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarArea: { alignItems: 'center', marginTop: spacing.l, marginBottom: spacing.xl },
  glow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, marginBottom: spacing.m },
  ring: { width: 162, height: 162, borderRadius: 81, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.sectionTitle, color: colors.textPrimary },
  role: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.m, paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: radius.pill },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { ...typography.caption, fontWeight: '700' },
  section: { ...typography.cardTitle, color: colors.textPrimary, marginTop: spacing.h, marginBottom: spacing.m },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m, paddingHorizontal: spacing.xl },
  actIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  actValue: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button },
  loginTxt: { ...typography.body, fontWeight: '700', color: '#fff' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m, paddingHorizontal: spacing.xl },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initInput: { borderRadius: radius.input, paddingHorizontal: spacing.l, paddingVertical: spacing.m, fontSize: 20, fontWeight: '800', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.glass, color: colors.textPrimary, width: 90, textAlign: 'center', letterSpacing: 2 },
  hint: { ...typography.secondary, color: colors.textDisabled, marginTop: spacing.s, lineHeight: 18 },
  genderRow: { flexDirection: 'row', gap: spacing.m },
  gender: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 56, borderRadius: radius.smallCard, borderWidth: 1 },
  genderTxt: { ...typography.body, fontWeight: '700' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  iconWrap: { width: '21%', alignItems: 'center', gap: 5 },
  iconCell: { width: 56, height: 56, borderRadius: radius.smallCard, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catTitle: { ...typography.secondary, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.m, marginTop: spacing.s },
  avCell: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconLbl: { ...typography.caption, color: colors.textDisabled },
});
