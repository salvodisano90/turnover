import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FUNCTION_COLORS as FC } from '../utils/designSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppShell from '../components/AppShell';
import HubCard from '../components/HubCard';
import HubSection from '../components/HubSection';

export default function PianificazioneHubScreen() {
  const insets = useSafeAreaInsets();
  return (
    <AppShell title="Pianificazione">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <HubSection title="Turni" />
        <View style={styles.row}>
          <HubCard icon="sparkles-outline" title="Genera Turni" subtitle="Piano mensile automatico" onPress={() => router.push('/turni')} color={FC.generaTurni} />
          <HubCard icon="grid-outline" title="Matrici" subtitle="Cicli del personale" onPress={() => router.push('/matrici')} color={FC.matrici} />
        </View>
        <View style={styles.row}>
          <HubCard icon="sunny" title="Matrici Stagionali" subtitle="Cicli per stagione" onPress={() => router.push('/matrici-stagionali')} color={FC.matriciStagionali} />
          <HubCard icon="flask-outline" title="Simulatore" subtitle="Test scenario" onPress={() => router.push('/simulatore')} color={FC.simulatore} />
        </View>
        <View style={{ height: 24 }} />
        <HubSection title="Configurazione" />
        <HubCard icon="business-outline" title="Reparti" subtitle="Orari e copertura minima" onPress={() => router.push('/reparti')} color={FC.reparti} full />
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12, marginBottom: 12 } });
