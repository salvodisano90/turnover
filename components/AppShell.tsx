// components/AppShell.tsx — guscio comune: TopBar + contenuto. La bottom nav è globale (Tabs custom tabBar).
// Se l'utente ha impostato uno sfondo personalizzato, lo mostra dietro il contenuto (overlay/blur/oscuramento applicati).
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { colors as DZ } from '../design/colors';
import TopBar from './TopBar';

export default function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, background } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: DZ.bg }]}>
      {background && background.uri ? (
        <>
          <Image source={{ uri: background.uri }} style={StyleSheet.absoluteFill as any} blurRadius={(background.blur || 0) / 5} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill as any, { backgroundColor: `rgba(0,0,0,${(background.darken || 0) / 100})` }]} />
          <View style={[StyleSheet.absoluteFill as any, { backgroundColor: `rgba(13,13,18,${(background.overlay || 0) / 100})` }]} />
        </>
      ) : null}
      <TopBar title={title} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { flex: 1 } });
