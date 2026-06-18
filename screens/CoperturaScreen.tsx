// screens/CoperturaScreen.tsx — Copertura (redesign). Dashboard visuale sui token /design.
// LOGICA INTATTA: coverage.byRep, regenerate, CoverageBar.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { TURNI } from '../utils/constants';
import EmptyState from '../components/EmptyState';
import CoverageBar from '../components/CoverageBar';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

const REP_COLORS = [colors.blue, colors.green, colors.purple, colors.warning, colors.teal, colors.danger2];

export default function CoperturaScreen() {
  const router = useRouter();
  const toast = useToast();
  const { reparti, coverage, regenerate } = useStore();

  const runAI = () => { const { stats, coverage: cov } = regenerate(); toast.show(`AI: copertura ${cov.globalPct}% · ${stats.filled} assegnati`, cov.uncovered.length ? 'warning' : 'success'); };

  const tone = (pct: number) => pct >= 90 ? colors.green : pct >= 70 ? colors.warning : colors.danger2;
  // KPI aggregati (dati esistenti)
  const agg = useMemo(() => {
    const reps = reparti.map((r: any) => coverage.byRep[r.id]).filter(Boolean);
    const ok = reps.filter((rc: any) => !rc.hasProblemi).length;
    const prob = reps.filter((rc: any) => rc.hasProblemi).length;
    return { tot: reparti.length, ok, prob, pct: coverage.globalPct };
  }, [reparti, coverage]);

  const Kpi = ({ icon, value, label, t }: { icon: any; value: string | number; label: string; t: string }) => (
    <View style={[styles.kpi, shadows.card]}>
      <View style={[styles.kpiIcon, { backgroundColor: t + '22' }]}><Icon name={icon} size={20} color={t} /></View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bgEco }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.pageTitle, { flex: 1 }]}>Copertura</Text>
        <Pressable hitSlop={8} onPress={runAI} style={[styles.hBtn, { backgroundColor: colors.blue }]}><Icon name="sparkles" size={20} color="#08141E" /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!reparti.length ? (
          <EmptyState icon="pulse-outline" title="Nessun dato di copertura" desc="Crea reparti e aggiungi personale per vedere la copertura dei turni." actionLabel="Crea reparto" onAction={() => router.push('/reparto-wizard')} />
        ) : (
          <>
            {/* KPI globali */}
            <View style={styles.kpiRow}>
              <Kpi icon="pie-chart-outline" value={`${agg.pct}%`} label="Media" t={tone(agg.pct)} />
              <Kpi icon="checkmark-circle-outline" value={agg.ok} label="Reparti ok" t={colors.green} />
              <Kpi icon="alert-circle-outline" value={agg.prob} label="Con problemi" t={agg.prob ? colors.danger2 : colors.textDisabled} />
            </View>

            {/* barra globale */}
            <View style={[styles.globalCard, shadows.card]}>
              <View style={styles.globalTop}>
                <Text style={styles.globalLabel}>Copertura media del mese</Text>
                <Text style={[styles.globalPct, { color: tone(agg.pct) }]}>{agg.pct}%</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, agg.pct))}%`, backgroundColor: tone(agg.pct) }]} /></View>
            </View>

            {/* per reparto */}
            {reparti.map((r: any, i: number) => {
              const rc = coverage.byRep[r.id] || { slots: [], avg: { M: null, P: null, N: null }, hasProblemi: false };
              return (
                <View key={r.id} style={[styles.card, shadows.card]}>
                  <View style={styles.cardHead}>
                    <View style={[styles.repIcon, { backgroundColor: REP_COLORS[i % REP_COLORS.length] }]}><Text style={styles.repIconTxt}>{r.sigla}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={2}>{r.nome}</Text>
                      <Text style={styles.sub}>M {rc.avg.M == null ? '–' : rc.avg.M + '%'} · P {rc.avg.P == null ? '–' : rc.avg.P + '%'} · N {rc.avg.N == null ? '–' : rc.avg.N + '%'}</Text>
                    </View>
                    {rc.hasProblemi ? <View style={[styles.flag, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Icon name="alert-circle" size={16} color={colors.danger2} /></View> : <View style={[styles.flag, { backgroundColor: 'rgba(88,204,2,0.15)' }]}><Icon name="checkmark" size={16} color={colors.green} /></View>}
                  </View>
                  {rc.slots.map((s: any) => (
                    <CoverageBar key={s.code} label={s.code} pct={s.pct} labelColor={TURNI[s.turn].col} />
                  ))}
                  {rc.hasProblemi ? (
                    <Pressable onPress={runAI} style={styles.aiLink}>
                      <Icon name="sparkles" size={16} color={colors.blue} />
                      <Text style={styles.aiLinkTxt}>Chiedi all’AI di coprire i turni mancanti</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingTop: spacing.s, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  hBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 120, gap: spacing.l },
  kpiRow: { flexDirection: 'row', gap: spacing.m },
  kpi: { flex: 1, minHeight: 110, borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco, justifyContent: 'center' },
  kpiIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s },
  kpiValue: { ...typography.pageTitle, fontSize: 28, color: colors.textPrimary },
  kpiLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  globalCard: { borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  globalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.m },
  globalLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  globalPct: { ...typography.cardTitle, fontWeight: '800' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.borderEco, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  card: { borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.m },
  repIcon: { width: 44, height: 44, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  repIconTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  name: { ...typography.cardTitle, color: colors.textPrimary },
  sub: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  flag: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aiLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.m },
  aiLinkTxt: { ...typography.secondary, fontWeight: '600', color: colors.blue },
});
