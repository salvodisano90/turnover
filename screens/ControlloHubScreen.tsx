import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FUNCTION_COLORS as FC } from '../utils/designSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppShell from '../components/AppShell';
import HubCard from '../components/HubCard';
import HubSection from '../components/HubSection';

export default function ControlloHubScreen() {
  const insets = useSafeAreaInsets();
  return (
    <AppShell title="Controllo">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <HubSection title="Monitoraggio" />
        <View style={styles.row}>
          <HubCard icon="alert-circle-outline" title="Centro Criticità" subtitle="Scoperture e problemi" onPress={() => router.push('/centro-criticita')} color={FC.criticita} />
          <HubCard icon="stats-chart-outline" title="Dashboard Direzione" subtitle="KPI e performance" onPress={() => router.push('/direzione')} color={FC.direzione} />
        </View>
        <View style={{ height: 24 }} />
        <HubSection title="Gestione risorse" />
        <View style={styles.row}>
          <HubCard icon="time-outline" title="Banca Ore" subtitle="Straordinari e residui" onPress={() => router.push('/banca-ore')} color={FC.bancaOre} />
          <HubCard icon="list-outline" title="Postazioni" subtitle="Copertura e fabbisogni" onPress={() => router.push('/postazioni')} color={FC.postazioni} />
        </View>
        <View style={{ height: 24 }} />
        <HubSection title="Analisi e report" />
        <View style={styles.row}>
          <HubCard icon="pulse" title="Copertura" subtitle="Andamento del mese" onPress={() => router.push('/copertura')} color={FC.copertura} />
          <HubCard icon="save-outline" title="Report / Export" subtitle="PDF ed Excel" onPress={() => router.push('/direzione')} color={FC.direzione} />
        </View>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12, marginBottom: 12 } });
