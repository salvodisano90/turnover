// screens/ReportScreen.tsx — Report (redesign executive completo). Token /design.
// LOGICA INTATTA: listDeroghe, matrixReport, simulateRange, monthlyHours/annualHours, exportPianoPDF/XLSX.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import CloseButton from '../components/CloseButton';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { listDeroghe, matrixReport, MatriceOrigine } from '../services/engine';
import { exportPianoPDF } from '../services/pdf';
import { simulateRange, SimResult } from '../services/analytics';
import { monthlyHours, annualHours } from '../services/hours';
import { exportPianoXLSX } from '../services/xlsx';
import { MonthlyHours, AnnualHours } from '../types';
import { DEROGA_LABEL, MONTHS } from '../utils/constants';
import { getRep } from '../utils/helpers';
import { DerogaCode } from '../types';
import EmptyState from '../components/EmptyState';
import { colors, fnColor } from '../design/colors';
const ACCENT = fnColor.report;
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

const g = (v: number, a: number, b: number) => v >= a ? colors.green : v >= b ? colors.warning : colors.danger2;

export default function ReportScreen() {
  const router = useRouter();
  const toast = useToast();
  const { reparti, staff, currentPiano, coverage, ctx, month, year } = useStore();
  const [sim, setSim] = useState<SimResult | null>(null);
  const [annual, setAnnual] = useState<AnnualHours | null>(null);

  const deroghe = useMemo(() => listDeroghe(ctx, currentPiano), [ctx, currentPiano]);
  const mh = useMemo<MonthlyHours>(() => monthlyHours(ctx, currentPiano), [ctx, currentPiano]);
  const mr = useMemo(() => matrixReport(ctx, currentPiano), [ctx, currentPiano]);
  const ORIGINE_UI: Record<MatriceOrigine, string> = { operatore: 'operatore', reparto: 'reparto', mese: 'mese', auto: 'automatica' };
  const DEROGA_MOTIVO_UI: Record<string, string> = { ore: 'Oltre il monte ore (straordinario)', notti: 'Oltre la quota notti mensile', consec: 'Oltre i 6 giorni consecutivi', weekend: 'Weekend assegnato in esenzione', festivo: 'Festivo assegnato in esenzione', preferenza: 'Preferenza non rispettata', desiderata: 'Desiderata non rispettato' };

  const derogheRows = useMemo(() => {
    const rows: { nome: string; day: number; rep: string; tipo: string; motivo: string }[] = [];
    staff.forEach((s) => { const p = currentPiano[s.id]; if (!p) return; Object.keys(p).forEach((dk) => { const d = Number(dk); const c = p[d]; if (c && c.deroghe && c.deroghe.length) { const rep = c.repartoId ? (getRep(reparti, c.repartoId)?.nome || '—') : '—'; (c.deroghe || []).forEach((code: DerogaCode) => rows.push({ nome: s.nome, day: d, rep, tipo: DEROGA_LABEL[code], motivo: DEROGA_MOTIVO_UI[code] || code })); } }); });
    return rows.sort((a, b) => a.day - b.day);
  }, [staff, currentPiano, reparti]);

  const uncByRep = useMemo(() => { const m: Record<string, number> = {}; coverage.uncovered.forEach((u) => { m[u.repId] = (m[u.repId] || 0) + 1; }); return m; }, [coverage]);

  const doExport = async () => { try { await exportPianoPDF(ctx, currentPiano); } catch { toast.show('Esportazione PDF non riuscita', 'error'); } };
  const doExportXLSX = async () => { try { await exportPianoXLSX(ctx, currentPiano); toast.show('Excel esportato (Riepilogo + Assenze)', 'success'); } catch { toast.show('Export Excel non riuscito su questo dispositivo', 'error'); } };
  const runSim = (m: number) => setSim(simulateRange(ctx, year, month, m));
  const runAnnual = (m: number) => setAnnual(annualHours(ctx, year, month, m));

  const Header = () => (
    <View style={[styles.header]}>
      <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Report</Text><Text style={styles.subTitle}>{MONTHS[month]} {year}</Text></View>
      <CloseButton />
    </View>
  );
  const Sec = ({ children }: { children: React.ReactNode }) => <Text style={styles.sectionTitle}>{children}</Text>;
  const Row = ({ name, sub, sub2, badge, badgeTone }: { name: string; sub?: string; sub2?: string; badge?: string; badgeTone?: string }) => (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        {sub2 ? <Text style={[styles.rowSub, { color: colors.textDisabled }]}>{sub2}</Text> : null}
      </View>
      {badge ? <View style={[styles.badge, { backgroundColor: (badgeTone || colors.blue) + '22' }]}><Text style={[styles.badgeTxt, { color: badgeTone || colors.blue }]}>{badge}</Text></View> : null}
    </View>
  );
  const EqRow = ({ lab, val, tone }: { lab: string; val: string | number; tone?: string }) => (
    <View style={styles.eqRow}><Text style={styles.eqLab}>{lab}</Text><Text style={[styles.eqVal, { color: tone || colors.textPrimary }]}>{val}</Text></View>
  );

  if (!reparti.length || !staff.length) {
    return (<SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bgEco }]}><Header /><EmptyState icon="bar-chart-outline" title="Report non disponibile" desc="Servono reparti e personale per generare statistiche e report." actionLabel="Vai ai reparti" onAction={() => router.push('/reparti')} /></SafeAreaView>);
  }

  const kpis = [
    { val: `${coverage.globalPct}%`, lab: 'Copertura globale', tone: g(coverage.globalPct, 90, 70), icon: 'pulse' },
    { val: `${coverage.uncovered.length}`, lab: 'Turni scoperti', tone: coverage.uncovered.length ? colors.danger2 : colors.green, icon: 'alert-circle' },
    { val: `${deroghe.length}`, lab: 'Deroghe/Straord.', tone: deroghe.length ? colors.warning : colors.green, icon: 'flash' },
    { val: `${staff.length}`, lab: 'Membri staff', tone: colors.blue, icon: 'people' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bgEco }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI */}
        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.lab} style={[styles.kpiCard, shadows.card]}>
              <View style={[styles.kpiIcon, { backgroundColor: k.tone + '22' }]}><Icon name={k.icon as any} size={18} color={k.tone} /></View>
              <Text style={[styles.kpiVal, { color: k.tone }]}>{k.val}</Text>
              <Text style={styles.kpiLab}>{k.lab}</Text>
            </View>
          ))}
        </View>

        {/* Aderenza matrice */}
        {mr.perOp.length ? (<>
          <Sec>ADERENZA ALLA MATRICE</Sec>
          <View style={[styles.card, shadows.card]}>
            <View style={styles.adhTop}>
              <Text style={[styles.adhBig, { color: g(mr.aderenzaPct, 90, 1) }]}>{mr.aderenzaPct}%</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>Giorni che derivano dalla matrice</Text>
                <Text style={styles.rowSub}>{mr.giorniModificati} modificati · {mr.giorniAssenza} assenze (escluse)</Text>
              </View>
            </View>
            <View style={styles.chips}>
              {Object.keys(mr.byMatrice).map((id) => <Text key={id} style={[styles.chip, { color: colors.textSecondary, backgroundColor: colors.bgEco }]}>{id}: {mr.byMatrice[id]}</Text>)}
              {Object.keys(mr.byOrigine).map((o) => <Text key={o} style={[styles.chip, { color: colors.blue, backgroundColor: 'rgba(88,204,255,0.15)' }]}>origine {ORIGINE_UI[o as MatriceOrigine] || o}: {mr.byOrigine[o]}</Text>)}
            </View>
          </View>
          <View style={[styles.cardFlush, shadows.card]}>
            {mr.perOp.slice(0, 80).map((o, idx, arr) => (
              <View key={o.infId} style={[styles.rowLine, idx < arr.length - 1 && styles.rowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{o.nome} · {o.matriceLabel}</Text>
                  <Text style={styles.rowSub}>origine {ORIGINE_UI[o.origine] || o.origine} · ciclo {o.cycleLen}gg · pos. {o.position + 1}{o.deroghe ? ` · ${o.deroghe} deroghe` : ''}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: g(o.aderenzaPct, 90, 1) + '22' }]}><Text style={[styles.badgeTxt, { color: g(o.aderenzaPct, 90, 1) }]}>{o.aderenzaPct}%</Text></View>
              </View>
            ))}
            {mr.perOp.length > 80 ? <Text style={styles.more}>… e altri {mr.perOp.length - 80} operatori</Text> : null}
          </View>
        </>) : null}

        {/* Deroghe */}
        {derogheRows.length ? (<>
          <Sec>DEROGHE GENERATE ({derogheRows.length})</Sec>
          <View style={[styles.cardFlush, shadows.card]}>
            {derogheRows.slice(0, 80).map((r, idx, arr) => (
              <View key={idx} style={[styles.rowLine, idx < arr.length - 1 && styles.rowBorder]}>
                <View style={{ flex: 1 }}><Text style={styles.rowName}>{r.nome} · giorno {r.day}</Text><Text style={styles.rowSub}>{r.rep} · {r.tipo} — {r.motivo}</Text></View>
              </View>
            ))}
            {derogheRows.length > 80 ? <Text style={styles.more}>… e altre {derogheRows.length - 80} deroghe</Text> : null}
          </View>
        </>) : null}

        {/* Scoperti per reparto */}
        {Object.keys(uncByRep).length ? (<>
          <Sec>TURNI SCOPERTI PER REPARTO</Sec>
          <View style={[styles.cardFlush, shadows.card]}>
            {Object.keys(uncByRep).map((rid, idx, arr) => { const r = getRep(reparti, rid); if (!r) return null; return (
              <View key={rid} style={[styles.rowLine, idx < arr.length - 1 && styles.rowBorder]}><Text style={[styles.rowName, { flex: 1 }]}>{r.nome}</Text><View style={[styles.badge, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Text style={[styles.badgeTxt, { color: colors.danger2 }]}>{uncByRep[rid]} slot</Text></View></View>
            ); })}
          </View>
        </>) : null}

        {/* Simulazione & equità */}
        <Sec>SIMULAZIONE & EQUITÀ</Sec>
        <View style={[styles.card, shadows.card]}>
          <View style={styles.simBtns}>
            <Pressable onPress={() => runSim(12)} style={[styles.simBtn, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.simBtnTxt, { color: colors.blue }]}>Simula 12 mesi</Text></Pressable>
            <Pressable onPress={() => runSim(24)} style={[styles.simBtn, { backgroundColor: colors.blue }]}><Text style={[styles.simBtnTxt, { color: '#000' }]}>Simula 24 mesi</Text></Pressable>
          </View>
          {sim ? (<>
            <EqRow lab={`Indice equità · ${sim.label}`} val={`${sim.equityIndex}/100`} tone={g(sim.equityIndex, 80, 60)} />
            <EqRow lab="Indice coerenza matrice" val={`${sim.coherenceIndex}/100`} tone={g(sim.coherenceIndex, 80, 60)} />
            <Text style={styles.aggr}>Equilibrio {sim.livello} · σ ore {sim.stdDevOre} · più carico: {sim.penalized} · meno carico: {sim.favored}</Text>
            {sim.alerts.map((a, i) => (<View key={i} style={[styles.alert, { backgroundColor: a.severity === 'warn' ? 'rgba(255,107,107,0.15)' : 'rgba(255,176,32,0.15)' }]}><Text style={[styles.alertTxt, { color: a.severity === 'warn' ? colors.danger2 : colors.warning }]}>⚠ {a.message}</Text></View>))}
            <Text style={styles.aggr}>Totali: {sim.aggregate.ore}h · {sim.aggregate.notti} notti · {sim.aggregate.weekend} weekend · {sim.aggregate.festivi} festivi · {sim.aggregate.straordinari} straord. · {sim.aggregate.riposi} riposi</Text>
          </>) : <Text style={styles.hint}>Proiezione continua del ciclo (festività italiane incluse): ore, notti, weekend, festivi, straordinari, riposi, ferie ed equità per operatore.</Text>}
        </View>

        {/* Qualità organizzativa */}
        {sim ? (<>
          <Sec>QUALITÀ ORGANIZZATIVA</Sec>
          <View style={[styles.card, shadows.card]}>
            <EqRow lab="Copertura" val={`${sim.coveragePct}%`} tone={g(sim.coveragePct, 95, 85)} />
            <EqRow lab="Equità" val={`${sim.equityIndex}/100`} tone={g(sim.equityIndex, 80, 60)} />
            <EqRow lab="Coerenza" val={`${sim.coherenceIndex}/100`} tone={g(sim.coherenceIndex, 80, 60)} />
            <EqRow lab="Preferenze soddisfatte" val={`${sim.prefPct}%`} tone={g(sim.prefPct, 80, 60)} />
            <EqRow lab="Desiderata soddisfatti" val={`${sim.desPct}%`} tone={g(sim.desPct, 80, 60)} />
            <EqRow lab="Deroghe generate" val={sim.deroghe} />
          </View>
          <View style={[styles.cardFlush, shadows.card]}>
            {sim.perOperator.map((o, idx, arr) => (
              <View key={o.infId} style={[styles.rowLine, idx < arr.length - 1 && styles.rowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{o.nome}</Text>
                  <Text style={styles.rowSub}>{o.ore}h · {o.notti}N · {o.weekend}we · {o.festivi}fest · {o.straordinari}str{o.assenze ? ' · ' + o.assenze + 'ass' : ''}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.badgeTxt, { color: colors.blue }]}>{o.carico}%</Text></View>
              </View>
            ))}
          </View>
        </>) : null}

        {/* Monte ore */}
        <Sec>MONTE ORE CONTRATTUALE</Sec>
        <View style={[styles.card, shadows.card]}>
          <View style={styles.simBtns}>
            <Pressable onPress={() => setAnnual(null)} style={[styles.simBtn, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.simBtnTxt, { color: colors.blue }]}>Mese corrente</Text></Pressable>
            <Pressable onPress={() => runAnnual(12)} style={[styles.simBtn, { backgroundColor: colors.blue }]}><Text style={[styles.simBtnTxt, { color: '#000' }]}>Annuale (12 mesi)</Text></Pressable>
          </View>
          {(annual ? annual.alerts : mh.alerts).map((a, i) => (<View key={i} style={[styles.alert, { backgroundColor: a.level === 'warning' ? 'rgba(255,107,107,0.15)' : 'rgba(88,204,255,0.15)' }]}><Text style={[styles.alertTxt, { color: a.level === 'warning' ? colors.danger2 : colors.blue }]}>{a.message}</Text></View>))}
          {annual ? <Text style={styles.aggr}>Periodo: {annual.label} · trend {annual.trend[0]?.label} → {annual.trend[annual.trend.length - 1]?.label}</Text> : null}
        </View>
        <View style={[styles.cardFlush, shadows.card]}>
          {(annual ? annual.perOperator : mh.perOperator).map((o, idx, arr) => (
            <View key={o.infId} style={[styles.rowLine, idx < arr.length - 1 && styles.rowBorder]}>
              <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.rowName} numberOfLines={1}>{o.nome}</Text><Text style={styles.rowSub}>previste {o.expected}h · assegnate {o.assigned}h{o.overtime ? ' · straord. ' + o.overtime + 'h' : ''}{o.debt ? ' · debito ' + o.debt + 'h' : ''}</Text></View>
              <View style={[styles.badge, { backgroundColor: (o.diff > 0 ? colors.green : o.diff < 0 ? colors.danger2 : colors.textSecondary) + '22' }]}><Text style={[styles.badgeTxt, { color: o.diff > 0 ? colors.green : o.diff < 0 ? colors.danger2 : colors.textSecondary }]}>{o.diff > 0 ? '+' : ''}{o.diff}h</Text></View>
            </View>
          ))}
        </View>

        {/* Export */}
        <Pressable onPress={doExportXLSX} style={[styles.exportBtn, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Icon name="grid-outline" size={18} color={colors.blue} /><Text style={[styles.exportTxt, { color: colors.blue }]}>Esporta Excel (XLSX)</Text></Pressable>
        <Pressable onPress={doExport} style={[styles.exportBtn, { backgroundColor: ACCENT }]}><Icon name="document-text-outline" size={18} color="#000" /><Text style={[styles.exportTxt, { color: '#000' }]}>Esporta PDF</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingTop: spacing.s, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subTitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  hBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 120 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  kpiCard: { width: '47.5%', borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s },
  kpiVal: { ...typography.pageTitle, fontSize: 28, fontWeight: '800' },
  kpiLab: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.caption, fontWeight: '700', letterSpacing: 0.6, color: colors.textSecondary, marginTop: spacing.l, marginBottom: spacing.m },
  card: { borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  cardFlush: { borderRadius: radius.card, paddingHorizontal: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  adhTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  adhBig: { fontSize: 34, fontWeight: '800', minWidth: 80 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.m },
  chip: { ...typography.caption, fontWeight: '700', paddingHorizontal: spacing.s, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.m },
  rowLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.m },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderEco },
  rowName: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: spacing.s, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { ...typography.caption, fontWeight: '800' },
  more: { ...typography.caption, color: colors.textDisabled, paddingVertical: spacing.m },
  simBtns: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.s },
  simBtn: { flex: 1, height: 44, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  simBtnTxt: { ...typography.secondary, fontWeight: '800' },
  eqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.m },
  eqLab: { ...typography.secondary, color: colors.textSecondary, flex: 1, marginRight: spacing.s },
  eqVal: { ...typography.cardTitle, fontWeight: '800' },
  alert: { borderRadius: radius.smallCard, paddingHorizontal: spacing.m, paddingVertical: spacing.s, marginTop: spacing.s },
  alertTxt: { ...typography.caption, fontWeight: '600' },
  aggr: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.m, lineHeight: 18 },
  hint: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.m, lineHeight: 18 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button, marginTop: spacing.s },
  exportTxt: { ...typography.body, fontWeight: '700' },
});
