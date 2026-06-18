// screens/DecisionCenterScreen.tsx — Centro Decisionale: simula una modifica PRIMA di applicarla.
// Collegato a services/decisionCenter.simulateDecision (testato). La simulazione non tocca il piano reale.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import GlassCard from '../components/GlassCard';
import PressableScale from '../components/PressableScale';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { simulateDecision, DecisionScenarioType, DecisionResult } from '../services/decisionCenter';
import { familyImpact, expandMatrix, operatorShiftsFromPiano } from '../services/familyConstraint';
import { optimizeFamily, FamilyOptResult } from '../services/familyOptimizer';
import { Turno } from '../types';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const SCENARIOS: { id: DecisionScenarioType; label: string }[] = [
  { id: 'ferie', label: 'Ferie' },
  { id: 'assenza', label: 'Assenza' },
  { id: 'riposo', label: 'Riposo' },
  { id: 'ferieMultiple', label: 'Ferie multiple' },
];

const VERDICT_COLOR: Record<string, string> = { green: colors.green, yellow: colors.warning, red: colors.danger2 };

export default function DecisionCenterScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { ctx, currentPiano, staff, addFerie } = useStore();

  const [tipo, setTipo] = useState<DecisionScenarioType>('ferie');
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [suggestion, setSuggestion] = useState<FamilyOptResult | null>(null);

  const dim = useMemo(() => new Date(ctx.year, ctx.month + 1, 0).getDate(), [ctx.year, ctx.month]);
  const multi = tipo === 'ferieMultiple';
  const nomeOf = (id: string) => staff.find((s) => s.id === id)?.nome || id;

  // Impatto familiare: se l'operatore selezionato ha un vincolo attivo, confronta prima/dopo la modifica.
  const famImpact = useMemo(() => {
    if (!result || !selected[0]) return null;
    const op: any = staff.find((s) => s.id === selected[0]);
    if (!op?.family?.enabled || !op.family.inverseMatrix?.length) return null;
    const before = operatorShiftsFromPiano(currentPiano || {}, op.id, dim);
    const after = before.slice();
    if (tipo === 'ferie' || tipo === 'assenza' || tipo === 'ferieMultiple') {
      for (let d = from; d <= to; d++) after[d - 1] = 'F' as Turno;
    } else if (tipo === 'riposo') { after[from - 1] = 'R' as Turno; }
    const partner = expandMatrix(op.family.inverseMatrix, dim, op.offset || 0);
    return familyImpact(before, after, partner);
  }, [result, selected, staff, currentPiano, dim, tipo, from, to]);

  const toggleOp = (id: string) => {
    if (multi) setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    else setSelected([id]);
  };

  const run = () => {
    if (!selected.length) { toast.show('Seleziona almeno un operatore', 'warning'); return; }
    try {
      const res = simulateDecision(ctx, currentPiano || {}, { tipo, infIds: selected, dayFrom: from, dayTo: to, day: from });
      setResult(res);
      // Suggerimento Automatico (on-demand): ottimizzazione famiglia che non riduce la copertura
      try {
        const opt = optimizeFamily(ctx, currentPiano || {});
        setSuggestion(opt.operatoriOttimizzati > 0 ? opt : null);
      } catch { setSuggestion(null); }
    } catch { toast.show('Simulazione non riuscita', 'error'); }
  };

  const apply = () => {
    if (!result || !selected.length) return;
    if (tipo === 'ferie' || tipo === 'assenza' || tipo === 'ferieMultiple') {
      selected.forEach((id) => addFerie({ id: 'f_' + id + '_' + Date.now(), infId: id, dal: from, al: to, tipo: tipo === 'assenza' ? 'malattia' : 'ferie', motivo: '' } as any));
      toast.show('Modifica applicata al piano', 'success');
      setResult(null); setSelected([]);
    } else {
      toast.show('Applicazione disponibile per ferie/assenze', 'info');
    }
  };

  const Stepper = ({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) => (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepCtrl}>
        <Pressable onPress={() => set(Math.max(min, value - 1))} style={styles.stepBtn}><Icon name="remove" size={18} color={colors.textPrimary} /></Pressable>
        <Text style={styles.stepVal}>{value}</Text>
        <Pressable onPress={() => set(Math.min(max, value + 1))} style={styles.stepBtn}><Icon name="add" size={18} color={colors.textPrimary} /></Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Centro Decisionale</Text><Text style={styles.subtitle}>Simula prima di applicare</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Scenario</Text>
        <View style={styles.segRow}>
          {SCENARIOS.map((s) => {
            const on = tipo === s.id;
            return <Pressable key={s.id} onPress={() => { setTipo(s.id); setSelected([]); setResult(null); }} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{s.label}</Text></Pressable>;
          })}
        </View>

        <Text style={[styles.section, { marginTop: spacing.l }]}>{multi ? 'Operatori' : 'Operatore'}</Text>
        <View style={styles.chips}>
          {staff.map((s) => {
            const on = selected.includes(s.id);
            return <Pressable key={s.id} onPress={() => toggleOp(s.id)} style={[styles.chip, on && { backgroundColor: colors.blue + '22', borderColor: colors.blue }]}><Text style={[styles.chipTxt, on && { color: colors.blue }]} numberOfLines={1}>{s.nome}</Text></Pressable>;
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.m, marginTop: spacing.l }}>
          <View style={{ flex: 1 }}><Stepper label="Dal giorno" value={from} set={(n) => { setFrom(n); if (n > to) setTo(n); }} min={1} max={dim} /></View>
          <View style={{ flex: 1 }}><Stepper label="Al giorno" value={to} set={setTo} min={from} max={dim} /></View>
        </View>

        <Pressable onPress={run} style={[styles.cta, { backgroundColor: colors.blue }]}>
          <Icon name="flash-outline" size={20} color="#fff" /><Text style={styles.ctaTxt}>SIMULA</Text>
        </Pressable>

        {result ? (
          <View style={{ marginTop: spacing.l }}>
            {/* VERDETTO */}
            <View style={[styles.verdict, { backgroundColor: VERDICT_COLOR[result.verdetto.level] + '22', borderColor: VERDICT_COLOR[result.verdetto.level] }]}>
              <Icon name={result.verdetto.level === 'green' ? 'checkmark-circle' : result.verdetto.level === 'yellow' ? 'alert-circle' : 'close-circle'} size={28} color={VERDICT_COLOR[result.verdetto.level]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.verdictTitle, { color: VERDICT_COLOR[result.verdetto.level] }]}>{result.verdetto.label}</Text>
                {result.verdetto.reasons.map((r, i) => <Text key={i} style={styles.verdictReason} numberOfLines={3}>{r}</Text>)}
              </View>
            </View>

            {/* COPERTURA */}
            <GlassCard style={{ marginTop: spacing.m }}>
              <Text style={styles.cardTitle}>Copertura</Text>
              <View style={styles.kpiRow}>
                <Kpi label="Attuale" value={result.coperturaAttuale + '%'} />
                <Kpi label="Simulata" value={result.coperturaPrevista + '%'} tone={VERDICT_COLOR[result.verdetto.level]} />
                <Kpi label="Differenza" value={(result.differenza >= 0 ? '+' : '') + result.differenza} tone={result.differenza < 0 ? colors.danger2 : colors.green} />
              </View>
              <View style={styles.kpiRow}>
                <Kpi label="Turni scoperti" value={String(result.turniScoperti)} tone={result.turniScoperti ? colors.danger2 : colors.textPrimary} />
                <Kpi label="Giorni critici" value={String(result.giorniCritici)} />
                <Kpi label="Sicurezza" value={result.sicurezzaPrima + '→' + result.sicurezzaDopo} />
              </View>
            </GlassCard>

            {/* SOSTITUTI */}
            {result.sostituti.length ? (
              <GlassCard style={{ marginTop: spacing.m }}>
                <Text style={styles.cardTitle}>Migliori sostituti</Text>
                {result.sostituti.map((s) => (
                  <View key={s.infId} style={styles.subRow}>
                    <View style={[styles.subRank, { backgroundColor: colors.blue + '22' }]}><Text style={[styles.subRankTxt, { color: colors.blue }]}>{s.rank}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subName} numberOfLines={1}>{s.nome} · {s.compatibilita}%</Text>
                      <Text style={styles.subMot} numberOfLines={3}>{s.motivazione}</Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            ) : null}

            {/* SUGGERIMENTO AUTOMATICO (FamilyOptimizer) */}
            {suggestion && suggestion.operatoriOttimizzati > 0 ? (() => {
              const best = suggestion.items.filter((i) => i.variazione > 0).sort((a, b) => b.variazione - a.variazione)[0];
              if (!best) return null;
              return (
                <View style={[styles.verdict, { backgroundColor: colors.purple + '18', borderColor: colors.purple, marginTop: spacing.m }]}>
                  <Icon name="bulb-outline" size={24} color={colors.purple} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.verdictTitle, { color: colors.purple, fontSize: 15 }]}>Suggerimento automatico</Text>
                    <Text style={styles.verdictReason} numberOfLines={4}>Ottimizzando gli scambi locali, la copertura familiare di {best.nome} passa da {best.scoreIniziale}% a {best.scoreFinale}% senza ridurre la copertura del reparto ({suggestion.coperturaPrima}% → {suggestion.coperturaDopo}%, {suggestion.swaps} scambi).</Text>
                  </View>
                </View>
              );
            })() : null}

            {/* IMPATTO FAMILIARE */}
            {famImpact ? (
              <GlassCard style={{ marginTop: spacing.m }}>
                <Text style={styles.cardTitle}>Impatto familiare</Text>
                <View style={styles.kpiRow}>
                  <Kpi label="Prima" value={famImpact.prima + '%'} />
                  <Kpi label="Dopo" value={famImpact.dopo + '%'} tone={famImpact.dopo >= famImpact.prima ? colors.green : colors.danger2} />
                  <Kpi label="Variazione" value={(famImpact.delta >= 0 ? '+' : '') + famImpact.delta} tone={famImpact.delta >= 0 ? colors.green : colors.danger2} />
                </View>
                <Text style={styles.note}>{famImpact.delta > 0 ? `Questa modifica migliora la copertura familiare del ${famImpact.delta}%.` : famImpact.delta < 0 ? `Attenzione: questa modifica riduce la copertura familiare di ${Math.abs(famImpact.delta)}%.` : 'Nessun impatto sulla copertura familiare.'}</Text>
              </GlassCard>
            ) : null}

            {/* APPLICA */}
            <Pressable onPress={apply} style={[styles.cta, { backgroundColor: colors.green, marginTop: spacing.m }]}>
              <Icon name="checkmark-done-outline" size={20} color="#000" /><Text style={[styles.ctaTxt, { color: '#000' }]}>APPLICA al piano</Text>
            </Pressable>
            <Text style={styles.note}>La simulazione non modifica il piano. Premi APPLICA solo se sei soddisfatto del risultato.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiVal, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
      <Text style={styles.kpiLbl} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  section: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.m },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  seg: { flexGrow: 1, minWidth: 70, paddingVertical: spacing.s, paddingHorizontal: spacing.m, borderRadius: radius.pill, backgroundColor: colors.glassStrong, alignItems: 'center' },
  segTxt: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  chip: { paddingVertical: spacing.s, paddingHorizontal: spacing.m, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
  chipTxt: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, maxWidth: 160 },
  stepper: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.m },
  stepLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.s },
  stepCtrl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center' },
  stepVal: { ...typography.cardTitle, color: colors.textPrimary },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 56, borderRadius: radius.button, marginTop: spacing.l },
  ctaTxt: { ...typography.body, fontWeight: '700', color: '#fff' },
  verdict: { flexDirection: 'row', gap: spacing.m, padding: spacing.l, borderRadius: radius.card, borderWidth: 1, alignItems: 'flex-start' },
  verdictTitle: { ...typography.cardTitle, fontWeight: '800' },
  verdictReason: { ...typography.caption, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  cardTitle: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.m },
  kpiRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.s },
  kpi: { flex: 1, backgroundColor: colors.glass, borderRadius: radius.smallCard, padding: spacing.m },
  kpiVal: { ...typography.cardTitle, fontWeight: '700', color: colors.textPrimary },
  kpiLbl: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  subRow: { flexDirection: 'row', gap: spacing.m, alignItems: 'flex-start', paddingVertical: spacing.s, borderTopWidth: 1, borderTopColor: colors.divider },
  subRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subRankTxt: { ...typography.body, fontWeight: '800' },
  subName: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  subMot: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  note: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.m, lineHeight: 17 },
});
