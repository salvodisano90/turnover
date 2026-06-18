// screens/ReperibilitaScreen.tsx — Reperibilità (redesign completo). Card sui token /design.
// LOGICA INTATTA: due viste (STAFF invia disponibilità / coordinatore assegna+richiama), persistenza separata
// (services/reperibilita + reperibilitaOp), conflicts, stats, telefonate, badge. NESSUNA modifica al motore.
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, TextInput, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import CloseButton from '../components/CloseButton';
import { RepAssignment, ReperibilitaOperatore } from '../types';
import { assignRep, loadRep, removeRep, repConflicts, repStats, saveRep, setRichiamo } from '../services/reperibilita';
import { loadRepOp, saveRepOp, aggiungiRichiestaRep, setStatoRep, badgeColorRep } from '../services/reperibilitaOp';
import { fmtDataIt } from '../utils/helpers';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

export default function ReperibilitaScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { ctx, currentPiano, month, year } = useStore();
  const piano = currentPiano || {};

  // --- Disponibilità operatore (overlay separato) ---
  const [repOp, setRepOp] = useState<ReperibilitaOperatore[]>([]);
  useEffect(() => { let m = true; loadRepOp().then((l) => { if (m) setRepOp(l); }); return () => { m = false; }; }, []);
  const myStaffId = '';
  const myRepOp = repOp.filter((r) => r.staffId === myStaffId);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const [rgg, setRgg] = useState(today.getDate());
  const [rmm, setRmm] = useState(today.getMonth() + 1);
  const [raaaa, setRaaaa] = useState(today.getFullYear());
  const [tuttoGiorno, setTuttoGiorno] = useState(true);
  const [fasciaTxt, setFasciaTxt] = useState('');
  const [tel, setTel] = useState('');
  const [noteTxt, setNoteTxt] = useState('');
  useEffect(() => { const last = myRepOp.length ? myRepOp[0].telefono : ''; if (last && !tel) setTel(last); }, [myRepOp.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmtIso = (iso: string) => { const q = (iso || '').split('-'); return q.length === 3 ? fmtDataIt(new Date(+q[0], +q[1] - 1, +q[2])) : iso; };
  const statoLabel = (st: string) => (st === 'approvata' ? 'APPROVATA' : st === 'rifiutata' ? 'RIFIUTATA' : 'IN ATTESA');
  const nomeStaff = (id: string) => (ctx.staff.find((x) => x.id === id)?.nome) || id;
  const submitRepOp = () => {
    if (!tel.trim()) { toast.show('Inserisci il numero di telefono', 'warning'); return; }
    if (!myStaffId) { toast.show('Operatore non collegato a questo accesso', 'warning'); return; }
    const iso = `${raaaa}-${pad2(rmm)}-${pad2(rgg)}`;
    const next = aggiungiRichiestaRep(repOp, { staffId: myStaffId, data: iso, fascia: tuttoGiorno ? '' : fasciaTxt.trim(), telefono: tel.trim(), note: noteTxt.trim() || undefined });
    setRepOp(next); saveRepOp(next); setNoteTxt(''); toast.show('Disponibilità inviata (in attesa)', 'success');
  };
  const setStatoOp = (id: string, stato: 'approvata' | 'rifiutata') => { const next = setStatoRep(repOp, id, stato); setRepOp(next); saveRepOp(next); };
  const chiama = (telnum: string) => { const n = (telnum || '').replace(/[^0-9+]/g, ''); if (n) Linking.openURL(`tel:${n}`); };

  const badgeColors = { green: colors.green, red: colors.danger2, yellow: colors.warning };
  const renderRepCard = (r: ReperibilitaOperatore, withName: boolean) => {
    const bc = badgeColorRep(r.stato, badgeColors);
    return (
      <View key={r.id} style={[styles.card, shadows.card]}>
        <View style={styles.repRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {withName ? <Text style={styles.nome} numberOfLines={2}>{nomeStaff(r.staffId)}</Text> : null}
            <Text style={[withName ? styles.meta : styles.nome]} numberOfLines={2}>{fmtIso(r.data)} · {r.fascia || 'Tutto il giorno'}{withName ? ` · ${r.telefono}` : ''}</Text>
            {r.note ? <Text style={styles.meta}>{r.note}</Text> : null}
            <View style={[styles.badge, { alignSelf: 'flex-start', marginTop: spacing.s, backgroundColor: bc + '22' }]}><Text style={[styles.badgeTxt, { color: bc }]}>{statoLabel(r.stato)}</Text></View>
          </View>
        </View>
        {withName ? (
          <View style={styles.repActions}>
            <Pressable onPress={() => chiama(r.telefono)} style={[styles.actBtn, { backgroundColor: 'rgba(88,204,255,0.15)' }]}><Icon name="call" size={16} color={colors.blue} /><Text style={[styles.actTxt, { color: colors.blue }]}>Chiama</Text></Pressable>
            {r.stato !== 'approvata' ? <Pressable onPress={() => setStatoOp(r.id, 'approvata')} style={[styles.actBtn, { backgroundColor: 'rgba(88,204,2,0.15)' }]}><Icon name="checkmark" size={16} color={colors.green} /><Text style={[styles.actTxt, { color: colors.green }]}>Accetta</Text></Pressable> : null}
            {r.stato !== 'rifiutata' ? <Pressable onPress={() => setStatoOp(r.id, 'rifiutata')} style={[styles.actBtn, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Icon name="close" size={16} color={colors.danger2} /><Text style={[styles.actTxt, { color: colors.danger2 }]}>Rifiuta</Text></Pressable> : null}
          </View>
        ) : null}
      </View>
    );
  };
  const repAttesa = repOp.filter((r) => r.stato === 'attesa');
  const repAppr = repOp.filter((r) => r.stato === 'approvata');
  const repRifi = repOp.filter((r) => r.stato === 'rifiutata');

  // --- Assegnazioni coordinatore ---
  const [list, setList] = useState<RepAssignment[]>([]);
  const [selOp, setSelOp] = useState<string | undefined>(undefined);
  const [day, setDay] = useState('');
  useEffect(() => { let m = true; loadRep().then((l) => { if (m) setList(l); }); return () => { m = false; }; }, []);
  const persist = (l: RepAssignment[]) => { setList(l); void saveRep(l); };
  const monthList = useMemo(() => list.filter((x) => x.month === month && x.year === year).sort((a, b) => a.day - b.day), [list, month, year]);
  const stats = useMemo(() => repStats(list, ctx.staff, month, year).filter((s) => s.reperibilita > 0), [list, ctx.staff, month, year]);
  const conflicts = useMemo(() => repConflicts(list, ctx, piano), [list, ctx, piano]);
  const nomeOf = (id: string) => (ctx.staff.find((s) => s.id === id)?.nome) || id;
  const add = () => {
    const d = parseInt(day, 10);
    if (!selOp) { toast.show('Seleziona un operatore', 'error'); return; }
    if (!d || d < 1 || d > 31) { toast.show('Giorno non valido (1–31)', 'error'); return; }
    persist(assignRep(list, { infId: selOp, day: d, month, year }));
    setDay(''); toast.show('Reperibilità assegnata', 'success');
  };

  const Header = ({ sub }: { sub: string }) => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
      <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Reperibilità</Text><Text style={styles.subTitle}>{sub}</Text></View>
      <CloseButton />
    </View>
  );
  const Sec = ({ children }: { children: React.ReactNode }) => <Text style={styles.sectionTitle}>{children}</Text>;

  // ===== Vista STAFF =====

  // ===== Vista coordinatore =====
  if (!ctx.staff.length) {
    return (<View style={[styles.root, { backgroundColor: colors.bgEco }]}><Header sub="Assegnazione e richiami" /><EmptyState icon="call-outline" title="Nessun operatore" desc="Aggiungi il personale per assegnare la reperibilità." /></View>);
  }
  return (
    <View style={[styles.root, { backgroundColor: colors.bgEco }]}>
      <Header sub="Assegnazione, richiami, statistiche" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* richieste disponibilità degli operatori */}
        {repOp.length ? ([['IN ATTESA', repAttesa], ['APPROVATE', repAppr], ['RIFIUTATE', repRifi]] as [string, ReperibilitaOperatore[]][]).map(([titolo, arr]) => arr.length ? (
          <View key={titolo}><Sec>{`${titolo} (${arr.length})`}</Sec>{arr.map((r) => renderRepCard(r, true))}</View>
        ) : null) : null}

        {conflicts.length ? (
          <View style={[styles.card, shadows.card, { borderColor: colors.danger2 }]}>
            <Text style={[styles.warnTitle, { color: colors.danger2 }]}>⚠ {conflicts.length} segnalazioni</Text>
            {conflicts.slice(0, 6).map((c, i) => <Text key={i} style={styles.warn}>• {nomeOf(c.infId)}: {c.dettaglio}</Text>)}
          </View>
        ) : null}

        <Sec>Assegna reperibilità</Sec>
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.lbl}>Operatore</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.s, paddingVertical: 2 }}>
            {ctx.staff.map((s) => { const on = selOp === s.id; return (
              <Pressable key={s.id} onPress={() => setSelOp(s.id)} style={[styles.chip, { backgroundColor: on ? colors.blue : colors.bgEco, borderColor: on ? colors.blue : colors.borderEco }]}><Text style={{ color: on ? '#08141E' : colors.textSecondary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{s.nome}</Text></Pressable>
            ); })}
          </ScrollView>
          <View style={styles.addRow}>
            <TextInput style={styles.inputFlex} placeholder="Giorno (1–31)" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" value={day} onChangeText={setDay} />
            <Pressable onPress={add} style={[styles.assignBtn, { backgroundColor: colors.blue }]}><Icon name="add" size={18} color="#08141E" /><Text style={styles.assignTxt}>Assegna</Text></Pressable>
          </View>
        </View>

        <Sec>Storico mese ({monthList.length})</Sec>
        {monthList.length ? monthList.map((a) => (
          <View key={a.id} style={[styles.card, shadows.card, styles.histRow]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.nome} numberOfLines={2}>{nomeOf(a.infId)} · giorno {a.day}</Text>
              <Text style={styles.meta}>{a.richiamato ? `Richiamato${a.richiamoTurno ? ` (${a.richiamoTurno})` : ''}` : 'In reperibilità'}</Text>
            </View>
            <Text style={styles.richLbl}>Richiamo</Text>
            <Switch value={!!a.richiamato} onValueChange={(v) => persist(setRichiamo(list, a.id, v))} trackColor={{ true: colors.warning }} />
            <Pressable onPress={() => persist(removeRep(list, a.id))} hitSlop={6} style={[styles.del, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Icon name="trash" size={16} color={colors.danger2} /></Pressable>
          </View>
        )) : <EmptyState icon="call-outline" title="Nessuna reperibilità" desc="Assegna la prima reperibilità del mese." />}

        {stats.length ? (
          <>
            <Sec>Statistiche</Sec>
            <View style={[styles.card, shadows.card]}>
              {stats.map((s, i) => (
                <View key={s.infId} style={[styles.statRow, i < stats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderEco }]}>
                  <Text style={styles.statN}>{s.nome}</Text>
                  <Text style={styles.statV}>{s.reperibilita} rep · {s.richiami} richiami</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
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
  sectionTitle: { ...typography.caption, fontWeight: '700', letterSpacing: 0.6, color: colors.textSecondary, marginTop: spacing.l, marginBottom: spacing.m },
  card: { borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.m, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  lbl: { ...typography.secondary, color: colors.textSecondary, marginBottom: spacing.s },
  dRow: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.s },
  dStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  dBtn: { width: 38, height: 38, borderRadius: radius.smallCard, backgroundColor: colors.bgEco, borderWidth: 1, borderColor: colors.borderEco, alignItems: 'center', justifyContent: 'center' },
  dVal: { ...typography.body, fontWeight: '800', color: colors.textPrimary, minWidth: 32, textAlign: 'center' },
  swRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.m },
  in: { borderRadius: radius.input, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.bgEco, color: colors.textPrimary, paddingHorizontal: spacing.m, paddingVertical: spacing.m, fontSize: 16, marginTop: spacing.s },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button, marginTop: spacing.m },
  primaryTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
  empty: { ...typography.secondary, color: colors.textDisabled, marginTop: spacing.s },
  repRow: { flexDirection: 'row', alignItems: 'center' },
  nome: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: 9, paddingVertical: 5, paddingHorizontal: spacing.m },
  badgeTxt: { ...typography.caption, fontWeight: '800' },
  repActions: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.button, height: 44 },
  actTxt: { ...typography.secondary, fontWeight: '800' },
  warnTitle: { ...typography.secondary, fontWeight: '800', marginBottom: spacing.s },
  warn: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chip: { paddingHorizontal: spacing.l, height: 40, borderRadius: radius.smallCard, borderWidth: 1, alignItems: 'center', justifyContent: 'center', maxWidth: 160 },
  addRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m, alignItems: 'center' },
  inputFlex: { flex: 1, borderRadius: radius.input, paddingHorizontal: spacing.m, paddingVertical: spacing.m, fontSize: 16, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.bgEco, color: colors.textPrimary },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, height: 48, paddingHorizontal: spacing.l, borderRadius: radius.button },
  assignTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  richLbl: { ...typography.caption, color: colors.textSecondary },
  del: { width: 36, height: 36, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.m },
  statN: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary },
  statV: { ...typography.secondary, color: colors.textSecondary },
});
