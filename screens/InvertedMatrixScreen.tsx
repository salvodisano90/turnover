// screens/InvertedMatrixScreen.tsx — Inverted Matrix: costruisci la matrice di un operatore,
// genera lo schema complementare (riusa familyConstraint.generateInverseShifts), modifica a mano,
// applica al piano (setCell → propaga a copertura/statistiche/report). Nessuna logica duplicata.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import GlassCard from '../components/GlassCard';
import PressableScale from '../components/PressableScale';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { generateInverseShifts } from '../services/familyConstraint';
import { exportInverseXLSX } from '../services/xlsx';
import { STD_ORARI } from '../utils/constants';
import { Turno } from '../types';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const CODES: Turno[] = ['M', 'P', 'N', 'R', 'F'];
const SHIFT_COLOR: Record<string, string> = { M: '#FFD60A', P: '#FF9F0A', N: '#0A84FF', R: '#48484A', F: '#30D158', S: '#8E8E93', G: '#BF5AF2' };
const cycle = (t: Turno): Turno => CODES[(CODES.indexOf(t) + 1) % CODES.length] || 'M';

export default function InvertedMatrixScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { ctx, staff, month, year, setCell, setMonth } = useStore();

  const dim = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const [opId, setOpId] = useState<string | null>(null);
  const [mode, setMode] = useState<'mese' | 'giorni'>('mese');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(dim);
  const fmtOra = (o?: { s: string; e: string }) => (o && o.s && o.e ? `${o.s}-${o.e}` : '');
  const [orari, setOrari] = useState({ M: fmtOra(STD_ORARI?.M) || '07:00-13:00', P: fmtOra(STD_ORARI?.P) || '13:00-20:00', N: fmtOra(STD_ORARI?.N) || '20:00-07:00' });
  const [source, setSource] = useState<Record<number, Turno>>({});
  const [result, setResult] = useState<Record<number, Turno> | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [busy, setBusy] = useState(false);

  const op = staff.find((s) => s.id === opId);
  // mese intero → 1..dim; per-giorni → intervallo scelto (clamp a dim, gestisce 28/29/30/31 e bisestili)
  const effFrom = mode === 'mese' ? 1 : Math.min(from, dim);
  const effTo = mode === 'mese' ? dim : Math.min(to, dim);
  const days = useMemo(() => { const a: number[] = []; for (let d = effFrom; d <= effTo; d++) a.push(d); return a; }, [effFrom, effTo]);
  const MM = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const changeMonth = (dir: number) => { setMonth(dir); setResult(null); setConfirmApply(false); };

  const doInverse = () => {
    const seq: Turno[] = days.map((d) => source[d] || 'R');
    const inv = generateInverseShifts(seq);
    const map: Record<number, Turno> = {};
    days.forEach((d, i) => { map[d] = inv[i]; });
    setResult(map);
  };

  const stats = useMemo(() => {
    const r = result || {};
    const c: Record<string, number> = { M: 0, P: 0, N: 0, R: 0, F: 0 };
    days.forEach((d) => { const t = r[d] || 'R'; c[t] = (c[t] || 0) + 1; });
    return c;
  }, [result, days]);

  const applyToPlan = () => {
    if (!op || !result) return;
    setBusy(true);
    const repId = op.reparti?.[0] || null;
    let n = 0;
    days.forEach((d) => {
      const t = result[d] || 'R';
      // la versione modificata manualmente (result) ha priorità: viene scritta tale e quale
      setCell(op.id, d, t, repId, t === 'R' || t === 'F' || t === 'S' ? null : t);
      n++;
    });
    setBusy(false);
    toast.show(`Pianificazione aggiornata: ${op.nome}, ${MM[month]} ${year} (${n} giorni)`, 'success');
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 700);
  };

  const exportExcel = async () => {
    if (!op || !result) return;
    try {
      await exportInverseXLSX({
        opName: op.nome, year, month, fromDay: effFrom, toDay: effTo, days,
        source: days.map((d) => source[d] || 'R'), inverse: days.map((d) => result[d] || 'R'),
      });
    } catch (e: any) { toast.show('Export non riuscito: ' + (e?.message || 'errore'), 'error'); }
  };

  const Cell = ({ d, val, onTap }: { d: number; val: Turno; onTap: () => void }) => (
    <Pressable onPress={onTap} style={[styles.cell, { borderColor: (SHIFT_COLOR[val] || colors.border) + '88', backgroundColor: val && val !== 'R' ? (SHIFT_COLOR[val] || colors.border) + '22' : 'transparent' }]}>
      <Text style={[styles.cellLetter, { color: SHIFT_COLOR[val] || colors.textDisabled }]}>{val === 'R' ? '·' : val}</Text>
      <Text style={styles.cellDay}>{d}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Inverse</Text><Text style={styles.subtitle}>Turni complementari di coppia</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* STEP 2 — operatore */}
        <Text style={styles.section}>1 · Operatore</Text>
        <View style={styles.chips}>
          {staff.map((s) => {
            const on = opId === s.id;
            return <Pressable key={s.id} onPress={() => setOpId(s.id)} style={[styles.chip, on && { backgroundColor: colors.blue + '22', borderColor: colors.blue }]}><Text style={[styles.chipTxt, on && { color: colors.blue }]} numberOfLines={1}>{s.nome}{s.qualifica ? ' · ' + s.qualifica : ''}</Text></Pressable>;
          })}
        </View>

        {/* STEP 3 — periodo: mese/anno + per mese o per giorni */}
        <Text style={[styles.section, { marginTop: spacing.l }]}>2 · Periodo</Text>
        <View style={styles.monthNav}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={10} style={styles.navBtn}><Icon name="chevron-back" size={22} color={colors.textPrimary} /></Pressable>
          <Text style={styles.monthLbl}>{MM[month]} {year}</Text>
          <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={styles.navBtn}><Icon name="chevron-forward" size={22} color={colors.textPrimary} /></Pressable>
        </View>
        <View style={styles.segRow2}>
          {([['mese', 'Mese intero'], ['giorni', 'Per giorni']] as const).map(([m, lbl]) => {
            const on = mode === m;
            return <Pressable key={m} onPress={() => { setMode(m); setResult(null); setConfirmApply(false); }} style={[styles.seg2, on && { backgroundColor: colors.blue }]}><Text style={[styles.seg2Txt, on && { color: '#fff' }]}>{lbl}</Text></Pressable>;
          })}
        </View>
        {mode === 'giorni' ? (
          <View style={{ flexDirection: 'row', gap: spacing.m, marginTop: spacing.m }}>
            <Stepper label="Dal giorno" value={Math.min(from, dim)} set={(n) => { setFrom(n); if (n > to) setTo(n); setResult(null); }} min={1} max={dim} />
            <Stepper label="Al giorno" value={Math.min(to, dim)} set={(n) => { setTo(n); setResult(null); }} min={Math.min(from, dim)} max={dim} />
          </View>
        ) : null}
        <Text style={styles.daysCount}>Giorni selezionati: {days.length}</Text>

        {/* STEP 4 — orari */}
        <Text style={[styles.section, { marginTop: spacing.l }]}>3 · Orari di riferimento</Text>
        <GlassCard>
          {(['M', 'P', 'N'] as const).map((k) => (
            <View key={k} style={styles.orarioRow}>
              <View style={[styles.orarioTag, { backgroundColor: (SHIFT_COLOR[k]) + '22' }]}><Text style={[styles.orarioTagTxt, { color: SHIFT_COLOR[k] }]}>{k}</Text></View>
              <TextInput value={orari[k]} onChangeText={(v) => setOrari((p) => ({ ...p, [k]: v }))} style={styles.orarioInput} placeholder="07:00-13:00" placeholderTextColor={colors.textDisabled} />
            </View>
          ))}
        </GlassCard>

        {/* STEP 5 — matrice sorgente */}
        <Text style={[styles.section, { marginTop: spacing.l }]}>4 · Matrice originale (tocca per cambiare)</Text>
        <View style={styles.grid}>
          {days.map((d) => <Cell key={d} d={d} val={source[d] || 'R'} onTap={() => { setSource((p) => ({ ...p, [d]: cycle(p[d] || 'R') })); setResult(null); }} />)}
        </View>

        {/* STEP 6 — INVERSE */}
        <Pressable onPress={doInverse} disabled={!opId} style={[styles.cta, { backgroundColor: colors.purple, opacity: opId ? 1 : 0.5 }]}>
          <Icon name="git-compare-outline" size={20} color="#fff" /><Text style={styles.ctaTxt}>INVERSE — genera schema complementare</Text>
        </Pressable>

        {/* STEP 7+8 — anteprima + modifica manuale */}
        {result ? (
          <>
            <Text style={[styles.section, { marginTop: spacing.l }]}>5 · Anteprima complementare (tocca per correggere)</Text>
            <View style={styles.grid}>
              {days.map((d) => <Cell key={d} d={d} val={result[d] || 'R'} onTap={() => setResult((p) => ({ ...(p || {}), [d]: cycle((p && p[d]) || 'R') }))} />)}
            </View>
            <GlassCard style={{ marginTop: spacing.m }}>
              <Text style={styles.cardTitle}>Statistiche</Text>
              <View style={styles.statRow}>
                {CODES.map((c) => <View key={c} style={styles.stat}><Text style={[styles.statVal, { color: SHIFT_COLOR[c] }]}>{stats[c] || 0}</Text><Text style={styles.statLbl}>{c}</Text></View>)}
              </View>
            </GlassCard>

            {/* STEP 6 — Export Excel */}
            <Pressable onPress={exportExcel} disabled={!op} style={[styles.cta, { backgroundColor: colors.glassStrong, borderWidth: 1, borderColor: colors.green + '66', marginTop: spacing.m, opacity: op ? 1 : 0.5 }]}>
              <Icon name="document-outline" size={20} color={colors.green} /><Text style={[styles.ctaTxt, { color: colors.green }]}>Esporta Excel</Text>
            </Pressable>

            {/* STEP 7 — Applica alla pianificazione (con conferma) */}
            {!confirmApply ? (
              <Pressable onPress={() => setConfirmApply(true)} disabled={!op} style={[styles.cta, { backgroundColor: colors.blue, marginTop: spacing.m, opacity: op ? 1 : 0.5 }]}>
                <Icon name="git-network-outline" size={20} color="#fff" /><Text style={styles.ctaTxt}>Applica alla pianificazione</Text>
              </Pressable>
            ) : (
              <GlassCard style={{ marginTop: spacing.m, borderColor: colors.blue + '66', borderWidth: 1 }}>
                <Text style={styles.cardTitle}>Confermi l'applicazione?</Text>
                <Text style={styles.note}>Sostituisci {days.length} giorni di {op?.nome} ({MM[month]} {year}). Aggiorna copertura, statistiche, simulatore e report. La versione mostrata (anche le modifiche manuali) verrà salvata e bloccata.</Text>
                <View style={{ flexDirection: 'row', gap: spacing.m, marginTop: spacing.m }}>
                  <Pressable onPress={() => setConfirmApply(false)} style={[styles.cta, { flex: 1, marginTop: 0, backgroundColor: colors.glassStrong }]}><Text style={[styles.ctaTxt, { color: colors.textPrimary }]}>Annulla</Text></Pressable>
                  <Pressable onPress={applyToPlan} disabled={busy} style={[styles.cta, { flex: 1, marginTop: 0, backgroundColor: colors.green }]}><Text style={[styles.ctaTxt, { color: '#000' }]}>{busy ? 'Applico…' : 'Conferma'}</Text></Pressable>
                </View>
              </GlassCard>
            )}
            <Text style={styles.note}>I giorni applicati restano bloccati e sopravvivono alla rigenerazione del piano.</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stepper({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) {
  return (
    <View style={[styles.stepper, { flex: 1 }]}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepCtrl}>
        <Pressable onPress={() => set(Math.max(min, value - 1))} style={styles.stepBtn}><Icon name="remove" size={18} color={colors.textPrimary} /></Pressable>
        <Text style={styles.stepVal}>{value}</Text>
        <Pressable onPress={() => set(Math.min(max, value + 1))} style={styles.stepBtn}><Icon name="add" size={18} color={colors.textPrimary} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  backBtn: { width: 36, height: 44, alignItems: 'flex-start', justifyContent: 'center', marginLeft: -6 },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  section: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.m, height: 48 },
  navBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  monthLbl: { ...typography.cardTitle, color: colors.textPrimary },
  segRow2: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
  seg2: { flex: 1, height: 40, borderRadius: radius.input, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  seg2Txt: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  daysCount: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.s },
  chip: { paddingVertical: spacing.s, paddingHorizontal: spacing.m, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
  chipTxt: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, maxWidth: 200 },
  stepper: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.m },
  stepLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.s },
  stepCtrl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center' },
  stepVal: { ...typography.cardTitle, color: colors.textPrimary },
  orarioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.s },
  orarioTag: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  orarioTagTxt: { ...typography.body, fontWeight: '800' },
  orarioInput: { flex: 1, height: 44, borderRadius: radius.input, backgroundColor: colors.glassStrong, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.l, color: colors.textPrimary, ...typography.body },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 42, height: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cellLetter: { ...typography.body, fontWeight: '800' },
  cellDay: { fontSize: 10, color: colors.textDisabled, marginTop: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 56, borderRadius: radius.button, marginTop: spacing.l },
  ctaTxt: { ...typography.body, fontWeight: '700', color: '#fff' },
  cardTitle: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.m },
  statRow: { flexDirection: 'row', gap: spacing.s },
  stat: { flex: 1, backgroundColor: colors.glass, borderRadius: radius.smallCard, padding: spacing.m, alignItems: 'center' },
  statVal: { ...typography.cardTitle, fontWeight: '800' },
  statLbl: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  note: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.m, lineHeight: 17 },
});
