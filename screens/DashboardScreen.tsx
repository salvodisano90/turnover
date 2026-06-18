// screens/DashboardScreen.tsx — Dashboard (Apple Liquid Glass). SOLO UI: dati/logica invariati.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { familyCoverageScore, expandMatrix, operatorShiftsFromPiano } from '../services/familyConstraint';
import { daysInMonth } from '../utils/helpers';
import { fairnessReport } from '../services/fairness';
import { matrixFidelity } from '../services/matrixFidelity';
import { loadRepOp } from '../services/reperibilitaOp';
import Avatar from '../components/Avatar';
import PressableScale from '../components/PressableScale';
import CountUpText from '../components/CountUpText';
import GlassCard from '../components/GlassCard';
import Icon from '../components/Icon';
import { dashboardData } from '../services/engine';
import { complianceReport } from '../services/compliance';
import { colors, fnColor } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// mini sparkline a barre (riusa i dati reali dayPct)
function Spark({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  return (
    <View style={styles.spark}>
      {data.map((pv, i) => (
        <View key={i} style={{ flex: 1, height: 4 + Math.round(pv * 22), borderRadius: 2, backgroundColor: color, opacity: 0.35 + pv * 0.65 }} />
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ctx, currentPiano, profile, year, month, staff } = useStore();
  const dimFam = new Date(year, month + 1, 0).getDate();
  const famAgg = React.useMemo(() => {
    const ops = (staff || []).filter((o: any) => o.family?.enabled && o.family?.inverseMatrix?.length);
    if (!ops.length) return { count: 0, avg: 0, critici: 0 };
    let sum = 0, crit = 0;
    ops.forEach((o: any) => {
      const sh = operatorShiftsFromPiano(currentPiano || {}, o.id, dimFam);
      const partner = expandMatrix(o.family.inverseMatrix, dimFam, o.offset || 0);
      const fcs = familyCoverageScore(sh, partner);
      sum += fcs.score; crit += fcs.giorniCritici;
    });
    return { count: ops.length, avg: Math.round(sum / ops.length), critici: crit };
  }, [staff, currentPiano, dimFam]);

  const today = new Date();
  const dayNum = today.getDate();
  const piano = currentPiano || {};
  const data = useMemo(() => dashboardData(ctx, piano, dayNum), [ctx, piano, dayNum]);
  const comp = useMemo(() => complianceReport(ctx, piano), [ctx, piano]);
  const hasData = ctx.staff.length > 0 || ctx.reparti.length > 0;

  const assenzeOggi = useMemo(() => ctx.staff.filter((st) => { const c = piano[st.id] && piano[st.id][dayNum]; return !!c && c.turno === 'F'; }).length, [ctx.staff, piano, dayNum]);
  const inService = useMemo(() => ctx.staff.filter((s) => { const c = piano[s.id] && piano[s.id][dayNum]; return !!c && (c.turno === 'M' || c.turno === 'P' || c.turno === 'N'); }).length, [ctx.staff, piano, dayNum]);
  const fair = useMemo(() => { try { return hasData ? fairnessReport(ctx.staff, piano, year, month) : null; } catch { return null; } }, [ctx.staff, piano, year, month, hasData]);
  const mf = useMemo(() => { try { return hasData ? matrixFidelity(ctx, piano) : null; } catch { return null; } }, [ctx, piano, hasData]);
  const dayPct = useMemo(() => {
    const n = daysInMonth(year, month); const tot = ctx.staff.length || 1; const out: number[] = [];
    for (let d = 1; d <= n; d++) { const inT = ctx.staff.filter((st) => { const c = piano[st.id] && piano[st.id][d]; return !!c && (c.turno === 'M' || c.turno === 'P' || c.turno === 'N'); }).length; out.push(inT / tot); }
    return out;
  }, [ctx.staff, piano, year, month]);
  const [reperibili, setReperibili] = useState<number | null>(null);
  useEffect(() => { let on = true; const iso = new Date().toISOString().slice(0, 10); loadRepOp().then((list) => { if (on) setReperibili((list || []).filter((r: any) => r.data === iso && r.stato !== 'rifiutata').length); }).catch(() => { if (on) setReperibili(null); }); return () => { on = false; }; }, []);

  const cov = data.coperturaOggi;
  const covColor = cov >= 90 ? colors.green : cov >= 70 ? colors.warning : colors.danger2;
  const covDelta = cov - data.coperturaMese;
  const crit = data.criticita.length;
  const nome = (profile && (profile as any).nome) || 'Coordinatore';
  const emoji = '';

  // 4 KPI come nel mockup
  const kpis = [
    { label: 'Turni assegnati', value: `${data.criticita ? '' : ''}${ctx.staff.reduce((a, st) => a + Object.keys(piano[st.id] || {}).length, 0)}`, accent: colors.fnPianificazione, trend: covDelta >= 0 ? `+${covDelta}% vs mese scorso` : `${covDelta}% vs mese scorso`, spark: dayPct },
    { label: 'Personale attivo', value: `${inService}`, accent: colors.fnPersonale, trend: `${inService}/${ctx.staff.length} in servizio`, spark: dayPct.map((x) => x * 0.8) },
    { label: 'Copertura media', value: `${cov}%`, accent: colors.fnReport, trend: covDelta >= 0 ? `+${covDelta}% vs mese scorso` : `${covDelta}% vs mese scorso`, big: true },
    { label: 'Criticità aperte', value: `${crit}`, accent: colors.fnCriticita, trend: crit ? 'Da gestire' : 'Tutto ok', big: true },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xxl, paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* Header gigante + avatar */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Ciao, {nome}</Text>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.subtitle}>Panoramica generale</Text>
          </View>
          <PressableScale onPress={() => router.push('/profilo')}><Avatar nome={nome} ruolo="OWNER" size={52} config={profile as any} /></PressableScale>
        </View>

        {/* selettore mese (pill glass) */}
        <Pressable onPress={() => router.push('/turni')} style={styles.monthPill}>
          <Text style={styles.monthTxt}>{MESI[month]} {year}</Text>
          <Icon name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>

        {!hasData ? (
          <GlassCard style={{ marginTop: spacing.l, alignItems: 'center' }}>
            <Icon name="analytics-outline" size={28} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>Nessun dato disponibile</Text>
            <Text style={styles.emptySub}>Crea il primo reparto e aggiungi il personale: i KPI mostreranno solo dati reali.</Text>
          </GlassCard>
        ) : (<>
          {/* griglia 4 KPI glass */}
          <View style={styles.grid}>
            {kpis.map((k) => (
              <GlassCard key={k.label} style={styles.kpi} padded={false}>
                <View style={styles.kpiInner}>
                  <Text style={[styles.kpiValue, { color: k.accent }]}>{k.value}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                  {k.spark ? <Spark data={k.spark} color={k.accent} /> : <View style={{ height: spacing.s }} />}
                  <Text style={[styles.kpiTrend, { color: k.trend.startsWith('-') ? colors.danger2 : colors.textSecondary }]} numberOfLines={1}>{k.trend}</Text>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Prossimi turni critici */}
          <View style={styles.secHead}>
            <Text style={styles.sectionTitle}>Prossimi turni critici</Text>
            <Pressable onPress={() => router.push('/centro-criticita')} hitSlop={8}><Text style={[styles.seeAll, { color: colors.blue }]}>Vedi tutto</Text></Pressable>
          </View>
          {crit ? data.criticita.slice(0, 4).map((c: any, i: number) => {
            const label = typeof c === 'string' ? c : ((c && (c.nome || c.titolo)) || 'Criticità');
            return (
              <PressableScale key={i} onPress={() => router.push('/centro-criticita')}>
                <GlassCard style={styles.critCard} padded={false}>
                  <View style={styles.critRow}>
                    <View style={[styles.critIcon, { backgroundColor: colors.fnCriticita + '22' }]}><Icon name="alert-circle" size={20} color={colors.fnCriticita} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.critTitle} numberOfLines={2}>{label}</Text>
                      <Text style={styles.critSub}>Richiede attenzione</Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={colors.textDisabled} />
                  </View>
                </GlassCard>
              </PressableScale>
            );
          }) : (
            <GlassCard style={styles.critCard}>
              <View style={styles.critRow}>
                <View style={[styles.critIcon, { backgroundColor: colors.green + '22' }]}><Icon name="checkmark" size={20} color={colors.green} /></View>
                <Text style={[styles.critTitle, { flex: 1 }]}>Nessuna criticità rilevata oggi</Text>
              </View>
            </GlassCard>
          )}

          {/* indici equità/fedeltà come due mini KPI glass */}
          <View style={[styles.grid, { marginTop: spacing.l }]}>
            <GlassCard style={styles.kpi}>
              <Text style={styles.miniLbl}>Equità carichi</Text>
              <Text style={[styles.miniVal, { color: colors.fnPersonale }]}>{fair ? fair.fairnessScore : '—'}</Text>
              <Text style={styles.kpiTrend}>{fair ? fair.categoria : 'In attesa'}</Text>
            </GlassCard>
            <GlassCard style={styles.kpi}>
              <Text style={styles.miniLbl}>Fedeltà matrice</Text>
              <Text style={[styles.miniVal, { color: colors.fnSimulazione }]}>{mf ? mf.score : '—'}</Text>
              <Text style={styles.kpiTrend}>{mf ? mf.banda : 'In attesa'}</Text>
            </GlassCard>
          </View>
        </>)}

        {famAgg.count > 0 ? (
          <PressableScale onPress={() => router.push('/centro-decisionale')} style={{ marginTop: spacing.l }}>
            <View style={[styles.backupRow]}>
              <View style={[styles.critIcon, { backgroundColor: colors.purple + '22' }]}><Icon name="home-outline" size={22} color={colors.purple} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.critTitle}>Copertura familiare</Text>
                <Text style={styles.critSub} numberOfLines={2}>{famAgg.count} operatori con vincolo · indice medio {famAgg.avg}% · {famAgg.critici} giorni critici</Text>
              </View>
              <Text style={[styles.miniVal, { color: famAgg.avg >= 80 ? colors.green : famAgg.avg >= 50 ? colors.warning : colors.danger2 }]}>{famAgg.avg}%</Text>
            </View>
          </PressableScale>
        ) : null}

        <PressableScale onPress={() => router.push('/backup')} style={{ marginTop: spacing.l }}>
          <View style={[styles.backupRow]}>
            <View style={[styles.critIcon, { backgroundColor: colors.green + '22' }]}><Icon name="save-outline" size={22} color={colors.green} /></View>
            <View style={{ flex: 1 }}><Text style={styles.critTitle}>Backup e Ripristino</Text><Text style={styles.critSub}>Salva o ripristina i dati (cifrati)</Text></View>
            <Icon name="chevron-forward" size={18} color={colors.textDisabled} />
          </View>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.m, marginBottom: spacing.l },
  greet: { ...typography.body, color: colors.textSecondary, marginBottom: 2 },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  monthPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, alignSelf: 'flex-start', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.l, paddingVertical: spacing.s, marginBottom: spacing.l },
  monthTxt: { ...typography.secondary, fontWeight: '600', color: colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  kpi: { width: '47.5%' },
  kpiInner: { padding: spacing.xl },
  kpiValue: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  kpiLabel: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  kpiTrend: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.s },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 26, marginTop: spacing.m },
  miniLbl: { ...typography.secondary, color: colors.textSecondary },
  miniVal: { fontSize: 30, fontWeight: '700', marginTop: spacing.s },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.h, marginBottom: spacing.m },
  sectionTitle: { ...typography.cardTitle, color: colors.textPrimary },
  seeAll: { ...typography.secondary, fontWeight: '600' },
  critCard: { marginBottom: spacing.m },
  backupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.l, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card },
  critRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.l },
  critIcon: { width: 44, height: 44, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  critTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  critSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyTitle: { ...typography.cardTitle, color: colors.textPrimary, marginTop: spacing.s },
  emptySub: { ...typography.secondary, color: colors.textDisabled, textAlign: 'center', marginTop: 4, lineHeight: 20 },
});
