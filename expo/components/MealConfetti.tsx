import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

/**
 * A short, one-shot confetti burst shown ONLY on a perfect 10/10 meal result.
 * - Fires once when `active` becomes true, then unmounts itself (~1.5s).
 * - Fully disabled when the user has "Reduce Motion" enabled in iOS accessibility.
 */

const CONFETTI_COLORS = ['#2E9E34', '#EAB308', '#E8730A', '#22C55E', '#FACC15', '#4ADE80', '#F97316'] as const;
const PIECE_COUNT = 46;
const DURATION_MS = 1500;

interface ConfettiPiece {
  key: number;
  left: number;
  size: number;
  color: string;
  delay: number;
  drift: number;
  spins: number;
  progress: Animated.Value;
}

interface MealConfettiProps {
  active: boolean;
}

function MealConfetti({ active }: MealConfettiProps) {
  const { width, height } = Dimensions.get('window');
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const startedRef = useRef<boolean>(false);

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: PIECE_COUNT }).map((_, i) => ({
      key: i,
      left: Math.random() * width,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 220,
      drift: (Math.random() - 0.5) * 150,
      spins: (Math.random() - 0.5) * 6,
      progress: new Animated.Value(0),
    }));
  }, [width]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!active || reduceMotion || startedRef.current) return;
    startedRef.current = true;
    const animations = pieces.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration: DURATION_MS,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const group = Animated.parallel(animations);
    group.start(() => setFinished(true));
    return () => group.stop();
  }, [active, reduceMotion, pieces]);

  if (!active || reduceMotion || finished) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="meal-confetti">
      {pieces.map((p) => {
        const translateY = p.progress.interpolate({ inputRange: [0, 1], outputRange: [-40, height * 0.8] });
        const translateX = p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        const rotate = p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spins * 360}deg`] });
        const opacity = p.progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={p.key}
            style={{
              position: 'absolute',
              top: 0,
              left: p.left,
              width: p.size,
              height: p.size * 0.62,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

export default React.memo(MealConfetti);
