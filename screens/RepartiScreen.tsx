// screens/RepartiScreen.tsx — Reparti (redesign). Card premium sui token /design.
// LOGICA INTATTA: computeCoverage, getActiveMatrice/repartoMatriceMode/nextMatriceChange, removeReparto, ManageSheet.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { confirmAction } from '../utils/confirm';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import ManageSheet from '../components/ManageSheet';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import { TURNI, MATRICI } from '../utils/constants';
import { getMx, secCode } from '../utils/helpers';
import { getActiveMatrice, repartoMatriceMode, nextMatriceChange } from '../services/matriceResolver';
import { computeCoverage } from '../services/engine';
import { Turno } from '../types';
import EmptyState from '../components/EmptyState';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

const SHIFT_COLOR: Record<string, string> = { M: colors.shiftMattina, P: colors.shiftPomeriggio, N: colors.shiftNotte };
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
// colori icona reparto deterministici (token)
const REP_COLORS = [colors.blue, colors.green, colors.purple, colors.warning, colors.teal, colors.danger2];

export default function RepartiScreen() {
  const [manage, setManage] = useState<{ id: string; nome: string } | null>(null);
  const router = useRouter();
  const toast = useToast();
  const { reparti, removeReparto, matriciCustom, ctx, currentPiano } = useStore();
  const allMat = [...MATRICI, ...matriciCustom];
  const coverage = useMemo(() => { try { return computeCoverage(ctx, currentPiano || {}); } catch { return null; } }, [ctx, currentPiano]);
  const repPct = (id: string): number | null => {
    const rc = coverage && coverage.byRep && coverage.byRep[id];
    if (!rc || !rc.slots || !rc.slots.length) return null;
    const tot = rc.slots.reduce((a: number, sl: any) => a + (sl.total || 0), 0);
    const cov = rc.slots.reduce((a: number, sl: any) => a + (sl.covered || 0), 0);
    return tot ? Math.round((cov / tot) * 100) : null;
  };

  const confirmRemove = (id: string, nome: string) => {
    confirmAction('Rimuovere reparto', `Eliminare il reparto ${nome}?`, () => { removeReparto(id); toast.show(`Reparto ${nome} rimosso`, 'success'); }, 'Rimuovi');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bgEco }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Reparti</Text>
          <Text style={styles.subTitle}>{reparti.length} reparti configurati</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => router.push('/reparto-wizard')} style={[styles.hBtn, { backgroundColor: colors.blue }]}><Icon name="add" size={24} color="#08141E" /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!reparti.length ? (
          <EmptyState icon="business-outline" title="Nessun reparto" desc="Crea il primo reparto con settori, orari e matrice di copertura." actionLabel="Crea reparto" onAction={() => router.push('/reparto-wizard')} />
        ) : (
          reparti.map((r, i) => {
            const mx = getMx(r.matrice);
            const tags: { code: string; turn: Turno }[] = [];
            (['M', 'P', 'N'] as Turno[]).forEach((t) => { for (let sn = 1; sn <= (r.settori[t as 'M' | 'P' | 'N'] || 0); sn++) tags.push({ code: secCode(t, r.sigla, sn), turn: t }); });
            const mode = repartoMatriceMode(r);
            const today = new Date();
            const active = getActiveMatrice(r, allMat, today.getMonth(), today.getDate());
            const modeLabel = mode === 'standard' ? 'Standard' : mode === 'custom' ? 'Personalizzata' : 'Stagionale';
            const change = mode === 'seasonal' ? nextMatriceChange(r, today.getMonth(), today.getDate()) : null;
            const pc = repPct(r.id);
            const pcTone = pc === null ? colors.textDisabled : pc >= 90 ? colors.green : pc >= 70 ? colors.warning : colors.danger2;
            return (
              <View key={r.id} style={[styles.card, shadows.card]}>
                {/* header card: icona + nome + stato copertura */}
                <View style={styles.cardHead}>
                  <View style={[styles.repIcon, { backgroundColor: REP_COLORS[i % REP_COLORS.length] }]}><Text style={styles.repIconTxt}>{r.sigla}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={2}>{r.nome}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{modeLabel} · {active ? active.label : (mx ? mx.label : '–')}</Text>
                  </View>
                  {pc !== null ? (
                    <View style={[styles.covBadge, { backgroundColor: pcTone + '22' }]}>
                      <Text style={[styles.covBadgeTxt, { color: pcTone }]}>{pc}%</Text>
                    </View>
                  ) : null}
                </View>

                {/* barra copertura immediata */}
                {pc !== null ? (
                  <View style={styles.covTrack}><View style={[styles.covFill, { width: `${Math.max(0, Math.min(100, pc))}%`, backgroundColor: pcTone }]} /></View>
                ) : null}

                {/* orari per turno */}
                <View style={styles.statsRow}>
                  {(['M', 'P', 'N'] as ('M' | 'P' | 'N')[]).map((t) => (
                    <View key={t} style={styles.statChip}>
                      <View style={[styles.statDot, { backgroundColor: SHIFT_COLOR[t] }]} />
                      <Text style={styles.statTxt}><Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t}×{r.settori[t]}</Text> {r.orari[t].s}–{r.orari[t].e}</Text>
                    </View>
                  ))}
                </View>

                {/* prossimo cambio (stagionale) */}
                {mode === 'seasonal' && change ? (
                  <Text style={styles.seasonNote}>Prossimo cambio: {change.day} {MM[change.month0]} → {(allMat.find((m) => m.id === change.matriceId)?.label) || '—'}</Text>
                ) : null}

                {/* settori come tag colorati */}
                <View style={styles.tags}>
                  {tags.map((tg) => (
                    <Text key={tg.code} style={[styles.tag, { color: SHIFT_COLOR[tg.turn], backgroundColor: SHIFT_COLOR[tg.turn] + '22' }]}>{tg.code}</Text>
                  ))}
                </View>

                <Pressable onPress={() => setManage({ id: r.id, nome: r.nome })} style={styles.manageBtn}>
                  <Icon name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
                  <Text style={styles.manageTxt}>Gestisci</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
      <ManageSheet
        visible={!!manage}
        title="Gestisci reparto"
        subtitle={manage?.nome}
        actions={manage ? [
          { icon: 'create-outline', title: 'Modifica reparto', subtitle: 'Modifica nome, sigla, turni o matrice', onPress: () => router.push({ pathname: '/reparto-wizard', params: { id: manage.id } }) },
          { icon: 'trash-outline', title: 'Elimina reparto', subtitle: 'Rimuovi il reparto e tutte le sue impostazioni', destructive: true, onPress: () => confirmRemove(manage.id, manage.nome) },
        ] : []}
        onClose={() => setManage(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingTop: spacing.s, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subTitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  hBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 120, gap: spacing.l },
  card: { minHeight: 140, borderRadius: radius.card, padding: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.m },
  repIcon: { width: 48, height: 48, borderRadius: radius.smallCard, alignItems: 'center', justifyContent: 'center' },
  repIconTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  name: { ...typography.cardTitle, color: colors.textPrimary },
  sub: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  covBadge: { paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: 12 },
  covBadgeTxt: { ...typography.body, fontWeight: '800' },
  covTrack: { height: 8, borderRadius: 4, backgroundColor: colors.borderEco, overflow: 'hidden', marginBottom: spacing.m },
  covFill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, marginBottom: spacing.m },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statTxt: { ...typography.caption, color: colors.textSecondary },
  seasonNote: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.m },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.m },
  tag: { ...typography.caption, fontWeight: '700', paddingHorizontal: spacing.s, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 44, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderEco },
  manageTxt: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
});
