// screens/CentroCriticitaScreen.tsx — Centro Criticità (redesign). Sala controllo sui token /design.
// LOGICA INTATTA: whyUncovered/proposeAutoFix/applyFix/dashboardData/matrixFidelity.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { matrixFidelity } from '../services/matrixFidelity';
import { useToast } from '../hooks/useToast';
import Icon from '../components/Icon';
import CloseButton from '../components/CloseButton';
import { whyUncovered, proposeAutoFix, dashboardData, AutoFixSolution } from '../services/engine';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

const impColor = (v: string) => (v === 'alto' || v === 'critico') ? colors.danger2 : (v === 'medio' || v === 'attenzione') ? colors.warning : colors.green;

export default function CentroCriticitaScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { ctx, currentPiano, applyFix } = useStore();
  const piano = currentPiano || {};

  const why = useMemo(() => whyUncovered(ctx, piano), [ctx, piano]);
  const sols = useMemo(() => proposeAutoFix(ctx, piano), [ctx, piano]);
  const data = useMemo(() => dashboardData(ctx, piano, new Date().getDate()), [ctx, piano]);
  const hasData = ctx.staff.length > 0 || ctx.reparti.length > 0;
  const mf = useMemo(() => { try { return hasData ? matrixFidelity(ctx, piano) : null; } catch { return null; } }, [ctx, piano, hasData]);

  const scoperte = why.postazioniScoperte.length;
  const crit = data.criticita.length;
  const cov = data.coperturaMese;
  const sicurezza = (data.indiceSicurezza && data.indiceSicurezza.score) || 0;

  type Alarm = { level: 'red' | 'yellow' | 'green'; title: string; cause: string; action?: string };
  const alarms: Alarm[] = [];
  why.postazioniScoperte.forEach((p: string) => alarms.push({ level: 'red', title: `Postazione scoperta: ${p}`, cause: 'Copertura insufficiente sul turno', action: 'Valuta richiamo o spostamento' }));
  why.cause.forEach((c: any) => alarms.push({ level: 'red', title: c.nome, cause: c.motivo }));
  why.causeStrutturali.forEach((c: string) => alarms.push({ level: 'yellow', title: 'Criticità strutturale', cause: c }));
  if (!alarms.length) alarms.push({ level: 'green', title: 'Nessun allarme attivo', cause: 'Il piano del mese rispetta i vincoli operativi' });
  const lvlColor = (l: string) => (l === 'red' ? colors.danger2 : l === 'yellow' ? colors.warning : colors.green);
  const lvlRank: Record<string, number> = { red: 0, yellow: 1, green: 2 };
  const priorita = [...alarms].sort((a, b) => (lvlRank[a.level] ?? 3) - (lvlRank[b.level] ?? 3));

  const onApply = (sol: AutoFixSolution) => { applyFix(sol); toast.show(sol.azione.tipo === 'chiusura' ? 'Postazione chiusa' : 'Correzione applicata al piano', 'success'); };

  const Kpi = ({ icon, label, value, sub, tone }: { icon: any; label: string; value: string | number; sub: string; tone: string }) => (
    <View style={[styles.kpi, shadows.card]}>
      <View style={styles.kpiHead}>
        <View style={[styles.kpiIcon, { backgroundColor: tone + '22' }]}><Icon name={icon} size={18} color={tone} /></View>
        <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiSub, { color: tone }]}>{sub}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bgEco }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Centro Criticità</Text><Text style={styles.subTitle}>Situazione operativa del reparto</Text></View>
        <CloseButton />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        {!hasData ? (
          <View style={[styles.card, shadows.card, { alignItems: 'center', gap: spacing.s }]}>
            <Text style={styles.emptyT}>Nessun dato disponibile</Text>
            <Text style={styles.emptyD}>Crea reparti e personale per vedere copertura, criticità e indice di sicurezza reali.</Text>
          </View>
        ) : (<>
          <View style={styles.kpiRow}>
            <Kpi icon="pulse" label="Copertura" value={`${cov}%`} sub={cov >= 90 ? 'Ottima' : cov >= 70 ? 'Buona' : 'Critica'} tone={cov >= 90 ? colors.green : cov >= 70 ? colors.warning : colors.danger2} />
            <Kpi icon="alert-circle" label="Criticità" value={crit} sub={crit ? 'Da gestire' : 'Tutto ok'} tone={crit ? colors.danger2 : colors.green} />
          </View>
          <View style={styles.kpiRow}>
            <Kpi icon="list-outline" label="Scoperte" value={scoperte} sub={scoperte ? 'Intervieni' : 'Coperte'} tone={scoperte ? colors.danger2 : colors.green} />
            <Kpi icon="shield-checkmark-outline" label="Sicurezza" value={sicurezza} sub="/100" tone={sicurezza >= 80 ? colors.green : sicurezza >= 60 ? colors.warning : colors.danger2} />
          </View>
          <View style={styles.kpiRow}>
            <Kpi icon="grid-outline" label="Fedeltà matrice" value={mf ? mf.score : '—'} sub={mf ? mf.banda : 'In attesa'} tone={mf ? (mf.score >= 90 ? colors.green : mf.score >= 75 ? colors.blue : mf.score >= 60 ? colors.warning : colors.danger2) : colors.textDisabled} />
            <View style={{ flex: 1 }} />
          </View>

          <Text style={styles.sectionTitle}>ALLARMI ATTIVI</Text>
          {priorita.map((a, i) => (
            <View key={i} style={[styles.alarm, shadows.card, { borderLeftColor: lvlColor(a.level) }]}>
              <View style={styles.alarmRow}>
                <View style={[styles.dot, { backgroundColor: lvlColor(a.level) }]} />
                <Text style={styles.alarmTitle} numberOfLines={2}>{a.title}</Text>
              </View>
              <Text style={styles.alarmCause}>{a.cause}</Text>
              {a.action ? <Text style={[styles.alarmAction, { color: lvlColor(a.level) }]}>{a.action}</Text> : null}
            </View>
          ))}

          {sols.length ? (<>
            <Text style={styles.sectionTitle}>AI CORRECTION CENTER</Text>
            {sols.slice(0, 3).map((sol, i) => (
              <View key={i} style={[styles.card, shadows.card]}>
                <View style={styles.solTop}>
                  <Text style={styles.solTitle} numberOfLines={2}>{sol.titolo}</Text>
                  <Text style={[styles.cov, { color: sol.coperturaDopo >= 90 ? colors.green : colors.warning }]}>{sol.coperturaPrima}% → {sol.coperturaDopo}%</Text>
                </View>
                <Text style={styles.solDesc}>{sol.descrizione}</Text>
                <View style={styles.chips}>
                  {[['equità', sol.impattoEquita], ['fatigue', sol.impattoFatigue], ['costo', sol.impattoEconomico], ['legale', sol.rischioLegale]].map(([k, v]) => (
                    <View key={k} style={[styles.chip, { backgroundColor: impColor(v as string) + '22' }]}><Text style={[styles.chipTxt, { color: impColor(v as string) }]}>{k} {v}</Text></View>
                  ))}
                </View>
                <Pressable onPress={() => onApply(sol)} style={[styles.applyBtn, { backgroundColor: colors.blue }]}><Icon name="checkmark" size={18} color="#08141E" /><Text style={styles.applyTxt}>Applica</Text></Pressable>
              </View>
            ))}
          </>) : null}
        </>)}
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
  card: { borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  emptyT: { ...typography.cardTitle, color: colors.textPrimary },
  emptyD: { ...typography.secondary, color: colors.textSecondary, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.m },
  kpi: { flex: 1, minHeight: 110, borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.s },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  kpiValue: { ...typography.pageTitle, fontSize: 28, color: colors.textPrimary },
  kpiSub: { ...typography.caption, fontWeight: '700', marginTop: 2 },
  sectionTitle: { ...typography.caption, fontWeight: '700', letterSpacing: 0.6, color: colors.textSecondary, marginTop: spacing.l, marginBottom: spacing.m },
  alarm: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderEco, borderLeftWidth: 5, padding: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco },
  alarmRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  dot: { width: 10, height: 10, borderRadius: 5 },
  alarmTitle: { ...typography.body, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  alarmCause: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.s, lineHeight: 19, marginLeft: 18 },
  alarmAction: { ...typography.secondary, fontWeight: '700', marginTop: spacing.s, marginLeft: 18 },
  solTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.s },
  solTitle: { ...typography.body, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  cov: { ...typography.secondary, fontWeight: '800' },
  solDesc: { ...typography.secondary, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.m },
  chip: { paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: 9 },
  chipTxt: { ...typography.caption, fontWeight: '700' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 48, borderRadius: radius.button, marginTop: spacing.m },
  applyTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
});
