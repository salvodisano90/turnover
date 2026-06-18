// screens/AssistenteScreen.tsx — Assistente (redesign). Token /design.
// LOGICA INTATTA: aiQueries (OPERATIONAL/CONTRACT/CATEGORIES/quickQuestions/questionsByCategory), assistantQuery, ricerca/categorie/analisi/chat.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import { useStore } from '../hooks/useStore';
import { assistantQuery } from '../services/engine';
import { AIQueryCtx, AIQueryResult, CATEGORIES, CONTRACT_QUESTIONS, OPERATIONAL_QUESTIONS, questionsByCategory, quickQuestions } from '../services/aiQueries';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';

export default function AssistenteScreen() {
  const insets = useSafeAreaInsets();
  const { ctx, currentPiano } = useStore();
  const qc: AIQueryCtx = useMemo(() => ({ staff: ctx.staff, piano: currentPiano, year: ctx.year, month: ctx.month, rep: {}, ferie: ctx.ferie }), [ctx, currentPiano]);

  const [search, setSearch] = useState('');
  const [result, setResult] = useState<AIQueryResult | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{ q: string; a: string }[]>([]);

  const allOps = OPERATIONAL_QUESTIONS;
  const filtered = search.trim() ? allOps.filter((q) => q.testo.toLowerCase().includes(search.toLowerCase())) : [];
  const runQuestion = (id: string) => { const q = allOps.find((x) => x.id === id); if (!q) return; setResult(q.run(qc)); };
  const askChat = () => { const t = chatInput.trim(); if (!t) return; const a = assistantQuery(ctx, currentPiano, t); setChatLog((l) => [...l, { q: t, a: (a as any).answer || 'Nessuna risposta disponibile.' }]); setChatInput(''); };

  const ResultCard = ({ r }: { r: AIQueryResult }) => (
    <View style={[styles.result, shadows.card]}>
      <Text style={styles.rTitle}>{r.titolo}</Text>
      <Text style={styles.rValue}>{r.risultato}</Text>
      <Text style={styles.rExpl}>{r.spiegazione}</Text>
      {r.criticita ? <View style={[styles.rTag, { backgroundColor: 'rgba(255,107,107,0.15)' }]}><Text style={[styles.rTagTxt, { color: colors.danger2 }]}>⚠ {r.criticita}</Text></View> : null}
      {r.suggerimento ? <Text style={styles.rSugg}>{r.suggerimento}</Text> : null}
      {r.azione ? (
        <Pressable onPress={() => r.azione?.route && router.push(r.azione.route as any)} style={[styles.rAction, { backgroundColor: 'rgba(88,204,255,0.15)' }]}>
          <Text style={[styles.rActionTxt, { color: colors.blue }]}>{r.azione.label}</Text><Icon name="arrow-forward" size={16} color={colors.blue} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bgEco }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Assistente</Text>
          <Text style={styles.sub}>Analizza turni, personale, copertura e criticità.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ricerca */}
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.textDisabled} />
          <TextInput style={styles.searchInput} placeholder="Cerca una domanda…" placeholderTextColor={colors.textDisabled} value={search} onChangeText={setSearch} />
          {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Icon name="close" size={18} color={colors.textDisabled} /></Pressable> : null}
        </View>

        {result ? <ResultCard r={result} /> : null}

        {filtered.length ? (
          <View style={{ marginTop: spacing.s }}>
            {filtered.slice(0, 12).map((q) => (
              <Pressable key={q.id} onPress={() => { runQuestion(q.id); setSearch(''); }} style={styles.searchRow}>
                <Icon name="help-circle-outline" size={18} color={colors.blue} /><Text style={styles.searchRowTxt}>{q.testo}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!search ? (<>
          <Text style={styles.section}>DOMANDE RAPIDE</Text>
          <View style={styles.grid}>
            {quickQuestions().map((q) => (
              <Pressable key={q.id} onPress={() => runQuestion(q.id)} style={[styles.quickCard, shadows.card]}><Text style={styles.quickTxt} numberOfLines={2}>{q.testo}</Text></Pressable>
            ))}
          </View>

          <Text style={[styles.section, { marginTop: spacing.xxl }]}>CATEGORIE</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => {
              const n = c.key === 'contratti' ? CONTRACT_QUESTIONS.length : questionsByCategory(c.key).length;
              const on = openCat === c.key;
              return (
                <Pressable key={c.key} onPress={() => setOpenCat(on ? null : c.key)} style={[styles.catChip, { backgroundColor: on ? 'rgba(88,204,255,0.15)' : colors.cardEco, borderColor: on ? colors.blue : colors.borderEco }]}>
                  <Text style={[styles.catTxt, { color: on ? colors.blue : colors.textPrimary }]}>{c.label}</Text>
                  {n ? <Text style={styles.catN}>{n}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {openCat ? (
            <View style={{ marginTop: spacing.m }}>
              {openCat === 'contratti'
                ? CONTRACT_QUESTIONS.map((q) => (
                    <Pressable key={q.id} onPress={() => setResult({ titolo: q.testo, risultato: 'Riferimento normativo', spiegazione: q.riferimento })} style={styles.qRow}><Text style={styles.qRowTxt}>{q.testo}</Text><Icon name="chevron-forward" size={16} color={colors.textDisabled} /></Pressable>
                  ))
                : questionsByCategory(openCat as any).map((q) => (
                    <Pressable key={q.id} onPress={() => runQuestion(q.id)} style={styles.qRow}><Text style={styles.qRowTxt}>{q.testo}</Text><Icon name="chevron-forward" size={16} color={colors.textDisabled} /></Pressable>
                  ))}
              {openCat !== 'contratti' && !questionsByCategory(openCat as any).length ? <Text style={styles.empty}>Analisi in arrivo per questa categoria.</Text> : null}
            </View>
          ) : null}

          <Text style={[styles.section, { marginTop: spacing.xxl }]}>ANALISI AUTOMATICHE</Text>
          <View style={styles.grid}>
            {[['Analizza equità', 't_equi_min'], ['Analizza carico', 't_carico_max'], ['Analizza notti', 't_notti_max'], ['Analizza assenze', 'a_ferie']].map(([label, id]) => (
              <Pressable key={id} onPress={() => runQuestion(id)} style={[styles.analyzeCard, shadows.card]}><Icon name="analytics-outline" size={20} color={colors.blue} /><Text style={styles.analyzeTxt}>{label}</Text></Pressable>
            ))}
          </View>

          <Pressable onPress={() => setChatOpen((o) => !o)} style={[styles.chatToggle, { marginTop: spacing.xxl }]}>
            <Icon name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} /><Text style={styles.chatToggleTxt}>Fai una domanda personalizzata</Text><Icon name={chatOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDisabled} />
          </Pressable>
          {chatOpen ? (
            <View style={{ marginTop: spacing.m }}>
              {chatLog.map((m, i) => (
                <View key={i} style={{ marginBottom: spacing.m }}>
                  <View style={[styles.bubbleQ, { backgroundColor: colors.blue }]}><Text style={styles.bubbleQTxt}>{m.q}</Text></View>
                  <View style={styles.bubbleA}><Text style={{ color: colors.textPrimary }}>{m.a}</Text></View>
                </View>
              ))}
              <View style={styles.chatInputBar}>
                <TextInput style={styles.chatInput} placeholder="Scrivi una domanda…" placeholderTextColor={colors.textDisabled} value={chatInput} onChangeText={setChatInput} onSubmitEditing={askChat} returnKeyType="send" />
                <Pressable onPress={askChat} hitSlop={8} style={[styles.chatSend, { backgroundColor: colors.blue }]}><Icon name="arrow-up" size={18} color="#08141E" /></Pressable>
              </View>
            </View>
          ) : null}
        </>) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 64, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { ...typography.pageTitle, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  searchBar: { height: 52, borderRadius: radius.pill + 10, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingHorizontal: spacing.l, marginBottom: spacing.s },
  searchInput: { flex: 1, fontSize: 17, color: colors.textPrimary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.borderEco },
  searchRowTxt: { ...typography.secondary, color: colors.textPrimary, flex: 1 },
  section: { ...typography.caption, fontWeight: '700', letterSpacing: 0.6, color: colors.textSecondary, marginTop: spacing.xxl, marginBottom: spacing.m },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  quickCard: { width: '47.5%', minHeight: 64, borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, padding: spacing.l, justifyContent: 'center' },
  quickTxt: { ...typography.secondary, fontWeight: '600', color: colors.textPrimary },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.l, height: 40, borderRadius: radius.pill, borderWidth: 1.5 },
  catTxt: { ...typography.secondary, fontWeight: '600' },
  catN: { ...typography.caption, color: colors.textSecondary },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.l, borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, marginBottom: spacing.s },
  qRowTxt: { ...typography.secondary, color: colors.textPrimary, flex: 1, marginRight: spacing.s },
  empty: { ...typography.caption, fontStyle: 'italic', color: colors.textDisabled, padding: spacing.m },
  analyzeCard: { width: '47.5%', borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, padding: spacing.l, gap: spacing.s },
  analyzeTxt: { ...typography.secondary, fontWeight: '600', color: colors.textPrimary },
  result: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, padding: spacing.l, marginTop: spacing.s, marginBottom: spacing.s },
  rTitle: { ...typography.cardTitle, fontWeight: '600', color: colors.textPrimary },
  rValue: { fontSize: 22, fontWeight: '700', color: colors.blue, marginTop: 6 },
  rExpl: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.s, lineHeight: 21 },
  rTag: { alignSelf: 'flex-start', borderRadius: radius.smallCard, paddingHorizontal: spacing.m, paddingVertical: spacing.s, marginTop: spacing.m },
  rTagTxt: { ...typography.caption, fontWeight: '600' },
  rSugg: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.m, lineHeight: 19 },
  rAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, height: 44, borderRadius: radius.button, marginTop: spacing.m },
  rActionTxt: { ...typography.secondary, fontWeight: '600' },
  chatToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, height: 52, borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, paddingHorizontal: spacing.l },
  chatToggleTxt: { flex: 1, ...typography.secondary, fontWeight: '600', color: colors.textPrimary },
  bubbleQ: { alignSelf: 'flex-end', maxWidth: '85%', borderRadius: radius.smallCard, paddingHorizontal: spacing.l, paddingVertical: spacing.m, marginBottom: 6 },
  bubbleQTxt: { color: '#08141E', fontSize: 15, fontWeight: '600' },
  bubbleA: { alignSelf: 'flex-start', maxWidth: '90%', borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, padding: spacing.l },
  chatInputBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, borderRadius: radius.smallCard, borderWidth: 1, borderColor: colors.borderEco, backgroundColor: colors.cardEco, paddingLeft: spacing.l, paddingRight: spacing.s, paddingVertical: spacing.s, marginTop: spacing.s },
  chatInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  chatSend: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
