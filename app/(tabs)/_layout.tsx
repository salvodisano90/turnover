// app/(tabs)/_layout.tsx — 5 tab con bottom navigation flottante custom (no tab Expo standard).
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingBottomNavigation from '../../components/FloatingBottomNavigation';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingBottomNavigation {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="pianificazione" />
      <Tabs.Screen name="personale" />
      <Tabs.Screen name="controllo" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
