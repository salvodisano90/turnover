// screens/TurniScreen.tsx — Pianificazione / Calendario (Apple Liquid Glass). SOLO UI.
// LOGICA INTATTA: regenerate, undo/redo, coverage, filtri, ShiftGrid (rendering griglia) invariati.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { TURNI, MONTHS } from '../utils/constants';
import { Turno } from '../types';
import { countWork } from '../services/engine';
import { daysInMonth } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import Chip from '../components/Chip';
import ShiftGrid from '../components/ShiftGrid';
import GlassCard from '../components/GlassCard';
import { exportPianoXLSX } from '../services/xlsx';
import { colors, fnColor } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const SHIFT_COLOR: Record<string, string> = { M: colors.shiftMattina, P: colors.shiftPomeriggio, N: colors.shiftNotte, R: colors.shiftReperibilita, F: colors.shiftFerie };
const ACCENT = fnColor.pianificazione;

export default function TurniScreen() {
  const router = useRouter();
  const toast = useToast();
  const { reparti, staff, currentPiano, coverage, filterReparto, setFilter, regenerate, year, month, canUndo, canRedo, undo, redo, ctx } = useStore();

  const visible = useMemo(() => filterReparto === 'all' ? staff : staff.filter((s) => (s.reparti || []).indexOf(filterReparto) >= 0), [staff, filterReparto]);
  const dim = daysInMonth(year, month);

  const summary = useMemo(() => {
    let turni = 0, ferie = 0, rep = 0;
    staff.forEach((s: any) => { turni += countWork(currentPiano, s.id, dim); });
    Object.values(currentPiano || {}).forEach((row: any) => Object.values(row || {}).forEach((c: any) => { const t = typeof c === 'string' ? c : c?.turno; if (t === 'F') ferie++; if (t === 'R') rep++; }));
    return { turni, ferie, rep };
  }, [staff, currentPiano, dim]);

  const runAI = () => {
    const { stats, coverage: cov } = regenerate();
    let msg = `AI: copertura ${cov.globalPct}%`;
    if (stats.filled) msg += ` · ${stats.filled} turni assegnati`;
    if (stats.deroghe) msg += ` · ${stats.deroghe} deroghe`;
    if (typeof stats.equityAfter === 'number') msg += ` · equità ${stats.equityAfter}/100`;
    toast.show(msg, cov.uncovered.length ? 'warning' : 'success');
  };

  const doExportXLSX = async () => { try { await exportPianoXLSX(ctx, currentPiano || {}); toast.show('Excel esportato (Calendario · Personale · Statistiche)', 'success'); } catch { toast.show('Export Excel non riuscito su questo dispositivo', 'error'); } };

  const covTone = coverage.globalPct >= 90 ? colors.green : coverage.globalPct >= 70 ? colors.warning : colors.danger2;

  const Kpi = ({ icon, value, label, tone }: { icon: any; value: string | number; label: string; tone: string }) => (
    <GlassCard style={styles.kpi} padded={false}>
      <View style={styles.kpiInner}>
        <View style={[styles.kpiIcon, { backgroundColor: tone + '22' }]}><Icon name={icon} size={20} color={tone} /></View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Pianificazione</Text>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        </View>
        <Pressable hitSlop={6} onPress={() => { undo(); toast.show('Modifica annullata', 'info'); }} disabled={!canUndo} style={[styles.hBtn, !canUndo && styles.hBtnOff]}><Icon name="arrow-undo" size={20} color={colors.textPrimary} /></Pressable>
        <Pressable hitSlop={6} onPress={() => { redo(); toast.show('Modifica ripristinata', 'info'); }} disabled={!canRedo} style={[styles.hBtn, !canRedo && styles.hBtnOff]}><Icon name="arrow-redo" size={20} color={colors.textPrimary} /></Pressable>
        <Pressable hitSlop={6} onPress={runAI} style={[styles.hBtn, { backgroundColor: ACCENT }]}><Icon name="sparkles" size={20} color="#000" /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!reparti.length ? (
          <EmptyState icon="business-outline" title="Nessun reparto" desc="Inizia creando un reparto con i suoi settori e orari. Poi aggiungi il personale e l'AI penserà ai turni." actionLabel="Crea reparto" onAction={() => router.push('/reparto-wizard')} />
        ) : !staff.length ? (
          <EmptyState icon="people-outline" title="Nessun membro dello staff" desc="Aggiungi gli operatori con contratto e matrice. Appena inserisci il personale, l'AI genera e copre i turni automaticamente." actionLabel="Aggiungi membro" onAction={() => router.push('/staff-wizard')} />
        ) : (
          <>
            <View style={styles.kpiRow}>
              <Kpi icon="checkmark-done-outline" value={summary.turni} label="Turni" tone={colors.fnPianificazione} />
              <Kpi icon="sunny-outline" value={summary.ferie} label="Ferie" tone={colors.fnReport} />
              <Kpi icon="call-outline" value={summary.rep} label="Reperib." tone={colors.warning} />
            </View>

            <GlassCard style={{ marginBottom: spacing.l }}>
              <View style={styles.coverTop}>
                <Text style={styles.coverLabel}>Copertura del mese</Text>
                <Text style={[styles.coverPct, { color: covTone }]}>{coverage.globalPct}%</Text>
              </View>
              <View style={styles.coverTrack}><View style={[styles.coverFill, { width: `${Math.max(0, Math.min(100, coverage.globalPct))}%`, backgroundColor: covTone }]} /></View>
            </GlassCard>

            {coverage.uncovered.length ? (
              <PressableScaleRow onPress={runAI} />
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="Tutti" active={filterReparto === 'all'} onPress={() => setFilter('all')} />
              {reparti.map((r) => <Chip key={r.id} label={r.nome} active={filterReparto === r.id} onPress={() => setFilter(r.id)} />)}
            </ScrollView>

            {/* GRIGLIA — rendering invariato (ShiftGrid), avvolto in GlassCard */}
            <GlassCard style={{ marginBottom: spacing.l }} padded={false}>
              <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
                <ShiftGrid staff={visible} allStaff={staff} piano={currentPiano} year={year} month={month} onCellPress={(infId, day) => router.push({ pathname: '/cell-editor', params: { infId, day: String(day) } })} />
              </View>
            </GlassCard>

            <GlassCard>
              <View style={styles.legend}>
                {(['M', 'P', 'N', 'R', 'F'] as Turno[]).map((t) => (
                  <View key={t} style={styles.legendItem}>
                    <View style={[styles.legendPill, { backgroundColor: SHIFT_COLOR[t] }]} />
                    <Text style={styles.legendTxt}>{TURNI[t].label}</Text>
                  </View>
                ))}
                <View style={styles.legendItem}><View style={[styles.legendPill, { backgroundColor: colors.blue }]} /><Text style={styles.legendTxt}>Auto AI</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendPill, { backgroundColor: colors.danger2 }]} /><Text style={styles.legendTxt}>Deroga</Text></View>
              </View>
            </GlassCard>

            <Pressable onPress={doExportXLSX} style={[styles.exportBtn, { backgroundColor: ACCENT }]}>
              <Icon name="grid-outline" size={20} color="#000" />
              <Text style={styles.exportTxt}>Esporta Excel</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// banner AI glass (turni scoperti)
function PressableScaleRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard style={{ marginBottom: spacing.l }}>
        <View style={styles.aiRow}>
          <View style={[styles.aiIcon, { backgroundColor: ACCENT + '22' }]}><Icon name="sparkles" size={20} color={ACCENT} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>Assistente AI</Text>
            <Text style={styles.aiSub}>Genera il piano ottimale e copri i turni mancanti</Text>
          </View>
          <View style={[styles.aiBtn, { backgroundColor: ACCENT }]}><Text style={styles.aiBtnTxt}>Genera</Text></View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingTop: spacing.s, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  monthLabel: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  hBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
  hBtnOff: { opacity: 0.4 },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 120 },
  kpiRow: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.l },
  kpi: { flex: 1 },
  kpiInner: { padding: spacing.l },
  kpiIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s },
  kpiValue: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  kpiLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.m },
  coverLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  coverPct: { ...typography.cardTitle, fontWeight: '700' },
  coverTrack: { height: 10, borderRadius: 5, backgroundColor: colors.glassStrong, overflow: 'hidden' },
  coverFill: { height: 10, borderRadius: 5 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  aiIcon: { width: 44, height: 44, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  aiSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  aiBtn: { height: 40, paddingHorizontal: spacing.l, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  aiBtnTxt: { ...typography.secondary, fontWeight: '700', color: '#000' },
  chips: { gap: spacing.s, paddingVertical: 2, paddingBottom: spacing.m, paddingRight: spacing.s },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendPill: { width: 16, height: 10, borderRadius: 5 },
  legendTxt: { ...typography.caption, color: colors.textSecondary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 56, borderRadius: radius.button, marginTop: spacing.l },
  exportTxt: { ...typography.body, fontWeight: '700', color: '#000' },
});
