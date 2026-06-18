// screens/DirezioneScreen.tsx — Direzione (redesign executive). Token /design.
// LOGICA INTATTA: computeCoverage/complianceReport/hoursBank/ferieBalance/matrixFidelity, export CSV.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { matrixFidelity } from '../services/matrixFidelity';
import Icon from '../components/Icon';
import CloseButton from '../components/CloseButton';
import EmptyState from '../components/EmptyState';
import { computeCoverage } from '../services/engine';
import { complianceReport } from '../services/compliance';
import { hoursBank } from '../services/hoursBank';
import { ferieBalance } from '../services/ferie';
import { shareOrDownloadText } from '../utils/platformShare';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

export default function DirezioneScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { ctx, currentPiano, year } = useStore();
  const piano = currentPiano || {};

  const data = useMemo(() => {
    const cov = computeCoverage(ctx, piano).globalPct;
    const comp = complianceReport(ctx, piano);
    const hb = hoursBank(ctx, piano);
    const fb = ferieBalance(ctx.staff, ctx.ferie, year);
    const straord = Math.round(hb.reduce((a, r) => a + r.straordinari, 0));
    const notti = hb.reduce((a, r) => a + r.notti, 0);
    const festivi = hb.reduce((a, r) => a + r.festivi, 0);
    const ferieResidue = fb.reduce((a, r) => a + r.residue, 0);
    return { cov, viol: comp.violazioni.length, perRegola: comp.perRegola, straord, notti, festivi, ferieResidue, hb };
  }, [ctx, piano, year]);

  const exportCsv = async () => {
    try {
      const lines = ['Indicatore;Valore', `Copertura globale;${data.cov}%`, `Violazioni normative;${data.viol}`, `Straordinari totali;${data.straord}h`, `Notti totali;${data.notti}`, `Festivi totali;${data.festivi}`, `Ferie residue (somma);${data.ferieResidue}`];
      await shareOrDownloadText('direzione.csv', lines.join('\n'), 'text/csv');
      toast.show('Riepilogo direzione esportato (CSV)', 'success');
    } catch { toast.show('Export non riuscito su questo dispositivo', 'error'); }
  };

  const Header = ({ sub }: { sub: string }) => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
      <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Direzione</Text><Text style={styles.subTitle}>{sub}</Text></View>
      <CloseButton />
    </View>
  );

  if (!ctx.staff.length || !ctx.reparti.length) {
    return (<View style={[styles.root, { backgroundColor: colors.bgEco }]}><Header sub="Quadro aziendale" /><EmptyState icon="stats-chart-outline" title="Dati insufficienti" desc="Configura reparti e personale per il quadro direzionale." /></View>);
  }

  const mf = (() => { try { return matrixFidelity(ctx, piano); } catch { return null; } })();
  // KPI primario grande (copertura) + griglia secondaria
  const sec: { lab: string; val: string; icon: any; tone: string }[] = [
    { lab: 'Violazioni norm.', val: `${data.viol}`, icon: 'alert-circle', tone: data.viol ? colors.danger2 : colors.green },
    { lab: 'Straordinari', val: `${data.straord}h`, icon: 'time', tone: colors.warning },
    { lab: 'Ferie residue', val: `${data.ferieResidue}`, icon: 'sunny', tone: colors.green },
    { lab: 'Notti', val: `${data.notti}`, icon: 'moon', tone: colors.shiftNotte },
    { lab: 'Festivi', val: `${data.festivi}`, icon: 'flag', tone: colors.purple },
    { lab: 'Fedeltà matrice', val: mf ? `${mf.score}` : '—', icon: 'grid-outline', tone: mf ? (mf.score >= 90 ? colors.green : mf.score >= 75 ? colors.blue : mf.score >= 60 ? colors.warning : colors.danger2) : colors.textDisabled },
  ];
  const covTone = data.cov >= 90 ? colors.green : data.cov >= 70 ? colors.warning : colors.danger2;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgEco }]}>
      <Header sub="Quadro aziendale del mese" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* KPI primario: copertura, valore grande */}
        <View style={[styles.heroCard, shadows.card]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: covTone + '22' }]}><Icon name="pulse" size={22} color={covTone} /></View>
            <Text style={styles.heroLabel}>Copertura globale</Text>
          </View>
          <Text style={[styles.heroValue, { color: covTone }]}>{data.cov}<Text style={styles.heroUnit}>%</Text></Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, data.cov))}%`, backgroundColor: covTone }]} /></View>
        </View>

        {/* griglia KPI secondari */}
        <View style={styles.grid}>
          {sec.map((k) => (
            <View key={k.lab} style={[styles.kpi, shadows.card]}>
              <View style={[styles.kpiIcon, { backgroundColor: k.tone + '22' }]}><Icon name={k.icon} size={18} color={k.tone} /></View>
              <Text style={[styles.kpiVal, { color: k.tone }]}>{k.val}</Text>
              <Text style={styles.kpiLab}>{k.lab}</Text>
            </View>
          ))}
        </View>

        {data.viol ? (<>
          <Text style={styles.sectionTitle}>CRITICITÀ NORMATIVE</Text>
          <View style={[styles.card, shadows.card]}>
            {Object.entries(data.perRegola).filter(([, n]) => (n as number) > 0).map(([r, n], i, arr) => (
              <View key={r} style={[styles.violRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderEco }]}>
                <Text style={styles.violTxt} numberOfLines={2}>{r}</Text>
                <View style={[styles.violBadge, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Text style={[styles.violN, { color: colors.danger2 }]}>{n as number}</Text></View>
              </View>
            ))}
          </View>
        </>) : null}

        <Pressable onPress={exportCsv} style={[styles.btn, { backgroundColor: colors.blue }]}><Icon name="download-outline" size={18} color="#08141E" /><Text style={styles.btnTxt}>Esporta riepilogo (CSV)</Text></Pressable>
        <Pressable onPress={() => router.push('/banca-ore')} style={[styles.btnGhost, { borderColor: colors.borderEco }]}><Icon name="time-outline" size={18} color={colors.blue} /><Text style={[styles.btnGhostTxt, { color: colors.blue }]}>Apri banca ore</Text></Pressable>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subTitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  hBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.s },
  heroIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  heroValue: { fontSize: 48, fontWeight: '800', marginBottom: spacing.m },
  heroUnit: { fontSize: 24, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.borderEco, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  kpi: { width: '47.5%', borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s },
  kpiVal: { ...typography.pageTitle, fontSize: 24, fontWeight: '800' },
  kpiLab: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.caption, fontWeight: '700', letterSpacing: 0.6, color: colors.textSecondary, marginTop: spacing.l, marginBottom: spacing.m },
  card: { borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  violRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.m, paddingVertical: spacing.m },
  violTxt: { ...typography.secondary, color: colors.textSecondary, flex: 1 },
  violBadge: { minWidth: 32, paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: 9, alignItems: 'center' },
  violN: { ...typography.secondary, fontWeight: '800' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button, marginTop: spacing.m },
  btnTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
  btnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button, borderWidth: 1, marginTop: spacing.s },
  btnGhostTxt: { ...typography.body, fontWeight: '700' },
});
