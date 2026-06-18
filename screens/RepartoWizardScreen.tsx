// screens/RepartoWizardScreen.tsx — Reparto Wizard (redesign). Token /design, modal r28/pad24, 4 step.
// LOGICA INTATTA: addReparto/updateReparto, matrici (standard/custom/seasonal), validateSeasonalConfig,
// riposi (restMinutes), settori/codici, addMatriceCustom/removeMatriceCustom. Step e validazioni invariati.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { MATRICI, PRESETS, REPARTI_PREDEF, TURNI } from '../utils/constants';
import { cloneDeep, restMinutes, secCode, siglaForNome, uid } from '../utils/helpers';
import { OrariSet, Reparto, Turno, SeasonalConfig, Season } from '../types';
import { TimeStepperField } from '../components/TimeStepper';
import SheetHeader from '../components/SheetHeader';
import StepsDots from '../components/StepsDots';
import SelectChip from '../components/SelectChip';
import OptionCard from '../components/OptionCard';
import PressableScale from '../components/PressableScale';
import SeasonalEditor from '../components/SeasonalEditor';
import { validateSeasonalConfig } from '../services/matriceResolver';
import { showContextMenu } from '../utils/contextMenu';
import Stepper from '../components/Stepper';
import Icon from '../components/Icon';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

const TURNS: ('M' | 'P' | 'N')[] = ['M', 'P', 'N'];
// colori turno (token piatti) — sostituisce colors.shift {bg,fg} del tema legacy
const SHIFT: Record<string, string> = { M: colors.shiftMattina, P: colors.shiftPomeriggio, N: colors.shiftNotte };

export default function RepartoWizardScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { addReparto, updateReparto, reparti, matriciCustom, addMatriceCustom, removeMatriceCustom } = useStore();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = params.id ? reparti.find((r) => r.id === params.id) || null : null;

  const [step, setStep] = useState(1);
  const [nome, setNome] = useState(editing ? editing.nome : '');
  const [orari, setOrari] = useState<OrariSet>(() => cloneDeep(editing ? editing.orari : PRESETS.classico));
  const [matrice, setMatrice] = useState(editing ? editing.matrice : 'M62');
  const DEF_SEASONAL: SeasonalConfig = {
    primavera: { startMonth: 3, startDay: 21, endMonth: 6, endDay: 20, matrice: '' },
    estate: { startMonth: 6, startDay: 21, endMonth: 9, endDay: 22, matrice: '' },
    autunno: { startMonth: 9, startDay: 23, endMonth: 12, endDay: 20, matrice: '' },
    inverno: { startMonth: 12, startDay: 21, endMonth: 3, endDay: 20, matrice: '' },
  };
  const [seasonal, setSeasonal] = useState<SeasonalConfig>(editing && editing.seasonal ? editing.seasonal : DEF_SEASONAL);
  const [matMode, setMatMode] = useState<'standard' | 'custom' | 'seasonal'>(editing ? (((editing as any).matriceMode as any) || (editing.matrice === 'STAGIONALE' ? 'seasonal' : 'standard')) : 'standard');
  const [settori, setSettori] = useState<{ M: number; P: number; N: number }>(editing ? { ...editing.settori } : { M: 2, P: 2, N: 1 });

  const sigla = siglaForNome(nome || '');
  const setTime = (t: 'M' | 'P' | 'N', field: 's' | 'e', value: string) => setOrari((prev) => ({ ...prev, [t]: { ...prev[t], [field]: value } }));
  const stepSettore = (t: 'M' | 'P' | 'N', d: number) => setSettori((prev) => ({ ...prev, [t]: Math.min(Math.max(0, prev[t] + d), 6) }));

  const allMat = [...MATRICI, ...matriciCustom];
  const matLabel = (id?: string) => (allMat.find((m) => m.id === id)?.label) || '—';
  const matSeqLen = (id?: string) => (allMat.find((m) => m.id === id)?.seq.length) || 0;
  const seasonalValid = validateSeasonalConfig(seasonal, allMat.map((m) => m.id)).ok;
  const SEASON_KEYS: { key: Season; label: string }[] = [{ key: 'primavera', label: 'Primavera' }, { key: 'estate', label: 'Estate' }, { key: 'autunno', label: 'Autunno' }, { key: 'inverno', label: 'Inverno' }];

  const save = () => {
    const finalNome = nome.trim();
    if (!finalNome) { toast.show('Inserisci un nome per il reparto', 'warning'); setStep(1); return; }
    if (matMode === 'seasonal' && !seasonalValid) { toast.show('Configurazione stagionale non valida: correggi le stagioni', 'warning'); setStep(3); return; }
    const rep: Reparto = {
      id: editing ? editing.id : uid('rep'), nome: finalNome, sigla: siglaForNome(finalNome), orari: cloneDeep(orari),
      matrice: matMode === 'seasonal' ? 'STAGIONALE' : matrice, matriceMode: matMode,
      seasonal: matMode === 'seasonal' ? seasonal : (editing ? editing.seasonal : undefined), settori: { ...settori },
    };
    if (editing) { updateReparto(rep); toast.show(`Reparto ${finalNome} aggiornato. Piano ricalcolato.`, 'success'); }
    else { addReparto(rep); toast.show(`Reparto ${finalNome} aggiunto. Piano ricalcolato.`, 'success'); }
    router.back();
  };

  const pm = restMinutes('P', 'M', orari, orari);
  const nm = restMinutes('N', 'M', orari, orari);
  const next = () => (step < 4 ? setStep(step + 1) : save());

  return (
    <View style={[styles.container, { backgroundColor: colors.bgEco, paddingBottom: insets.bottom }]}>
      <SheetHeader title={editing ? 'Modifica Reparto' : 'Nuovo Reparto'} subtitle={`Step ${step} di 4`} onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <StepsDots total={4} current={step} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 1 ? (<>
          <Text style={styles.label}>Nome del reparto</Text>
          <TextInput style={styles.input} placeholder="Es. Cardiochirurgia" placeholderTextColor={colors.textDisabled} value={nome} onChangeText={setNome} />
          <Text style={styles.hint}>Reparti comuni (tocca per selezionare):</Text>
          <View style={styles.chips}>{REPARTI_PREDEF.map((r) => <SelectChip key={r[1]} label={r[0]} selected={nome === r[0]} onPress={() => setNome(r[0])} />)}</View>
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.blue }]}>Codice settori: {sigla} — es. M{sigla}1, P{sigla}2, N{sigla}1</Text></View>
        </>) : null}

        {step === 2 ? (<>
          <View style={styles.chips}>
            <SelectChip label="Classico 6/14/22" onPress={() => setOrari(cloneDeep(PRESETS.classico))} />
            <SelectChip label="PS 7/13/19" onPress={() => setOrari(cloneDeep(PRESETS.ps))} />
            <SelectChip label="12h 7/19" onPress={() => setOrari(cloneDeep(PRESETS.h12))} />
          </View>
          {TURNS.map((t) => (
            <View key={t} style={styles.timeBlock}>
              <Text style={[styles.timeLabel, { color: SHIFT[t] }]}>{TURNI[t].label}</Text>
              <View style={styles.timeFields}><TimeStepperField value={orari[t].s} onChange={(v) => setTime(t, 's', v)} /><TimeStepperField value={orari[t].e} onChange={(v) => setTime(t, 'e', v)} /></View>
            </View>
          ))}
          <View style={[styles.restCheck, { backgroundColor: pm >= 660 ? 'rgba(88,204,2,0.15)' : 'rgba(255,107,107,0.15)' }]}>
            <Text style={[styles.restTxt, { color: pm >= 660 ? colors.green : colors.danger2 }]}>{pm >= 660 ? '✓' : '⚠'} Pomeriggio→Mattina: {orari.P.e}→{orari.M.s}{pm >= 660 ? ' (≥11h)' : ` — riposo <11h (${Math.floor(pm / 60)}h${pm % 60}m)`}</Text>
          </View>
          <View style={[styles.restCheck, { backgroundColor: nm >= 660 ? 'rgba(88,204,2,0.15)' : 'rgba(255,107,107,0.15)' }]}>
            <Text style={[styles.restTxt, { color: nm >= 660 ? colors.green : colors.danger2 }]}>{nm >= 660 ? '✓' : '⚠'} Notte→Mattina: {orari.N.e}→{orari.M.s}{nm >= 660 ? ' (≥11h)' : ` — riposo <11h (${Math.floor(nm / 60)}h${nm % 60}m)`}</Text>
          </View>
        </>) : null}

        {step === 3 ? (<>
          <View style={styles.modeRow}>
            {(([['standard', 'Standard'], ['custom', 'Personalizzata'], ['seasonal', 'Stagionale']]) as Array<['standard' | 'custom' | 'seasonal', string]>).map(([mv, ml]) => (
              <PressableScale key={mv} onPress={() => setMatMode(mv)} style={{ flex: 1 }}>
                <View style={[styles.modeBtn, { backgroundColor: matMode === mv ? 'rgba(88,204,255,0.15)' : colors.cardEco, borderColor: matMode === mv ? colors.blue : colors.borderEco }]}><Text style={[styles.modeTxt, { color: matMode === mv ? colors.blue : colors.textSecondary }]}>{ml}</Text></View>
              </PressableScale>
            ))}
          </View>

          {matMode === 'standard' ? (<>
            <OptionCard selected={matrice === ''} onPress={() => setMatrice('')}>
              <View style={styles.optRow}><Text style={styles.optTitle}>Eredita dal mese</Text><Text style={styles.optBadge}>gerarchia</Text></View>
              <Text style={styles.infoTxt2}>Nessuna matrice di reparto: gli operatori senza matrice usano quella mensile.</Text>
            </OptionCard>
            {MATRICI.map((m) => (
              <OptionCard key={m.id} selected={matrice === m.id} onPress={() => setMatrice(m.id)}>
                <View style={styles.optRow}><Text style={styles.optTitle}>{m.label}</Text><Text style={styles.optBadge}>{m.notti === 0 ? 'no notti' : `${m.notti}N/ciclo`}</Text></View>
                <View style={styles.seq}>{m.seq.map((tt, i) => (<View key={i} style={[styles.seqBlk, { backgroundColor: SHIFT[tt] + '33' }]}><Text style={[styles.seqTxt, { color: SHIFT[tt] }]}>{tt}</Text></View>))}</View>
                {m.descrizione ? <Text style={[styles.infoTxt2, { marginTop: 6 }]}>{m.descrizione}</Text> : null}
              </OptionCard>
            ))}
          </>) : null}

          {matMode === 'custom' ? (<>
            <Pressable onPress={() => router.push('/matrice-editor')} style={[styles.createBtn, { backgroundColor: colors.blue }]}><Icon name="add-circle-outline" size={18} color="#08141E" /><Text style={styles.createTxt}>Crea nuova matrice</Text></Pressable>
            {matriciCustom.length === 0 ? <Text style={styles.infoTxt2}>Nessuna matrice personalizzata: creane una.</Text> : null}
            {matriciCustom.map((m) => (
              <OptionCard key={m.id} selected={matrice === m.id} onPress={() => setMatrice(m.id)}>
                <View style={styles.optRow}><Text style={styles.optTitle}>{m.label}</Text><Text style={styles.optBadge}>{m.seq.length}g</Text></View>
                <View style={styles.seq}>{m.seq.map((tt, i) => (<View key={i} style={[styles.seqBlk, { backgroundColor: SHIFT[tt] + '33' }]}><Text style={[styles.seqTxt, { color: SHIFT[tt] }]}>{tt}</Text></View>))}</View>
                <View style={styles.custActions}>
                  <PressableScale onPress={() => showContextMenu(m.label, [
                    { label: 'Modifica', onPress: () => router.push({ pathname: '/matrice-editor', params: { id: m.id } }) },
                    { label: 'Duplica', onPress: () => addMatriceCustom({ ...m, id: `CUST_${Date.now()}`, label: `${m.label} Copia` }) },
                    { label: 'Elimina', destructive: true, onPress: () => { removeMatriceCustom(m.id); if (matrice === m.id) setMatrice(''); } },
                  ])}><Text style={styles.custAct}>•••</Text></PressableScale>
                </View>
              </OptionCard>
            ))}
          </>) : null}

          {matMode === 'seasonal' ? <SeasonalEditor cfg={seasonal} onChange={setSeasonal} /> : null}
        </>) : null}

        {step === 4 ? (<>
          <View style={styles.summaryCard}>
            <Text style={styles.sumLbl}>REPARTO</Text>
            <Text style={styles.sumVal}>{nome || '—'}</Text>
            <Text style={[styles.sumLbl, { marginTop: spacing.m }]}>MODALITÀ MATRICE</Text>
            <Text style={styles.sumVal}>{matMode === 'standard' ? 'Standard' : matMode === 'custom' ? 'Personalizzata' : 'Stagionale'}</Text>
            {matMode !== 'seasonal' ? (<>
              <Text style={[styles.sumLbl, { marginTop: spacing.m }]}>MATRICE</Text>
              <Text style={styles.sumVal}>{matrice ? matLabel(matrice) : 'Eredita dal mese'}</Text>
              {matMode === 'custom' && matrice ? <Text style={styles.infoTxt2}>Durata ciclo: {matSeqLen(matrice)} giorni</Text> : null}
            </>) : (
              <View style={{ marginTop: spacing.s }}>
                {SEASON_KEYS.map((sk) => (<View key={sk.key} style={styles.sumSeasonRow}><Text style={styles.infoTxt3}>{sk.label}</Text><Text style={[styles.infoTxt2, { fontWeight: '700' }]}>{matLabel(seasonal[sk.key] && seasonal[sk.key].matrice)}</Text></View>))}
                {!seasonalValid ? <Text style={[styles.infoTxt2, { color: colors.danger2, marginTop: 6 }]}>⚠ Configurazione stagionale non valida — correggi nello step Matrice.</Text> : null}
              </View>
            )}
          </View>
          {TURNS.map((t) => (<View key={t} style={styles.settRow}><Text style={[styles.settLabel, { color: SHIFT[t] }]}>Slot {TURNI[t].label}</Text><Stepper value={settori[t]} onChange={(d) => stepSettore(t, d)} /></View>))}
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,255,0.15)', marginTop: 6 }]}><Text style={[styles.infoTxt, { color: colors.blue }]}>Codici settori generati:</Text></View>
          <View style={styles.tags}>
            {TURNS.flatMap((t) => Array.from({ length: settori[t] }).map((_, i) => secCode(t, sigla, i + 1))).map((code) => (<Text key={code} style={[styles.tag, { color: colors.blue, backgroundColor: 'rgba(88,204,255,0.15)' }]}>{code}</Text>))}
            {TURNS.every((t) => settori[t] === 0) ? <Text style={{ color: colors.textDisabled, fontSize: 12 }}>Nessun settore configurato</Text> : null}
          </View>
        </>) : null}
      </ScrollView>

      <View style={styles.foot}>
        <Pressable onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backBtn}><Text style={styles.backTxt}>{step > 1 ? 'Indietro' : 'Annulla'}</Text></Pressable>
        <Pressable onPress={next} style={[styles.nextBtn, { backgroundColor: colors.blue }]}><Text style={styles.nextTxt}>{step < 4 ? 'Avanti' : 'Salva Reparto'}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: spacing.l },
  label: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.s },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.m, marginBottom: spacing.s },
  input: { height: 48, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, borderRadius: radius.input, paddingHorizontal: spacing.m, fontSize: 16, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  info: { borderRadius: radius.smallCard, padding: spacing.m, marginTop: spacing.m },
  infoTxt: { ...typography.caption, fontWeight: '600' },
  infoTxt2: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  infoTxt3: { ...typography.caption, color: colors.textDisabled, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.l },
  modeBtn: { minHeight: 48, borderRadius: radius.smallCard, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  modeTxt: { ...typography.caption, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 48, borderRadius: radius.button, marginBottom: spacing.m },
  createTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
  custActions: { flexDirection: 'row', gap: spacing.l, marginTop: spacing.m },
  custAct: { ...typography.caption, fontWeight: '800', color: colors.textSecondary },
  summaryCard: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, padding: spacing.l, marginBottom: spacing.l },
  sumLbl: { ...typography.caption, fontWeight: '800', letterSpacing: 0.5, color: colors.textDisabled },
  sumVal: { ...typography.cardTitle, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  sumSeasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.m, marginBottom: 4 },
  timeBlock: { borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, borderRadius: radius.card, paddingVertical: spacing.m, paddingHorizontal: spacing.m, marginBottom: spacing.m, marginTop: spacing.m },
  timeLabel: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  timeFields: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  restCheck: { borderRadius: radius.smallCard, padding: spacing.m, marginTop: spacing.s },
  restTxt: { ...typography.caption, fontWeight: '600' },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optTitle: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary },
  optBadge: { ...typography.caption, fontWeight: '700', color: colors.textSecondary, backgroundColor: colors.bgEco, paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  seq: { flexDirection: 'row', gap: 3, marginTop: spacing.s, flexWrap: 'wrap' },
  seqBlk: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  seqTxt: { fontSize: 11, fontWeight: '700' },
  settRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.m },
  settLabel: { ...typography.secondary, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.m },
  tag: { ...typography.caption, fontWeight: '700', paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' },
  foot: { flexDirection: 'row', gap: spacing.m, padding: spacing.m, borderTopWidth: 1, borderTopColor: colors.borderEco },
  backBtn: { flex: 1, height: 52, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderEco, alignItems: 'center', justifyContent: 'center' },
  backTxt: { ...typography.body, fontWeight: '700', color: colors.textSecondary },
  nextBtn: { flex: 1.4, height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  nextTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
});
