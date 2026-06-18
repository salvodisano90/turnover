// screens/BancaOreScreen.tsx — Banca ore (redesign). Valore principale grande + KPI + barra. Token /design.
// LOGICA INTATTA: hoursBank, ferieBalance, export CSV, filtro STAFF.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import CloseButton from '../components/CloseButton';
import { useStore } from '../hooks/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from '../components/EmptyState';
import { hoursBank } from '../services/hoursBank';
import { ferieBalance } from '../services/ferie';
import { shareOrDownloadText } from '../utils/platformShare';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

export default function BancaOreScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { ctx, currentPiano, year } = useStore();

  const rows = useMemo(() => hoursBank(ctx, currentPiano || {}), [ctx, currentPiano]);
  const ferie = useMemo(() => { const m: Record<string, number> = {}; ferieBalance(ctx.staff, ctx.ferie, year).forEach((f) => (m[f.infId] = f.residue)); return m; }, [ctx.staff, ctx.ferie, year]);

  const exportCsv = async () => {
    try {
      const head = 'Operatore;Ore contrattuali;Ore lavorate;Saldo;Straordinari;Debito;Notti;Festivi;Ferie residue';
      const body = rows.map((r) => [r.nome, r.oreContrattuali, r.oreLavorate, r.saldo, r.straordinari, r.debito, r.notti, r.festivi, ferie[r.infId] ?? ''].join(';')).join('\n');
      await shareOrDownloadText('banca-ore.csv', head + '\n' + body, 'text/csv');
      toast.show('Banca ore esportata (CSV)', 'success');
    } catch { toast.show('Export non riuscito su questo dispositivo', 'error'); }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgEco }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Banca ore</Text>
          <Text style={styles.subTitle}>Ore, straordinari, notti, festivi e ferie</Text>
        </View>
        <CloseButton />
      </View>
      {rows.length ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
          {true ? (
          <Pressable onPress={exportCsv} style={[styles.exportBtn, shadows.card]}>
            <Icon name="download-outline" size={20} color={colors.blue} /><Text style={styles.exportTxt}>Esporta CSV</Text>
          </Pressable>
          ) : null}
          {rows.map((r) => {
            const saldoPos = r.saldo >= 0;
            const pct = r.oreContrattuali > 0 ? Math.max(0, Math.min(100, Math.round((r.oreLavorate / r.oreContrattuali) * 100))) : 0;
            return (
              <View key={r.infId} style={[styles.card, shadows.card]}>
                {/* valore principale grande = saldo */}
                <View style={styles.head}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.nome} numberOfLines={2}>{r.nome}</Text>
                    <Text style={styles.headSub}>Saldo banca ore</Text>
                  </View>
                  <Text style={[styles.saldoBig, { color: saldoPos ? colors.green : colors.danger2 }]}>{saldoPos ? '+' : ''}{r.saldo}<Text style={styles.saldoUnit}>h</Text></Text>
                </View>

                {/* barra lavorate/contrattuali */}
                <View style={styles.barTop}>
                  <Text style={styles.barLabel}>Lavorate {r.oreLavorate}h / {r.oreContrattuali}h</Text>
                  <Text style={[styles.barPct, { color: pct > 100 ? colors.warning : colors.blue }]}>{pct}%</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: pct > 100 ? colors.warning : colors.blue }]} /></View>

                {/* mini KPI */}
                <View style={styles.grid}>
                  {([
                    ['Straordinari', `${r.straordinari}h`, colors.warning],
                    ['Debito', `${r.debito}h`, colors.danger2],
                    ['Notti', `${r.notti}`, colors.shiftNotte],
                    ['Festivi', `${r.festivi}`, colors.purple],
                    ['Ferie residue', `${ferie[r.infId] ?? '—'}`, colors.green],
                    ['Assenze', `${r.assenze}`, colors.textSecondary],
                  ] as [string, string, string][]).map(([k, val, c]) => (
                    <View key={k} style={styles.cell}>
                      <Text style={[styles.v, { color: c }]}>{val}</Text>
                      <Text style={styles.k}>{k}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : <EmptyState icon="time-outline" title="Nessun dato" desc="Aggiungi personale e genera i turni per vedere la banca ore." />}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subTitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  hBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco, marginBottom: spacing.l },
  exportTxt: { ...typography.body, fontWeight: '700', color: colors.blue },
  card: { borderRadius: radius.card, padding: spacing.l, marginBottom: spacing.l, backgroundColor: colors.cardEco, borderWidth: 1, borderColor: colors.borderEco },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.l },
  nome: { ...typography.cardTitle, color: colors.textPrimary },
  headSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  saldoBig: { fontSize: 34, fontWeight: '800' },
  saldoUnit: { fontSize: 18, fontWeight: '700' },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.s },
  barLabel: { ...typography.secondary, color: colors.textSecondary },
  barPct: { ...typography.secondary, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.borderEco, overflow: 'hidden', marginBottom: spacing.l },
  fill: { height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', paddingVertical: spacing.s },
  v: { ...typography.cardTitle, fontSize: 20, fontWeight: '800' },
  k: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
});
