// components/PressableScale.tsx — pressione con micro-scala. FIX layout web: lo stile (width/flex/margini)
// va sul Pressable ESTERNO così la larghezza (es. 47.5%) si applica davvero; l'Animated.View interno
// si stira per riempire (alignSelf stretch + flexGrow), evitando card collassate a "pillola" sul web.
import React, { useRef } from 'react';
import { Animated, Easing, Pressable, ViewStyle } from 'react-native';
import { MOTION } from '../utils/designSystem';

interface Props { children: React.ReactNode; onPress?: () => void; style?: ViewStyle | ViewStyle[]; scaleTo?: number; durIn?: number; durOut?: number; disabled?: boolean; hitSlop?: number; }

export default function PressableScale({ children, onPress, style, scaleTo = MOTION.cardPress.scaleTo, durIn = MOTION.cardPress.durIn, durOut = MOTION.cardPress.durOut, disabled, hitSlop = 0 }: Props) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number, d: number) => Animated.timing(s, { toValue: v, duration: d, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(scaleTo, durIn)} onPressOut={() => to(1, durOut)} disabled={disabled} hitSlop={hitSlop} style={style}>
      <Animated.View style={{ transform: [{ scale: s }], alignSelf: 'stretch', flexGrow: 1 }}>{children}</Animated.View>
    </Pressable>
  );
}
