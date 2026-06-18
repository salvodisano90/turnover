// screens/StaffDetailScreen.tsx — Staff Detail (Apple Liquid Glass). SOLO UI.
// LOGICA INTATTA: countWork/countTurno/monteTurni/getCell/removeStaff/removeFerie + navigazione wizard/ferie.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { confirmAction } from '../utils/confirm';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import { RELATION_LABEL, PRIORITY_LABEL, familyCoverageScore, expandMatrix, operatorShiftsFromPiano, partnerShiftsFor, generateInverseShifts } from '../services/familyConstraint';
import { colors, fnColor } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';
import { useToast } from '../hooks/useToast';
import { countTurno, countWork, getCell, getEmptyCell, monteTurni } from '../services/engine';
import { MONTHS, TURNI, getAssenza, legacyAbsenceLabel } from '../utils/constants';
import { daysInMonth, getCtr, getInf, getMx, jsDow } from '../utils/helpers';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';

const ACCENT = fnColor.personale;
const SHIFT: Record<string, string> = { M: colors.shiftMattina, P: colors.shiftPomeriggio, N: colors.shiftNotte, R: colors.textDisabled, S: colors.shiftNotte, F: colors.danger2, G: colors.purple };

export default function StaffDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ infId: string }>();
  const infId = String(params.infId);
  const { staff, reparti, ferie, currentPiano, year, month, removeStaff, removeFerie, updateStaff, ctx } = useStore();
  const inf = getInf(staff, infId);

  if (!inf) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.l }]}>
        <Text style={{ color: colors.textSecondary, padding: spacing.l }}>Operatore non trovato.</Text>
      </View>
    );
  }

  const ctr = getCtr(inf.contratto);
  const mx = getMx(inf.matrice);
  const dim = daysInMonth(year, month);
  const work = countWork(currentPiano, infId, dim);
  const mt = monteTurni(inf);
  const nN = countTurno(currentPiano, infId, 'N', dim);
  const pct = mt ? Math.min(100, Math.round((work / mt) * 100)) : 0;
  const over = work > mt;
  const myFerie = ferie.filter((f) => f.infId === infId && f.month === month && f.year === year);
  const first = jsDow(year, month, 1);
  const oreMese = work * 8;
  const anni = typeof inf.anniEsperienza === 'number' ? inf.anniEsperienza : 0;

  const confirmRemove = () => {
    confirmAction('Rimuovere membro', `Rimuovere ${inf.nome} dallo staff?`, () => { removeStaff(infId); toast.show(`${inf.nome} rimosso`, 'success'); router.back(); }, 'Rimuovi');
  };

  // disponibilità settimanale = presenza in turno lun→dom della settimana corrente del mese
  const weekDots = React.useMemo(() => {
    const out: ('on' | 'off')[] = [];
    const base = Math.min(dim, new Date().getDate());
    const monBase = base - ((jsDow(year, month, base) + 6) % 7);
    for (let i = 0; i < 7; i++) { const d = monBase + i; if (d < 1 || d > dim) { out.push('off'); continue; } const c = getCell(currentPiano, infId, d) || getEmptyCell(); out.push((c.turno === 'M' || c.turno === 'P' || c.turno === 'N') ? 'on' : 'off'); }
    return out;
  }, [currentPiano, infId, year, month, dim]);

  const Stat = ({ value, label, color }: { value: string; label: string; color?: string }) => (
    <View style={styles.stat}>
      <Text style={[styles.statVal, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* top bar back + menu */}
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <Pressable hitSlop={10} onPress={() => router.push({ pathname: '/staff-wizard', params: { id: infId } })} style={styles.iconBtn}><Icon name="ellipsis-horizontal" size={22} color={colors.textPrimary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* avatar centrato + nome/ruolo/stato */}
        <View style={styles.hero}>
          <View style={[styles.avatarRing, { borderColor: ACCENT }]}><Avatar nome={inf.nome} size={120} /></View>
          <Text style={styles.name}>{inf.nome}</Text>
          <Text style={styles.role}>{inf.qualifica}</Text>
          {(inf.reparti || []).length ? <Text style={styles.repName}>{reparti.find((r) => r.id === (inf.reparti || [])[0])?.nome || ''}</Text> : null}
          <View style={styles.statusPill}><View style={styles.statusDot} /><Text style={styles.statusTxt}>Attivo</Text></View>
        </View>

        {/* stat cards */}
        <GlassCard style={{ marginBottom: spacing.l }}>
          <View style={styles.statsRow}>
            <Stat value={`${anni} ${anni === 1 ? 'anno' : 'anni'}`} label="Anzianità" />
            <View style={styles.statDiv} />
            <Stat value={`${work}`} label="Turni mese" color={over ? colors.danger2 : ACCENT} />
            <View style={styles.statDiv} />
            <Stat value={`${oreMese}`} label="Ore mese" />
            <View style={styles.statDiv} />
            <Stat value={`${pct}%`} label="Carico" color={over ? colors.danger2 : colors.green} />
          </View>
        </GlassCard>

        {/* carico turni barra */}
        <GlassCard style={{ marginBottom: spacing.l }}>
          <View style={styles.barTop}><Text style={styles.cardLbl}>Carico turni</Text><Text style={[styles.barVal, { color: over ? colors.danger2 : colors.textPrimary }]}>{work}/{mt} · notti {nN}/{ctr.nottiMax}</Text></View>
          <View style={styles.bar}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: over ? colors.danger2 : ACCENT }]} /></View>
          <View style={styles.chips}>
            <Text style={[styles.chip, { color: ACCENT, backgroundColor: ACCENT + '22' }]}>{ctr.label}</Text>
            <Text style={[styles.chip, { color: colors.textSecondary, backgroundColor: colors.glass }]}>{mx ? mx.label : '–'}</Text>
            <Text style={[styles.chip, { color: colors.textSecondary, backgroundColor: colors.glass }]}>{inf.nottiPerCiclo}N/ciclo</Text>
          </View>
        </GlassCard>

        {/* disponibilità settimanale */}
        <Text style={styles.section}>Disponibilità</Text>
        <GlassCard style={{ marginBottom: spacing.l }}>
          <View style={styles.weekRow}>
            {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map((d, i) => (
              <View key={i} style={styles.weekCol}>
                <Text style={styles.weekDow}>{d}</Text>
                <View style={[styles.weekDot, { backgroundColor: weekDots[i] === 'on' ? colors.green : colors.glassStrong }]} />
              </View>
            ))}
          </View>
        </GlassCard>

        {/* esenzioni */}
        {((inf.esenzioniTurni || []).length || (inf.esenzioniSettori || []).length) ? (<>
          <Text style={styles.section}>Esenzioni</Text>
          <GlassCard style={{ marginBottom: spacing.l }}>
            <View style={styles.chips}>
              {(inf.esenzioniTurni || []).map((t) => <Text key={'t' + t} style={[styles.chip, { color: colors.danger2, backgroundColor: colors.danger2 + '22' }]}>No {TURNI[t].label}</Text>)}
              {(inf.esenzioniSettori || []).map((c) => <Text key={'s' + c} style={[styles.chip, { color: colors.danger2, backgroundColor: colors.danger2 + '22' }]}>No {c}</Text>)}
            </View>
          </GlassCard>
        </>) : null}

        {/* assenze */}
        <Text style={styles.section}>Assenze</Text>
        <GlassCard style={{ marginBottom: spacing.l }} padded={myFerie.length ? false : true}>
          {myFerie.length ? myFerie.map((f, i, arr) => (
            <View key={i} style={[styles.ferieRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.ferieTxt} numberOfLines={2}>{(f.motivo && f.motivo.trim()) ? f.motivo.trim() : (legacyAbsenceLabel(f.tipo) || 'Assenza')}</Text>
                <Text style={styles.ferieSub}>{f.from}–{f.to} {MONTHS[month]}</Text>
              </View>
              <Pressable hitSlop={6} onPress={() => router.push({ pathname: '/ferie-wizard', params: { infId, edit: '1', from: String(f.from), to: String(f.to), motivo: (f.motivo && f.motivo.trim()) ? f.motivo.trim() : (legacyAbsenceLabel(f.tipo) || 'Assenza') } })}><Text style={[styles.act, { color: ACCENT }]}>Modifica</Text></Pressable>
              <Pressable hitSlop={6} onPress={() => { removeFerie(f); toast.show('Assenza rimossa', 'success'); }}><Text style={[styles.act, { color: colors.danger2 }]}>Rimuovi</Text></Pressable>
            </View>
          )) : <Text style={styles.empty}>Nessuna assenza pianificata</Text>}
        </GlassCard>

        {/* calendario mese */}
        <Text style={styles.section}>{MONTHS[month]} {year}</Text>
        <GlassCard>
          <View style={styles.cal}>
            {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map((d, i) => <Text key={i} style={styles.calDow}>{d}</Text>)}
            {Array.from({ length: first }).map((_, i) => <View key={'b' + i} style={styles.calDay} />)}
            {Array.from({ length: dim }).map((_, i) => {
              const d = i + 1;
              const c = getCell(currentPiano, infId, d) || getEmptyCell();
              const ca = c.turno === 'F' ? getAssenza() : undefined;
              const sc = SHIFT[c.turno] || colors.textDisabled;
              const cbg = ca ? ca.soft : sc + '33';
              const cfg = ca ? ca.color : sc;
              return (<View key={d} style={[styles.calDay, { backgroundColor: c.turno && c.turno !== 'R' ? cbg : 'transparent' }]}><Text style={[styles.calLetter, { color: cfg }]}>{ca ? ca.code : (c.turno && c.turno !== 'R' ? c.turno : '')}</Text><Text style={[styles.calNum, { color: c.turno && c.turno !== 'R' ? cfg : colors.textDisabled }]}>{d}</Text></View>);
            })}
          </View>
        </GlassCard>

        {/* VINCOLO FAMILIARE (Inverse Engine) */}
        <GlassCard style={{ marginTop: spacing.l }}>
          <View style={styles.famHead}>
            <Text style={styles.famTitle}>Vincolo Familiare</Text>
            <Pressable onPress={() => { const fam = inf.family; updateStaff({ ...inf, family: fam ? { ...fam, enabled: !fam.enabled } : { id: 'fam_' + infId, staffId: infId, enabled: true, relation: 'CONIUGE', priority: 'MEDIA', inverseMatrix: [] } }); }}
              style={[styles.toggle, { backgroundColor: inf.family?.enabled ? colors.green : colors.glassStrong }]}>
              <View style={[styles.knob, { alignSelf: inf.family?.enabled ? 'flex-end' : 'flex-start' }]} />
            </Pressable>
          </View>
          <Text style={styles.famHint}>Tiene conto dei turni del convivente per favorire la presenza di un adulto a casa. Vincolo non assoluto: mai sopra sicurezza e copertura.</Text>

          {inf.family?.enabled ? (
            <>
              <Text style={styles.famLabel}>Relazione</Text>
              <View style={styles.segRow}>
                {(['CONIUGE', 'PARTNER', 'GENITORE', 'ALTRO'] as const).map((r) => {
                  const on = inf.family!.relation === r;
                  return <Pressable key={r} onPress={() => updateStaff({ ...inf, family: { ...inf.family!, relation: r } })} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{RELATION_LABEL[r]}</Text></Pressable>;
                })}
              </View>
              <Text style={[styles.famLabel, { marginTop: spacing.m }]}>Priorità</Text>
              <View style={styles.segRow}>
                {(['BASSA', 'MEDIA', 'ALTA', 'CRITICA'] as const).map((pr) => {
                  const on = inf.family!.priority === pr;
                  return <Pressable key={pr} onPress={() => updateStaff({ ...inf, family: { ...inf.family!, priority: pr } })} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{PRIORITY_LABEL[pr]}</Text></Pressable>;
                })}
              </View>
              <Text style={[styles.famLabel, { marginTop: spacing.m }]}>Tipo vincolo (Inverse)</Text>
              <View style={styles.segRow}>
                {([['matrix', 'Matrice esterna'], ['linked', 'Operatore collegato']] as const).map(([src, lbl]) => {
                  const on = (inf.family!.source || 'matrix') === src;
                  return <Pressable key={src} onPress={() => updateStaff({ ...inf, family: { ...inf.family!, source: src } })} style={[styles.seg, on && { backgroundColor: colors.purple }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{lbl}</Text></Pressable>;
                })}
              </View>

              {(inf.family.source || 'matrix') === 'linked' ? (
                <>
                  <Text style={[styles.famLabel, { marginTop: spacing.m }]}>Operatore collegato (coniuge/convivente)</Text>
                  <View style={styles.segRow}>
                    {staff.filter((o) => o.id !== infId).slice(0, 12).map((o) => {
                      const on = inf.family!.linkedStaffId === o.id;
                      return <Pressable key={o.id} onPress={() => updateStaff({ ...inf, family: { ...inf.family!, linkedStaffId: o.id } })} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{o.nome}</Text></Pressable>;
                    })}
                  </View>
                  {inf.family.linkedStaffId ? (() => {
                    const partnerSh = operatorShiftsFromPiano(currentPiano, inf.family!.linkedStaffId!, Math.min(dim, 14));
                    const inv = generateInverseShifts(partnerSh);
                    return <Text style={styles.famHint}>Schema complementare suggerito (prime 2 settimane): {inv.join(' ')}</Text>;
                  })() : null}
                </>
              ) : (
                <>
                  <Text style={[styles.famLabel, { marginTop: spacing.m }]}>Matrice del convivente</Text>
                  <View style={styles.segRow}>
                    {(ctx?.matrici || []).slice(0, 8).map((m: any) => {
                      const on = JSON.stringify(inf.family!.inverseMatrix) === JSON.stringify(m.seq);
                      return <Pressable key={m.id} onPress={() => updateStaff({ ...inf, family: { ...inf.family!, inverseMatrix: m.seq } })} style={[styles.seg, on && { backgroundColor: colors.purple }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{m.id}</Text></Pressable>;
                    })}
                  </View>
                </>
              )}

              <Text style={[styles.famLabel, { marginTop: spacing.m }]}>Regole familiari</Text>
              {([['weekend', ['condivisi', 'alternati', 'indifferente']], ['notti', ['alternate', 'indifferente']], ['giorni', ['insieme', 'separati', 'indifferente']]] as const).map(([rule, opts]) => (
                <View key={rule} style={{ marginBottom: spacing.s }}>
                  <Text style={styles.ruleLabel}>{rule === 'weekend' ? 'Weekend' : rule === 'notti' ? 'Notti' : 'Giorni'}</Text>
                  <View style={styles.segRow}>
                    {opts.map((opt) => {
                      const cur = (inf.family!.rules || { weekend: 'indifferente', notti: 'indifferente', giorni: 'indifferente' }) as any;
                      const on = cur[rule] === opt;
                      return <Pressable key={opt} onPress={() => updateStaff({ ...inf, family: { ...inf.family!, rules: { ...(inf.family!.rules || { weekend: 'indifferente', notti: 'indifferente', giorni: 'indifferente' }), [rule]: opt } } })} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{opt}</Text></Pressable>;
                    })}
                  </View>
                </View>
              ))}

              {(() => {
                const opSh = operatorShiftsFromPiano(currentPiano, infId, dim);
                const partner = partnerShiftsFor(inf.family!, currentPiano, dim, () => inf.offset || 0);
                if (!partner.length) return <Text style={styles.famHint}>Imposta la matrice del convivente o collega un operatore per calcolare la copertura familiare.</Text>;
                const fcs = familyCoverageScore(opSh, partner);
                const tone = fcs.score >= 80 ? colors.green : fcs.score >= 50 ? colors.warning : colors.danger2;
                return (
                  <View style={[styles.famScore, { borderColor: tone }]}>
                    <Text style={[styles.famScoreVal, { color: tone }]}>{fcs.score}%</Text>
                    <Text style={styles.famScoreLbl} numberOfLines={2}>Copertura familiare · {fcs.giorniCritici} giorni critici su {fcs.giorniTotali}</Text>
                  </View>
                );
              })()}
            </>
          ) : null}
        </GlassCard>
      </ScrollView>

      {/* footer azioni glass */}
      <View style={[styles.foot, { paddingBottom: insets.bottom + spacing.s }]}>
        <Pressable onPress={() => router.push({ pathname: '/ferie-wizard', params: { infId } })} style={[styles.footBtn, { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border }]}><Icon name="calendar-outline" size={18} color={ACCENT} /><Text style={[styles.footTxt, { color: ACCENT }]}>Assenza</Text></Pressable>
        <Pressable onPress={() => router.push({ pathname: '/staff-wizard', params: { id: infId } })} style={[styles.footBtn, { backgroundColor: ACCENT }]}><Icon name="create-outline" size={18} color="#000" /><Text style={[styles.footTxt, { color: '#000' }]}>Modifica</Text></Pressable>
        <Pressable onPress={confirmRemove} style={[styles.footBtn, { backgroundColor: colors.danger2 + '22', borderWidth: 1, borderColor: colors.danger2 }]}><Icon name="trash-outline" size={18} color={colors.danger2} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  famHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  famTitle: { ...typography.cardTitle, color: colors.textPrimary },
  famHint: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, marginTop: spacing.s },
  ruleLabel: { ...typography.caption, color: colors.textDisabled, marginBottom: 4 },
  famLabel: { ...typography.secondary, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.m, marginBottom: spacing.s },
  toggle: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  seg: { flexGrow: 1, minWidth: 58, paddingVertical: spacing.s, paddingHorizontal: spacing.s, borderRadius: radius.pill, backgroundColor: colors.glassStrong, alignItems: 'center' },
  segTxt: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  famScore: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginTop: spacing.m, padding: spacing.m, borderRadius: radius.smallCard, borderWidth: 1 },
  famScoreVal: { ...typography.sectionTitle, fontWeight: '800' },
  famScoreLbl: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 16 },
  container: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xxl, paddingBottom: spacing.s },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingTop: spacing.s, paddingBottom: spacing.l },
  avatarRing: { width: 132, height: 132, borderRadius: 66, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.m },
  name: { ...typography.sectionTitle, color: colors.textPrimary },
  role: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  repName: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.m, paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: radius.pill, backgroundColor: colors.green + '22' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  statusTxt: { ...typography.caption, fontWeight: '700', color: colors.green },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 32, backgroundColor: colors.divider },
  statVal: { ...typography.cardTitle, fontWeight: '700', color: colors.textPrimary },
  statLbl: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  cardLbl: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.m },
  barVal: { ...typography.secondary, fontWeight: '700' },
  bar: { height: 8, borderRadius: 5, backgroundColor: colors.glassStrong, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.m },
  chip: { ...typography.caption, fontWeight: '700', paddingHorizontal: spacing.m, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  section: { ...typography.cardTitle, color: colors.textPrimary, marginTop: spacing.s, marginBottom: spacing.m },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center', gap: spacing.s },
  weekDow: { ...typography.caption, color: colors.textDisabled },
  weekDot: { width: 18, height: 18, borderRadius: 9 },
  ferieRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.l, paddingVertical: spacing.m, paddingHorizontal: spacing.xl },
  ferieTxt: { ...typography.secondary, fontWeight: '600', color: colors.textPrimary },
  ferieSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  act: { ...typography.secondary, fontWeight: '700' },
  empty: { ...typography.secondary, color: colors.textDisabled },
  cal: { flexDirection: 'row', flexWrap: 'wrap' },
  calDow: { width: `${100 / 7}%`, textAlign: 'center', ...typography.caption, color: colors.textDisabled, marginBottom: spacing.s },
  calDay: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginBottom: 3 },
  calLetter: { fontSize: 11, fontWeight: '800' },
  calNum: { fontSize: 11 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingHorizontal: spacing.xxl, paddingTop: spacing.m, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.bgSecondary },
  footBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button },
  footTxt: { ...typography.body, fontWeight: '700' },
});
