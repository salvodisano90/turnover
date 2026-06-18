// components/HubSection.tsx — titolo sezione HIG: 13/700 uppercase, colore secondario.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../design/colors';

export default function HubSection({ title }: { title: string }) {
  return <Text style={[styles.t, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>;
}
const styles = StyleSheet.create({ t: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4, marginBottom: 12 } });
