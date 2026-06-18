// screens/PersonaleScreen.tsx — Personale (Apple Liquid Glass). SOLO UI.
// LOGICA INTATTA: countWork/monteTurni/classifyOperator/ferie/removeStaff e FlatList virtualizzata.
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { confirmAction } from '../utils/confirm';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import { ferieBalanceFor } from '../services/ferie';
import { useToast } from '../hooks/useToast';
import { countWork, monteTurni, classifyOperator } from '../services/engine';
import { daysInMonth, getCtr, countsInCoverage, getRep } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import { colors, fnColor } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

const ACCENT = fnColor.personale;

export default function PersonaleScreen() {
  const router = useRouter();
  const toast = useToast();
  const { staff, currentPiano, year, month, removeStaff, ctx, reparti } = useStore();
  const [query, setQuery] = React.useState('');
  const ferieResidue = React.useMemo(() => { const m: Record<string, number> = {}; try { ferieBalanceFor(ctx, year, new Date()).forEach((r: any) => { m[r.infId] = r.residue; }); } catch (e) {} return m; }, [ctx, year]);
  const dim = daysInMonth(year, month);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s: any) => (s.nome || '').toLowerCase().includes(q) || (s.qualifica || '').toLowerCase().includes(q));
  }, [staff, query]);

  const confirmDelete = (id: string, nome: string) => {
    confirmAction('Eliminare membro', `Vuoi eliminare ${nome} dallo staff?\nVerranno rimossi anche tutti i turni e le assegnazioni associate.`, () => { removeStaff(id); toast.show(`${nome} eliminato dallo staff`, 'success'); }, 'Elimina');
  };

  const renderItem = ({ item: s }: { item: any }) => {
    const work = countWork(currentPiano, s.id, dim);
    const mt = monteTurni(s);
    const over = work > mt;
    const repNome = (s.reparti && s.reparti.length) ? (getRep(reparti, s.reparti[0])?.nome || '—') : '—';
    const pct = mt ? Math.max(0, Math.min(100, Math.round((work / mt) * 100))) : 0;
    return (
      <View style={[styles.opCard, shadows.glass]}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.opSurface}>
          <Pressable style={styles.bodyTap} onPress={() => router.push({ pathname: '/staff-detail', params: { infId: s.id } })}>
            <Avatar nome={s.nome} size={72} />
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={2}>{s.nome}</Text>
                <View style={styles.activePill}><View style={styles.activeDot} /><Text style={styles.activeTxt}>Attivo</Text></View>
              </View>
              <Text style={styles.sub} numberOfLines={1}>{s.qualifica}</Text>
              <Text style={styles.repTxt} numberOfLines={1}>{repNome}</Text>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: (over ? colors.danger2 : ACCENT) + '22' }]}>
                  <Text style={[styles.badgeTxt, { color: over ? colors.danger2 : ACCENT }]}>{work}/{mt} turni · {pct}%</Text>
                </View>
                {typeof ferieResidue[s.id] === 'number' ? <View style={[styles.badge, { backgroundColor: colors.green + '22' }]}><Text style={[styles.badgeTxt, { color: colors.green }]}>Ferie {ferieResidue[s.id]}g</Text></View> : null}
              </View>
            </View>
          </Pressable>
          <Pressable style={styles.delBtn} hitSlop={8} onPress={() => confirmDelete(s.id, s.nome)}>
            <Icon name="trash-outline" size={22} color={colors.textDisabled} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Personale</Text>
          <Text style={styles.subtitle}>{staff.length} membri del team</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => router.push('/staff-wizard')} style={[styles.headerBtn, { backgroundColor: ACCENT }]}>
          <Icon name="person-add-outline" size={24} color="#000" />
        </Pressable>
      </View>
      {/* RICERCA Apple 56 / r28 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={styles.searchInner}>
            <Icon name="search" size={20} color={colors.textDisabled} />
            <TextInput style={styles.searchInput} placeholder="Cerca personale…" placeholderTextColor={colors.textDisabled} value={query} onChangeText={setQuery} />
            {query ? <Pressable onPress={() => setQuery('')} hitSlop={8}><Icon name="close-circle" size={20} color={colors.textDisabled} /></Pressable> : <Icon name="mic-outline" size={20} color={colors.textDisabled} />}
          </View>
        </View>
      </View>

      {!staff.length ? (
        <EmptyState icon="people-outline" title="Nessun membro" desc="Aggiungi il personale: l'AI userà contratto, matrice ed esenzioni per generare i turni." actionLabel="Aggiungi membro" onAction={() => router.push('/staff-wizard')} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s: any) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={9}
          removeClippedSubviews
          ListEmptyComponent={<Text style={styles.noRes}>Nessun risultato per “{query}”.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingTop: spacing.s, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  headerBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.m },
  searchBar: { height: 56, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.glass },
  searchInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingHorizontal: spacing.l },
  searchInput: { flex: 1, fontSize: 17, color: colors.textPrimary },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 120, gap: spacing.m },
  opCard: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  opSurface: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.l },
  bodyTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.m, minWidth: 0 },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  name: { ...typography.cardTitle, color: colors.textPrimary, flexShrink: 1 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.s, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.green + '22' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  activeTxt: { ...typography.caption, fontWeight: '700', color: colors.green },
  sub: { ...typography.secondary, color: colors.textSecondary, marginTop: 3 },
  repTxt: { ...typography.caption, color: colors.textDisabled, marginTop: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.s },
  badge: { paddingHorizontal: spacing.m, paddingVertical: 5, borderRadius: radius.pill },
  badgeTxt: { ...typography.caption, fontWeight: '700' },
  delBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  noRes: { ...typography.secondary, color: colors.textDisabled, textAlign: 'center', padding: spacing.xl },
});
