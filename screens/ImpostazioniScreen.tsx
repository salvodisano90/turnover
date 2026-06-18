// screens/ImpostazioniScreen.tsx — Impostazioni (FASE 3 redesign). Gerarchia ricostruita sui token /design.
// NESSUNA modifica a dati/logica: modalità motore/AI, matrice del mese, toast e persistenza invariati.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { GenerationMode, PlanMode } from '../types';
import { MATRICI, MONTHS } from '../utils/constants';
import { monthKey } from '../utils/helpers';
import PressableScale from '../components/PressableScale';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

const MODES: { id: GenerationMode; title: string; sub: string; prio: string[] }[] = [
  { id: 'operativa', title: 'Modalità Operativa', sub: 'Punta al 100% di copertura. Quando serve genera deroghe controllate (tracciate).', prio: ['1. 11 ore (non derogabili)', '2. Recupero post-notte', '3. Copertura', '4. Equità', '5. Preferenze'] },
  { id: 'rigida', title: 'Modalità Rigida', sub: 'Privilegia equità e preferenze. La copertura può scendere; nessuna deroga a notti/weekend/festivi.', prio: ['1. 11 ore (non derogabili)', '2. Recupero post-notte', '3. Equità', '4. Preferenze', '5. Copertura'] },
];
const AI_MODES: { id: PlanMode; title: string; sub: string }[] = [
  { id: 'coordinatore', title: 'Coordinatore AI', sub: 'Ottimizzatore + equità + desiderata + preferenze attivi. L\u2019AI bilancia il piano come un coordinatore.' },
  { id: 'equa', title: 'Equa', sub: 'Ottimizzatore ed equità attivi (notti/weekend/festivi/ore bilanciati).' },
  { id: 'rapida', title: 'Rapida', sub: 'Solo matrice + copertura. Massima aderenza alla matrice, nessuna ottimizzazione.' },
];

export default function ImpostazioniScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { mode, setMode, aiMode, setAiMode, matriceMese, setMatriceMese, matriciCustom, month, year } = useStore();
  const mKey = monthKey(year, month);
  const meseSel = matriceMese[mKey] || '';
  const catalogo = [...MATRICI, ...matriciCustom];

  const pick = (m: GenerationMode) => { if (m === mode) return; setMode(m); toast.show(`Modalità ${m === 'rigida' ? 'Rigida' : 'Operativa'} attivata. Piano rigenerato.`, 'success'); };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => <Text style={styles.sectionTitle}>{children}</Text>;
  // Riga-opzione selezionabile (card group)
  const Option = ({ selected, onPress, title, sub, prio, badgeText, badgeTone, last }: { selected: boolean; onPress: () => void; title: string; sub?: string; prio?: string[]; badgeText?: string; badgeTone?: 'blue' | 'green' | 'muted'; last?: boolean }) => {
    const tone = badgeTone === 'green' ? colors.green : badgeTone === 'muted' ? colors.textSecondary : colors.blue;
    const toneBg = badgeTone === 'green' ? 'rgba(88,204,2,0.15)' : badgeTone === 'muted' ? colors.card : 'rgba(88,204,255,0.15)';
    return (
      <PressableScale onPress={onPress}>
        <View style={[styles.optionRow, { borderColor: selected ? colors.blue : 'transparent', borderWidth: selected ? 1.5 : 0 }, !last && styles.optionDivider]}>
          <View style={{ flex: 1 }}>
            <View style={styles.rowTop}>
              <Text style={styles.itemTitle}>{title}</Text>
              {badgeText ? <Text style={[styles.badge, { color: tone, backgroundColor: toneBg }]}>{badgeText}</Text> : null}
            </View>
            {sub ? <Text style={styles.itemSub}>{sub}</Text> : null}
            {prio ? prio.map((p) => <Text key={p} style={styles.prio}>{p}</Text>) : null}
          </View>
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* HEADER 72 / titolo centrato / back a sinistra */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
<BackButton />
        <Text style={styles.headerTitle}>Impostazioni</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Dati */}
        <SectionTitle>Strumenti</SectionTitle>
        <PressableScale onPress={() => router.push('/centro-decisionale')}>
          <View style={[styles.linkRow, shadows.card]}>
            <Icon name="flash-outline" size={22} color={colors.blue} />
            <Text style={styles.linkTxt}>Centro Decisionale</Text>
            <Icon name="chevron-forward" size={20} color={colors.textDisabled} />
          </View>
        </PressableScale>

        <SectionTitle>Dati</SectionTitle>
        <PressableScale onPress={() => router.push('/backup')}>
          <View style={[styles.linkRow, shadows.card]}>
            <Icon name="save-outline" size={22} color={colors.green} />
            <Text style={styles.linkTxt}>Backup e Ripristino</Text>
            <Icon name="chevron-forward" size={20} color={colors.textDisabled} />
          </View>
        </PressableScale>
        <PressableScale onPress={() => router.push('/personalizzazione')}>
          <View style={[styles.linkRow, shadows.card]}>
            <Icon name="color-palette-outline" size={22} color={colors.purple} />
            <Text style={styles.linkTxt}>Aspetto e accessibilità</Text>
            <Icon name="chevron-forward" size={20} color={colors.textDisabled} />
          </View>
        </PressableScale>

        {/* Modalità di pianificazione (gruppo in card) */}
        <SectionTitle>Modalità di pianificazione</SectionTitle>
        <View style={[styles.group, shadows.card]}>
          {AI_MODES.map((m, i) => (
            <Option key={m.id} selected={aiMode === m.id} onPress={() => { if (m.id !== aiMode) { setAiMode(m.id); toast.show(`Modalità ${m.title} attivata. Piano rigenerato.`, 'success'); } }} title={m.title} sub={m.sub} badgeText={aiMode === m.id ? 'ATTIVA' : undefined} badgeTone="green" last={i === AI_MODES.length - 1} />
          ))}
        </View>

        {/* Modalità motore */}
        <SectionTitle>Modalità motore</SectionTitle>
        <View style={[styles.group, shadows.card]}>
          {MODES.map((m, i) => (
            <Option key={m.id} selected={mode === m.id} onPress={() => pick(m.id)} title={m.title} sub={m.sub} prio={m.prio} badgeText={mode === m.id ? 'ATTIVA' : undefined} badgeTone="blue" last={i === MODES.length - 1} />
          ))}
        </View>
        <View style={[styles.noteCard, shadows.card]}>
          <Text style={styles.note}>La scelta è salvata in modo persistente e si applica a tutte le generazioni. Le 11 ore, il recupero post-notte, il limite di 6 giorni consecutivi e le esenzioni di ruolo del coordinatore restano vincoli non derogabili in entrambe le modalità.</Text>
        </View>

        {/* Matrice del mese */}
        <SectionTitle>Matrice del mese — {MONTHS[month]} {year}</SectionTitle>
        <Text style={[styles.note, { marginBottom: spacing.s, paddingHorizontal: 2 }]}>Gerarchia: matrice dell&apos;operatore → del reparto → del mese. La matrice mensile è usata solo dagli operatori (e reparti) senza matrice propria.</Text>
        <View style={[styles.group, shadows.card]}>
          <Option selected={meseSel === ''} onPress={() => { setMatriceMese(''); toast.show('Matrice mensile rimossa. Piano rigenerato.', 'success'); }} title="Nessuna (eredità operatore/reparto)" badgeText={meseSel === '' ? 'ATTIVA' : undefined} badgeTone="blue" last={catalogo.length === 0} />
          {catalogo.map((m, i) => (
            <Option key={m.id} selected={meseSel === m.id} onPress={() => { setMatriceMese(m.id); toast.show(`Matrice mensile: ${m.label}. Piano rigenerato.`, 'success'); }} title={m.label} sub={m.descrizione || undefined} badgeText={meseSel === m.id ? 'ATTIVA' : m.seq.join(' ')} badgeTone={meseSel === m.id ? 'blue' : 'muted'} last={i === catalogo.length - 1} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.l, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.pageTitle, color: colors.textPrimary, flex: 1 },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.h, marginBottom: spacing.l },
  group: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.l, marginBottom: spacing.l },
  optionRow: { paddingVertical: spacing.l, minHeight: 60, borderRadius: radius.smallCard, paddingHorizontal: spacing.s },
  optionDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { ...typography.body, fontWeight: '600', fontSize: 18, color: colors.textPrimary, flex: 1, marginRight: spacing.s },
  itemSub: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 18 },
  prio: { ...typography.caption, color: colors.textDisabled, marginTop: 3, fontWeight: '500' },
  badge: { ...typography.caption, fontWeight: '800', paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, minHeight: 60, paddingHorizontal: spacing.l, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, marginBottom: spacing.l },
  linkTxt: { ...typography.body, fontWeight: '600', fontSize: 18, color: colors.textPrimary, flex: 1 },
  noteCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.l },
  note: { ...typography.secondary, color: colors.textSecondary, lineHeight: 18 },
});
