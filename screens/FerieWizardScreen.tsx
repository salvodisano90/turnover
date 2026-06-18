// screens/FerieWizardScreen.tsx — Ferie/Assenze wizard (redesign modal). Token /design, r28/pad24.
// LOGICA INTATTA: addFerie/updateFerie, clamp giorni, redirect sostituzioni per assenze urgenti.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import CloseButton from '../components/CloseButton';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { MONTHS, legacyAbsenceLabel } from '../utils/constants';
import { Ferie } from '../types';
import { daysInMonth } from '../utils/helpers';
import SelectChip from '../components/SelectChip';
import Stepper from '../components/Stepper';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

export default function FerieWizardScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ infId?: string; edit?: string; from?: string; to?: string; motivo?: string; tipo?: string; note?: string }>();
  const { staff, month, year, addFerie, updateFerie } = useStore();
  const dim = daysInMonth(year, month);

  const isEdit = params.edit === '1';
  const initFrom = params.from ? Math.max(1, Math.min(dim, parseInt(String(params.from), 10) || 1)) : 1;
  const initTo = params.to ? Math.max(1, Math.min(dim, parseInt(String(params.to), 10) || 1)) : 1;
  const initMotivo = params.motivo ? String(params.motivo) : (legacyAbsenceLabel(params.tipo) || (params.note ? String(params.note) : ''));

  const initial = params.infId ? String(params.infId) : staff.length ? staff[0].id : '';
  const [infId, setInfId] = useState(initial);
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [motivo, setMotivo] = useState(initMotivo);

  const clampFrom = (d: number) => { const v = Math.min(Math.max(1, from + d), dim); setFrom(v); if (to < v) setTo(v); };
  const clampTo = (d: number) => { setTo(Math.min(Math.max(from, to + d), dim)); };

  const inf = staff.find((s) => s.id === infId);
  const gg = to - from + 1;

  const onSave = () => {
    if (!infId) { toast.show('Aggiungi prima un membro dello staff', 'warning'); return; }
    const next: Ferie = { infId, from, to, month, year, motivo: motivo.trim() ? motivo.trim() : 'Assenza' };
    if (isEdit) {
      const orig: Ferie = { infId: String(params.infId || infId), from: initFrom, to: initTo, month, year, motivo: initMotivo };
      updateFerie(orig, next);
      toast.show('Assenza modificata. Piano aggiornato.', 'success');
    } else {
      addFerie(next);
      const lab = motivo.trim() || 'Assenza';
      toast.show(`${lab} di ${inf ? inf.nome : 'membro'} salvata. Piano aggiornato.`, 'success');
      const m = lab.toLowerCase();
      const urgente = m.includes('malatt') || m.includes('infortun') || m.includes('permess');
      if (urgente && inf && inf.reparti && inf.reparti.length) {
        router.replace({ pathname: '/sostituzioni', params: { day: String(from), repId: inf.reparti[0], excludeId: infId } });
        return;
      }
    }
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgEco, paddingBottom: insets.bottom }]}>
      {/* header modal */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEdit ? 'Modifica assenza' : 'Aggiungi assenza'}</Text>
          <Text style={styles.subTitle}>{MONTHS[month]} {year}</Text>
        </View>
        <CloseButton />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Membro dello staff</Text>
        <View style={styles.chips}>
          {staff.map((s) => <SelectChip key={s.id} label={s.nome} selected={infId === s.id} onPress={() => setInfId(s.id)} />)}
        </View>

        {/* stepper giorni in card */}
        <View style={styles.dual}>
          <View style={[styles.stepCard, { flex: 1 }]}>
            <Text style={styles.stepLabel}>Dal giorno</Text>
            <Stepper value={from} onChange={clampFrom} />
          </View>
          <View style={[styles.stepCard, { flex: 1 }]}>
            <Text style={styles.stepLabel}>Al giorno</Text>
            <Stepper value={to} onChange={clampTo} />
          </View>
        </View>

        <Text style={styles.label}>Motivazione</Text>
        <TextInput value={motivo} onChangeText={setMotivo} placeholder="Es. Ferie, Malattia, Legge 104, Permesso, Formazione…" placeholderTextColor={colors.textDisabled} style={styles.noteInput} />

        {/* riepilogo: valore grande = giorni */}
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryDays}>{gg}<Text style={styles.summaryDaysUnit}> {gg === 1 ? 'giorno' : 'giorni'}</Text></Text>
            <View style={styles.summaryBadge}><Text style={styles.summaryBadgeTxt}>{motivo.trim() || 'Assenza'}</Text></View>
          </View>
          <Text style={styles.summaryInfo}>{inf ? inf.nome : '—'} · {from}–{to} {MONTHS[month]} {year}. Gli slot scoperti verranno coperti automaticamente.</Text>
        </View>
      </ScrollView>

      <View style={styles.foot}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.cancelBtn}><Text style={styles.cancelTxt}>Annulla</Text></Pressable>
        <Pressable onPress={onSave} style={[styles.confirmBtn, { backgroundColor: colors.blue }]}><Text style={styles.confirmTxt}>Conferma</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.sectionTitle, color: colors.textPrimary },
  subTitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  hBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.h },
  label: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.s, marginTop: spacing.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginBottom: spacing.s },
  dual: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.s, marginTop: spacing.m },
  stepCard: { backgroundColor: colors.cardEco, borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, padding: spacing.l, gap: spacing.s },
  stepLabel: { ...typography.caption, color: colors.textSecondary },
  noteInput: { borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, color: colors.textPrimary, borderRadius: radius.input, padding: spacing.m, fontSize: 16, marginBottom: spacing.l },
  summary: { backgroundColor: colors.cardEco, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderEco, padding: spacing.l },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.s },
  summaryDays: { fontSize: 34, fontWeight: '800', color: colors.blue },
  summaryDaysUnit: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  summaryBadge: { paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: 12, backgroundColor: 'rgba(88,204,255,0.15)' },
  summaryBadgeTxt: { ...typography.caption, fontWeight: '700', color: colors.blue },
  summaryInfo: { ...typography.secondary, color: colors.textSecondary, lineHeight: 19 },
  foot: { flexDirection: 'row', gap: spacing.m, paddingHorizontal: spacing.xxl, paddingTop: spacing.m },
  cancelBtn: { flex: 1, height: 52, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderEco, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { ...typography.body, fontWeight: '700', color: colors.textSecondary },
  confirmBtn: { flex: 1, height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { ...typography.body, fontWeight: '700', color: '#08141E' },
});
