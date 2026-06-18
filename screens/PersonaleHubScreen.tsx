import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FUNCTION_COLORS as FC } from '../utils/designSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import AppShell from '../components/AppShell';
import HubCard from '../components/HubCard';
import HubSection from '../components/HubSection';

export default function PersonaleHubScreen() {
  const insets = useSafeAreaInsets();
  return (
    <AppShell title="Personale">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <HubSection title="Gestione personale" />
        <View style={styles.row}>
          <HubCard icon="people-outline" title="Personale" subtitle="Anagrafica operatori" onPress={() => router.push('/personale-lista')} color={FC.personale} />
          <HubCard icon="sunny" title="Ferie e assenze" subtitle="Inserisci e gestisci" onPress={() => router.push('/ferie-wizard')} color={FC.ferie} />
        </View>
        <View style={styles.row}>
          <HubCard icon="heart" title="Desiderata" subtitle="Preferenze del personale" onPress={() => router.push('/desiderata')} color={FC.desiderata} />
        </View>
        <View style={{ height: 24 }} />
        <HubSection title="Disponibilità" />
        <View style={styles.row}>
          <HubCard icon="download-outline" title="Import Personale" subtitle="Import massivo" onPress={() => router.push('/import-personale')} color={FC.importPersonale} />
          <HubCard icon="call-outline" title="Reperibilità" subtitle="Pronta disponibilità" onPress={() => router.push('/reperibilita')} color={FC.reperibilita} />
        </View>
        <View style={{ height: 24 }} />
        <HubSection title="Strumenti" />
        <View style={styles.row}>
          <HubCard icon="git-compare-outline" title="Inverse" subtitle="Turni complementari di coppia" onPress={() => router.push('/inverted-matrix')} color={FC.desiderata} />
        </View>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12, marginBottom: 12 } });
