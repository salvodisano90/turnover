// components/FloatingBottomNavigation.tsx — Bottom Navigation V2 (Apple Music/Foto/App Store).
// SOLO ICONE (nessun testo). Glow circolare 48 dietro l'icona attiva, colore distinto per tab.
// Logica di navigazione, tab e permessi INVARIATA.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../hooks/useStore';
import { colors } from '../design/colors';
import { Icons } from '../design/icons';
import * as ExpoBlur from 'expo-blur';
const BlurView: any = (ExpoBlur as any) && (ExpoBlur as any).BlurView;

// icona + colore distinto per tab (spec V2)
const META: Record<string, { icon: keyof typeof Icons; color: string; badge?: 'pending' }> = {
  index:         { icon: 'home',          color: '#34C759' },
  pianificazione:{ icon: 'pianificazione', color: '#0A84FF' },
  personale:     { icon: 'personale',     color: '#64D2FF', badge: 'pending' },
  controllo:     { icon: 'controllo',     color: '#FF453A' },
  account:       { icon: 'profilo',       color: '#BF5AF2' },
};
const GLOW = 48;

export default function FloatingBottomNavigation({ state, descriptors, navigation }: any) {
  const pendingCount = 0;
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r: any) => META[r.name] && (descriptors[r.key]?.options as any)?.href !== null && true);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: (insets.bottom || 0) + 24 }]}>
      <View style={styles.bar}>
        {BlurView ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
        <View pointerEvents="none" style={styles.topEdge} />
        {routes.map((route: any) => {
          const focused = state.routes[state.index].key === route.key;
          const m = META[route.name];
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
          };
          return (
            <AnimatedTab key={route.key} focused={focused} color={m.color} onPress={onPress} icon={m.icon} badge={m.badge === 'pending' ? pendingCount : 0} />
          );
        })}
      </View>
    </View>
  );
}

function AnimatedTab({ focused, color, onPress, icon, badge = 0 }: { focused: boolean; color: string; onPress: () => void; icon: keyof typeof Icons; badge?: number }) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const glow = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1 : 0.9, damping: 14, stiffness: 220, mass: 0.7, useNativeDriver: true }),
      Animated.timing(glow, { toValue: focused ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [focused, scale, glow]);
  const IconCmp = Icons[icon];
  const tint = focused ? '#FFFFFF' : colors.textDisabled;
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: focused }}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.glow, { backgroundColor: color, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />
        <View style={styles.iconWrap}>
          <IconCmp size={24} color={tint} strokeWidth={2.25} />
          {badge > 0 ? <View style={styles.badge}><Text style={styles.badgeTxt}>{badge > 9 ? '9+' : badge}</Text></View> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 0, alignItems: 'stretch' },
  bar: { flexDirection: 'row', height: 72, borderRadius: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(30,30,30,0.72)', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 40, elevation: 20 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 72 },
  glow: { position: 'absolute', width: GLOW, height: GLOW, borderRadius: GLOW / 2 },
  iconWrap: { width: GLOW, height: GLOW, alignItems: 'center', justifyContent: 'center' },
  topEdge: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
});
