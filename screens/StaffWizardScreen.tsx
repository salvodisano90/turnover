// screens/StaffWizardScreen.tsx — Staff Wizard (redesign). Token /design, 7 step.
// LOGICA INTATTA: addStaff/updateStaff, suggestMatrice, contratto/notti/reparti/matrice/offset/esenzioni/preferenze,
// competenze, anteprima ciclo offset (lunghezza reale seq). Step e validazioni invariati.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { CONTRATTI, MATRICI, QUALIFICHE, COMPETENZE_AREE, LIVELLI } from '../utils/constants';
import { avatarColor, getCtr, getMx, getRep, secCode, uid } from '../utils/helpers';
import { Preferenze, Staff, Turno, TurnoLavoro, OperatorClass, Competenza } from '../types';
import SheetHeader from '../components/SheetHeader';
import StepsDots from '../components/StepsDots';
import SelectChip from '../components/SelectChip';
import OptionCard from '../components/OptionCard';
import Stepper from '../components/Stepper';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

// colori turno (token piatti) — sostituisce colors.shift {bg,fg} del tema legacy
const SHIFT: Record<string, string> = { M: colors.shiftMattina, P: colors.shiftPomeriggio, N: colors.shiftNotte, R: colors.textDisabled, S: colors.shiftNotte, F: colors.danger2 };
const shc = (t: string) => SHIFT[t] || colors.textDisabled;

function suggestMatrice(contratto: string, notti: number): string {
  if (contratto === 'FT4GG') return 'M4GG';
  if (notti === 0) return 'M62';
  if (notti === 1) return 'MN1';
  return 'MN2';
}

export default function StaffWizardScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { reparti, staff, addStaff, updateStaff, matriciCustom } = useStore();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = params.id ? staff.find((m) => m.id === params.id) || null : null;

  const [step, setStep] = useState(1);
  const [nome, setNome] = useState(editing ? editing.nome : '');
  const [qualifica, setQualifica] = useState(editing ? editing.qualifica : QUALIFICHE[0]);
  const [contratto, setContratto] = useState(editing ? editing.contratto : 'FT36');
  const [notti, setNotti] = useState<0 | 1 | 2>(editing ? editing.nottiPerCiclo : 0);
  const [repartiSel, setRepartiSel] = useState<string[]>(editing && editing.reparti ? editing.reparti.slice() : []);
  const [matrice, setMatrice] = useState(editing ? editing.matrice : 'M62');
  const [offset, setOffset] = useState(editing ? editing.offset : 0);
  const [esT, setEsT] = useState<TurnoLavoro[]>(editing && editing.esenzioniTurni ? editing.esenzioniTurni.slice() : []);
  const [esS, setEsS] = useState<string[]>(editing && editing.esenzioniSettori ? editing.esenzioniSettori.slice() : []);
  const [esWe, setEsWe] = useState<boolean>(editing ? !!editing.esenteWeekend : false);
  const [esFe, setEsFe] = useState<boolean>(editing ? !!editing.esenteFestivi : false);
  const ip0 = (editing && editing.preferenze) || {};
  const [soloM, setSoloM] = useState<boolean>(!!ip0.soloMattina);
  const [soloP, setSoloP] = useState<boolean>(!!ip0.soloPomeriggio);
  const [prefM, setPrefM] = useState<boolean>(!!ip0.prefMattina);
  const [prefP, setPrefP] = useState<boolean>(!!ip0.prefPomeriggio);
  const [prefWeLib, setPrefWeLib] = useState<boolean>(!!ip0.prefWeekendLibero);
  const [prefRep, setPrefRep] = useState<string>(ip0.prefReparto || '');
  const [prefSet, setPrefSet] = useState<string>(ip0.prefSettore || '');
  const [anni, setAnni] = useState<number>(editing && typeof editing.anniEsperienza === 'number' ? editing.anniEsperienza : 0);
  const [livello, setLivello] = useState<OperatorClass | ''>(editing && editing.livello ? editing.livello : '');
  const [comp, setComp] = useState<string[]>(editing && editing.competenze ? editing.competenze.map((c) => c.area) : []);

  const ctr = getCtr(contratto);
  const pickContratto = (id: string) => { setContratto(id); const c = getCtr(id); const newNotti = (notti > c.nottiMax ? c.nottiMax : notti) as 0 | 1 | 2; setNotti(newNotti); setMatrice(suggestMatrice(id, newNotti)); };
  const pickNotti = (n: 0 | 1 | 2) => { setNotti(n); setMatrice(suggestMatrice(contratto, n)); };
  const toggleReparto = (id: string) => setRepartiSel((prev) => (prev.indexOf(id) >= 0 ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleEsT = (t: TurnoLavoro) => setEsT((prev) => (prev.indexOf(t) >= 0 ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleEsS = (c: string) => setEsS((prev) => (prev.indexOf(c) >= 0 ? prev.filter((x) => x !== c) : [...prev, c]));

  const compatMatrici = useMemo(() => [...MATRICI, ...matriciCustom], [matriciCustom]);
  const settoriCodes = useMemo(() => {
    const codes: string[] = [];
    repartiSel.forEach((rid) => { const r = getRep(reparti, rid); if (!r) return; (['M', 'P', 'N'] as ('M' | 'P' | 'N')[]).forEach((t) => { for (let i = 1; i <= r.settori[t]; i++) codes.push(secCode(t, r.sigla, i)); }); });
    return codes;
  }, [repartiSel, reparti]);

  const next = () => { if (step === 1 && !nome.trim()) { toast.show('Inserisci il nome', 'warning'); return; } setStep((s) => Math.min(7, s + 1)); };

  const save = () => {
    if (!nome.trim()) { toast.show('Inserisci il nome del membro', 'warning'); setStep(1); return; }
    const member: Staff = {
      id: editing ? editing.id : uid('inf'), nome: nome.trim(), qualifica, contratto, nottiPerCiclo: notti, matrice, offset,
      reparti: repartiSel.slice(), esenzioniTurni: esT.slice(), esenzioniSettori: esS.slice(),
      esenteWeekend: esWe || undefined, esenteFestivi: esFe || undefined,
      preferenze: (() => { const pf: Preferenze = {}; if (soloM) pf.soloMattina = true; if (soloP) pf.soloPomeriggio = true; if (prefM) pf.prefMattina = true; if (prefP) pf.prefPomeriggio = true; if (prefWeLib) pf.prefWeekendLibero = true; if (prefRep) pf.prefReparto = prefRep; if (prefSet) pf.prefSettore = prefSet; return Object.keys(pf).length ? pf : undefined; })(),
      anniEsperienza: anni > 0 ? anni : undefined, livello: livello || undefined,
      competenze: (() => { const prev = (editing && editing.competenze) || []; const merged: Competenza[] = comp.map((area) => prev.find((c) => c.area === area) || { area, livello: 'base' }); return merged.length ? merged : undefined; })(),
      oreSettimanali: editing ? editing.oreSettimanali : undefined,
    };
    if (editing) { updateStaff(member); toast.show(`${member.nome} aggiornato. Piano ricalcolato.`, 'success'); }
    else { addStaff(member); toast.show(`${member.nome} aggiunto. Piano aggiornato automaticamente.`, 'success'); }
    router.back();
  };

  const mxPreview = getMx(matrice) || MATRICI[0];
  const sumRow = (k: string, v: string) => (<View style={styles.sumRow} key={k}><Text style={styles.sumK}>{k}</Text><Text style={styles.sumV}>{v}</Text></View>);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgEco, paddingBottom: insets.bottom }]}>
      <SheetHeader title={editing ? 'Modifica Membro' : 'Nuovo Membro Staff'} subtitle={`Step ${step} di 7`} onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <StepsDots total={7} current={step} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 1 ? (<>
          <Text style={styles.label}>Nome completo</Text>
          <TextInput style={styles.input} placeholder="Nome e cognome" placeholderTextColor={colors.textDisabled} value={nome} onChangeText={setNome} autoFocus />
          <Text style={[styles.label, { marginTop: spacing.m }]}>Qualifica</Text>
          <View style={styles.chips}>{QUALIFICHE.map((q) => <SelectChip key={q} label={q} selected={qualifica === q} onPress={() => setQualifica(q)} />)}</View>
          <Text style={[styles.label, { marginTop: spacing.l }]}>Anni di esperienza</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}><Stepper value={anni} onChange={(d) => setAnni(Math.min(Math.max(0, anni + d), 45))} /><Text style={{ color: colors.textSecondary, fontSize: 13 }}>{anni} {anni === 1 ? 'anno' : 'anni'}</Text></View>
          <Text style={[styles.label, { marginTop: spacing.l }]}>Livello professionale</Text>
          <Text style={styles.help}>Opzionale: se impostato, ha priorità sulla classificazione automatica. Non blocca la generazione.</Text>
          <View style={styles.chips}><SelectChip label="Automatico" selected={!livello} onPress={() => setLivello('')} />{LIVELLI.map((l) => <SelectChip key={l} label={l} selected={livello === l} onPress={() => setLivello(l)} />)}</View>
          <Text style={[styles.label, { marginTop: spacing.l }]}>Competenze (opzionali)</Text>
          <Text style={styles.help}>Informative: non vincolano la generazione del piano.</Text>
          <View style={styles.chips}>{COMPETENZE_AREE.map((c) => <SelectChip key={c} label={c} selected={comp.indexOf(c) >= 0} onPress={() => setComp((arr) => arr.indexOf(c) >= 0 ? arr.filter((x) => x !== c) : [...arr, c])} />)}</View>
        </>) : null}

        {step === 2 ? (<>
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.blue }]}>CCNL Sanità Pubblica 2022–2024</Text></View>
          {CONTRATTI.map((c) => (
            <OptionCard key={c.id} selected={contratto === c.id} onPress={() => pickContratto(c.id)}>
              <Text style={styles.optTitle}>{c.label}</Text>
              <View style={styles.ctrStats}>
                <Text style={styles.ctrStat}><Text style={styles.ctrStatB}>{c.oreSett}h</Text>/sett</Text>
                <Text style={styles.ctrStat}><Text style={styles.ctrStatB}>{c.oreMese}h</Text>/mese</Text>
                <Text style={styles.ctrStat}><Text style={styles.ctrStatB}>{c.nottiMax}</Text> notti/mese</Text>
                <Text style={styles.ctrStat}><Text style={styles.ctrStatB}>{c.giorniCons}</Text> gg cons.</Text>
              </View>
            </OptionCard>
          ))}
        </>) : null}

        {step === 3 ? (<>
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.blue }]}>Contratto: {ctr.label} · Notti max/mese: {ctr.nottiMax} · Riposo minimo: 11h (CCNL art. 26)</Text></View>
          {([[0, 'Non fa notti', 'Matrice solo turni Mattina e Pomeriggio.'], [1, '1 notte per ciclo settimanale', 'Ciclo con una notte isolata nella settimana.'], [2, '2 notti consecutive per ciclo', 'Ciclo con due notti di fila, seguite da riposi.']] as [0 | 1 | 2, string, string][]).map((o) => {
            const dis = ctr.nottiMax < o[0];
            return (<OptionCard key={o[0]} selected={notti === o[0]} disabled={dis} onPress={() => pickNotti(o[0])}><Text style={styles.optTitle}>{o[1]}{dis ? ' — non previsto dal contratto' : ''}</Text><Text style={styles.optSub}>{o[2]}</Text></OptionCard>);
          })}
        </>) : null}

        {step === 4 ? (<>
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.blue }]}>Seleziona i reparti in cui questo membro può lavorare (multipla).</Text></View>
          {!reparti.length ? <View style={[styles.info, { backgroundColor: 'rgba(255,176,32,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.warning }]}>Aggiungi prima un reparto dalla sezione Reparti.</Text></View> : null}
          {reparti.map((r, i) => (
            <OptionCard key={r.id} selected={repartiSel.indexOf(r.id) >= 0} onPress={() => toggleReparto(r.id)}>
              <View style={styles.repRow}>
                <View style={[styles.repIcon, { backgroundColor: avatarColor(i) }]}><Text style={styles.repIconTxt}>{r.sigla}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.optTitle}>{r.nome}</Text><Text style={styles.optSub}>{r.sigla} · M×{r.settori.M} P×{r.settori.P} N×{r.settori.N}</Text></View>
              </View>
            </OptionCard>
          ))}
        </>) : null}

        {step === 5 ? (<>
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,2,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.green }]}>Matrice utilizzata dall’operatore. Se lasci “Eredita” verrà usata quella del reparto o del mese.</Text></View>
          <OptionCard selected={matrice === ''} onPress={() => setMatrice('')}>
            <View style={styles.optRow}><Text style={styles.optTitle}>Eredita da reparto / mese</Text><Text style={styles.optBadge}>gerarchia</Text></View>
            <Text style={styles.optSub}>Nessuna matrice personale: usa quella del reparto, poi quella del mese.</Text>
          </OptionCard>
          {compatMatrici.map((m) => {
            const badge = m.notti === 0 ? 'no notti' : `${m.notti}N/ciclo`;
            return (
              <OptionCard key={m.id} selected={matrice === m.id} onPress={() => setMatrice(m.id)}>
                <View style={styles.optRow}><Text style={styles.optTitle}>{m.label}</Text><Text style={styles.optBadge}>{badge}</Text></View>
                <View style={styles.seq}>{m.seq.map((tt, idx) => (<View key={idx} style={[styles.seqBlk, { backgroundColor: shc(tt) + '33' }]}><Text style={[styles.seqTxt, { color: shc(tt) }]}>{tt}</Text></View>))}</View>
                {m.descrizione ? <Text style={[styles.optSub, { marginTop: 6 }]}>{m.descrizione}</Text> : null}
              </OptionCard>
            );
          })}
        </>) : null}

        {step === 6 ? (<>
          <View style={[styles.info, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Text style={[styles.infoTxt, { color: colors.blue }]}>L’offset sfasa la posizione di ciclo dell’operatore per distribuire i turni tra colleghi. La continuità tra i mesi è automatica.</Text></View>
          <View style={styles.settRow}><Text style={styles.optTitle}>Offset ciclo</Text><Stepper value={offset} onChange={(d) => setOffset(Math.min(Math.max(0, offset + d), 6))} /></View>
          <Text style={styles.optSub}>Operatori con offset diversi lavorano in fasi diverse dello stesso ciclo. Anteprima del ritmo a 14 giorni:</Text>
          <View style={styles.offPrev}>
            {Array.from({ length: 14 }).map((_, i) => {
              const d = i + 1;
              const cyc = mxPreview.seq && mxPreview.seq.length ? mxPreview.seq : (['R'] as Turno[]);
              const pos = (((d - 1 + offset) % cyc.length) + cyc.length) % cyc.length;
              const t = (cyc[pos] || 'R') as Turno;
              return (<View key={d} style={styles.offDay}><View style={[styles.offBlk, { backgroundColor: shc(t) + '33' }]}><Text style={[styles.offTxt, { color: shc(t) }]}>{t}</Text></View><Text style={styles.offNum}>{d}</Text></View>);
            })}
          </View>
        </>) : null}

        {step === 7 ? (<>
          <Text style={styles.label}>Esenzioni Turni</Text>
          <View style={styles.chips}>{([['M', 'No Mattina'], ['P', 'No Pomeriggio'], ['N', 'No Notte']] as [TurnoLavoro, string][]).map((tt) => <SelectChip key={tt[0]} label={tt[1]} selected={esT.indexOf(tt[0]) >= 0} onPress={() => toggleEsT(tt[0])} />)}</View>
          <Text style={[styles.label, { marginTop: spacing.m }]}>Esenzioni Settori</Text>
          {!settoriCodes.length ? <Text style={{ color: colors.textDisabled, fontSize: 12 }}>Nessun settore (seleziona reparti allo step 4).</Text> : <View style={styles.chips}>{settoriCodes.map((c) => <SelectChip key={c} label={'No ' + c} selected={esS.indexOf(c) >= 0} onPress={() => toggleEsS(c)} />)}</View>}
          <Text style={[styles.label, { marginTop: spacing.l }]}>Preferenze forti</Text>
          <View style={styles.chips}>
            <SelectChip label="No notti" selected={esT.indexOf('N') >= 0} onPress={() => toggleEsT('N')} />
            <SelectChip label="No weekend" selected={esWe} onPress={() => setEsWe((v) => !v)} />
            <SelectChip label="No festivi" selected={esFe} onPress={() => setEsFe((v) => !v)} />
            <SelectChip label="Solo mattina" selected={soloM} onPress={() => { setSoloM((v) => !v); if (!soloM) setSoloP(false); }} />
            <SelectChip label="Solo pomeriggio" selected={soloP} onPress={() => { setSoloP((v) => !v); if (!soloP) setSoloM(false); }} />
          </View>
          <Text style={[styles.label, { marginTop: spacing.m }]}>Preferenze deboli</Text>
          <View style={styles.chips}>
            <SelectChip label="Pref. mattina" selected={prefM} onPress={() => { setPrefM((v) => !v); if (!prefM) setPrefP(false); }} />
            <SelectChip label="Pref. pomeriggio" selected={prefP} onPress={() => { setPrefP((v) => !v); if (!prefP) setPrefM(false); }} />
            <SelectChip label="Weekend libero" selected={prefWeLib} onPress={() => setPrefWeLib((v) => !v)} />
          </View>
          {repartiSel.length > 1 ? (<>
            <Text style={[styles.label, { marginTop: spacing.m }]}>Reparto preferito</Text>
            <View style={styles.chips}><SelectChip label="Nessuno" selected={!prefRep} onPress={() => setPrefRep('')} />{repartiSel.map((rid) => <SelectChip key={rid} label={getRep(reparti, rid)?.nome || rid} selected={prefRep === rid} onPress={() => setPrefRep(rid)} />)}</View>
          </>) : null}
          {settoriCodes.length ? (<>
            <Text style={[styles.label, { marginTop: spacing.m }]}>Settore preferito</Text>
            <View style={styles.chips}><SelectChip label="Nessuno" selected={!prefSet} onPress={() => setPrefSet('')} />{settoriCodes.map((c) => <SelectChip key={c} label={c} selected={prefSet === c} onPress={() => setPrefSet(c)} />)}</View>
          </>) : null}
          <View style={styles.sumBox}>
            <Text style={styles.sumTitle}>RIEPILOGO</Text>
            {sumRow('Nome', nome || '—')}
            {sumRow('Qualifica', qualifica)}
            {sumRow('Contratto', ctr.label)}
            {sumRow('Monte ore/mese', ctr.oreMese + 'h')}
            {sumRow('Notti max/mese', String(ctr.nottiMax))}
            {sumRow('Notti/ciclo', String(notti))}
            {sumRow('Matrice', mxPreview.label)}
            {sumRow('Offset', String(offset))}
            {sumRow('Reparti', repartiSel.map((r) => getRep(reparti, r)?.nome).filter(Boolean).join(', ') || '—')}
          </View>
        </>) : null}
      </ScrollView>

      <View style={styles.foot}>
        <Pressable onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backBtn}><Text style={styles.backTxt}>{step > 1 ? 'Indietro' : 'Annulla'}</Text></Pressable>
        <Pressable onPress={() => (step < 7 ? next() : save())} style={[styles.nextBtn, { backgroundColor: colors.blue }]}><Text style={styles.nextTxt}>{step < 7 ? 'Avanti' : 'Aggiungi allo Staff'}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: spacing.l },
  label: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.s },
  help: { ...typography.caption, color: colors.textDisabled, marginTop: -2, marginBottom: spacing.s, lineHeight: 17 },
  input: { height: 48, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, borderRadius: radius.input, paddingHorizontal: spacing.m, fontSize: 16, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  info: { borderRadius: radius.smallCard, padding: spacing.m, marginBottom: spacing.m },
  infoTxt: { ...typography.caption, fontWeight: '600' },
  optTitle: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary },
  optSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optBadge: { ...typography.caption, fontWeight: '700', color: colors.textSecondary, backgroundColor: colors.bgEco, paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  ctrStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, marginTop: 7 },
  ctrStat: { ...typography.caption, color: colors.textSecondary },
  ctrStatB: { color: colors.textPrimary, fontWeight: '700' },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  repIcon: { width: 38, height: 38, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  repIconTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  seq: { flexDirection: 'row', gap: 3, marginTop: spacing.s, flexWrap: 'wrap' },
  seqBlk: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  seqTxt: { fontSize: 11, fontWeight: '700' },
  settRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.s },
  offPrev: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.m },
  offDay: { alignItems: 'center', gap: 2 },
  offBlk: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  offTxt: { fontSize: 11, fontWeight: '700' },
  offNum: { fontSize: 11, color: colors.textDisabled },
  sumBox: { borderRadius: radius.smallCard, padding: spacing.m, marginTop: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  sumTitle: { ...typography.caption, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary, marginBottom: spacing.s },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: spacing.m },
  sumK: { ...typography.caption, color: colors.textSecondary },
  sumV: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  foot: { flexDirection: 'row', gap: spacing.m, padding: spacing.m, borderTopWidth: 1, borderTopColor: colors.borderEco },
  backBtn: { flex: 1, height: 52, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderEco, alignItems: 'center', justifyContent: 'center' },
  backTxt: { ...typography.body, fontWeight: '700', color: colors.textSecondary },
  nextBtn: { flex: 1.6, height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  nextTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
});
