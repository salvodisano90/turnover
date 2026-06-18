// screens/PersonalizzazioneScreen.tsx — Personalizzazione (Apple Liquid Glass). 7 temi + sfondo immagine.
// I 7 temi sono applicati via useAppTheme().setThemeId → applyTheme() su /design/colors + rimonta albero.
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Icon from '../components/Icon';
import BackButton from '../components/BackButton';
import GlassCard from '../components/GlassCard';
import PressableScale from '../components/PressableScale';
import { useTheme } from '../hooks/useTheme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useToast } from '../hooks/useToast';
import { THEMES, ThemeDef } from '../design/themes';
import { TEXT_LABEL, CARD_LABEL, DENSITY_LABEL } from '../design/accessibility';
import { colors } from '../design/colors';
import { spacing } from '../design/spacing';
import { radius } from '../design/radius';
import { typography } from '../design/typography';

// mini anteprima del tema: barra + 2 tile + pill accent
function ThemePreview({ t }: { t: ThemeDef }) {
  return (
    <View style={[styles.preview, { backgroundColor: t.bg }]}>
      <View style={styles.previewRow}>
        <View style={[styles.previewTile, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.previewTile, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      </View>
      <View style={[styles.previewBar, { backgroundColor: t.accent }]} />
      <View style={styles.previewDots}>
        <View style={[styles.previewDot, { backgroundColor: t.accent }]} />
        <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
        <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
      </View>
    </View>
  );
}

export default function PersonalizzazioneScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { background, setBackground } = useTheme();
  const { themeId, setThemeId, a11y, setTextSize, setCardSize, setDensity } = useAppTheme();
  const bg = background;

  const updateBg = (patch: any) => { if (bg) setBackground({ ...bg, ...patch }); };
  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { toast.show('Permesso galleria negato', 'warning'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) { setBackground({ uri: res.assets[0].uri, overlay: 40, blur: 20, darken: 30 }); toast.show('Sfondo impostato', 'success'); }
    } catch { toast.show('Impossibile aprire la galleria', 'error'); }
  };

  const apply = (t: ThemeDef) => { setThemeId(t.id); toast.show(`Tema ${t.name} applicato`, 'success'); };

  const Slider = ({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) => (
    <View style={styles.slider}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderCtrl}>
        <Pressable onPress={onMinus} style={styles.sliderBtn}><Icon name="remove" size={18} color={colors.textPrimary} /></Pressable>
        <Text style={styles.sliderVal}>{value}%</Text>
        <Pressable onPress={onPlus} style={styles.sliderBtn}><Icon name="add" size={18} color={colors.textPrimary} /></Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.s }]}>
        <BackButton />
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Aspetto</Text><Text style={styles.subtitle}>Temi e sfondo</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Tema</Text>
        <View style={styles.grid}>
          {THEMES.map((t) => {
            const on = themeId === t.id;
            return (
              <PressableScale key={t.id} onPress={() => apply(t)} style={styles.cell}>
                <View style={[styles.themeCard, { borderColor: on ? t.accent : colors.border, borderWidth: on ? 2 : 1 }]}>
                  <ThemePreview t={t} />
                  <View style={styles.themeFoot}>
                    <Text style={styles.themeName}>{t.name}</Text>
                    {on ? <View style={[styles.check, { backgroundColor: t.accent }]}><Icon name="checkmark" size={13} color="#fff" /></View> : <View style={[styles.swatch, { backgroundColor: t.accent }]} />}
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </View>

        <Text style={[styles.section, { marginTop: spacing.h }]}>Accessibilità</Text>
        <GlassCard style={{ marginBottom: spacing.l }}>
          <Text style={styles.a11yLabel}>Dimensione testo</Text>
          <View style={styles.segRow}>
            {(['xs', 's', 'm', 'l', 'xl'] as const).map((v) => {
              const on = a11y.textSize === v;
              return <Pressable key={v} onPress={() => setTextSize(v)} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{TEXT_LABEL[v]}</Text></Pressable>;
            })}
          </View>
          <Text style={[styles.a11yLabel, { marginTop: spacing.l }]}>Dimensione card</Text>
          <View style={styles.segRow}>
            {(['compact', 'normal', 'wide'] as const).map((v) => {
              const on = a11y.cardSize === v;
              return <Pressable key={v} onPress={() => setCardSize(v)} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{CARD_LABEL[v]}</Text></Pressable>;
            })}
          </View>
          <Text style={[styles.a11yLabel, { marginTop: spacing.l }]}>Densità interfaccia</Text>
          <View style={styles.segRow}>
            {(['high', 'medium', 'low'] as const).map((v) => {
              const on = a11y.density === v;
              return <Pressable key={v} onPress={() => setDensity(v)} style={[styles.seg, on && { backgroundColor: colors.blue }]}><Text style={[styles.segTxt, on && { color: '#fff' }]} numberOfLines={1}>{DENSITY_LABEL[v]}</Text></Pressable>;
            })}
          </View>
        </GlassCard>

        <Text style={[styles.section, { marginTop: spacing.h }]}>Sfondo personalizzato</Text>
        {bg ? (
          <View style={[styles.bgPreview, { borderColor: colors.border }]}>
            <Image source={{ uri: bg.uri }} style={StyleSheet.absoluteFill as any} blurRadius={bg.blur / 5} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFill as any, { backgroundColor: `rgba(0,0,0,${bg.darken / 100})` }]} />
            <Text style={styles.bgPreviewTxt}>Anteprima sfondo</Text>
          </View>
        ) : null}
        {bg ? (
          <GlassCard style={{ marginTop: spacing.m }}>
            <Slider label="Opacità overlay" value={bg.overlay} onMinus={() => updateBg({ overlay: Math.max(0, bg.overlay - 10) })} onPlus={() => updateBg({ overlay: Math.min(100, bg.overlay + 10) })} />
            <Slider label="Sfocatura" value={bg.blur} onMinus={() => updateBg({ blur: Math.max(0, bg.blur - 10) })} onPlus={() => updateBg({ blur: Math.min(100, bg.blur + 10) })} />
            <Slider label="Oscuramento" value={bg.darken} onMinus={() => updateBg({ darken: Math.max(0, bg.darken - 10) })} onPlus={() => updateBg({ darken: Math.min(80, bg.darken + 10) })} />
          </GlassCard>
        ) : null}
        <View style={styles.bgBtns}>
          <Pressable onPress={pickImage} style={[styles.bgBtn, { backgroundColor: colors.blue }]}>
            <Icon name="image-outline" size={18} color="#FFF" /><Text style={styles.bgBtnTxt}>{bg ? 'Cambia immagine' : 'Scegli dalla galleria'}</Text>
          </Pressable>
          {bg ? (
            <Pressable onPress={() => { setBackground(null); toast.show('Sfondo rimosso', 'success'); }} style={[styles.bgBtn, { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border }]}>
              <Icon name="trash-outline" size={18} color={colors.red} /><Text style={[styles.bgBtnTxt, { color: colors.red }]}>Rimuovi</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.note}>Il tema si applica subito a tutta l'app e resta salvato dopo il riavvio.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: spacing.xxl, paddingBottom: spacing.s, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { ...typography.pageTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textDisabled, marginTop: 2 },
  section: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.m },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.l },
  cell: { width: '47.5%' },
  themeCard: { borderRadius: radius.card, padding: spacing.m, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
  preview: { height: 140, borderRadius: radius.smallCard, padding: spacing.l, justifyContent: 'space-between', overflow: 'hidden' },
  previewRow: { flexDirection: 'row', gap: spacing.s },
  previewTile: { flex: 1, height: 38, borderRadius: 12 },
  previewBar: { height: 16, borderRadius: 8, width: '65%' },
  previewDots: { flexDirection: 'row', gap: 6 },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  themeFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.s, paddingTop: spacing.m, paddingBottom: spacing.xs },
  themeName: { ...typography.cardTitle, fontWeight: '700', color: colors.textPrimary },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  bgPreview: { height: 120, borderRadius: radius.card, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  bgPreviewTxt: { ...typography.secondary, fontWeight: '700', color: '#fff' },
  slider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.s },
  sliderLabel: { ...typography.secondary, color: colors.textSecondary },
  sliderCtrl: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center' },
  sliderVal: { ...typography.body, fontWeight: '700', color: colors.textPrimary, minWidth: 48, textAlign: 'center' },
  bgBtns: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  bgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, height: 52, borderRadius: radius.button },
  bgBtnTxt: { ...typography.body, fontWeight: '700', color: '#FFF' },
  note: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.l, lineHeight: 18 },
  a11yLabel: { ...typography.secondary, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.s },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  seg: { flexGrow: 1, minWidth: 64, paddingVertical: spacing.s, paddingHorizontal: spacing.m, borderRadius: radius.pill, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center' },
  segTxt: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
});
