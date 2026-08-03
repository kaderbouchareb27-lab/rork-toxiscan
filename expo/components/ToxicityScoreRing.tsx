import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { MealTier } from '@/utils/mealAnalysis';
import { MEAL_TIER_COLORS, MEAL_TIER_SOFT } from '@/constants/mealAvatars';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number;
  tier: MealTier;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
}

/**
 * Animated /10 toxicity ring. The sweep + the number animate whenever `score`
 * changes — so on the confirmation screen the user literally watches the score
 * move as they add or remove ingredients (spec §3).
 */
export default function ToxicityScoreRing({ score, tier, size = 168, stroke = 14, label, caption }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState<number>(0);
  const color = MEAL_TIER_COLORS[tier];
  const clamped = Math.max(0, Math.min(10, score));

  useEffect(() => {
    const id = progress.addListener(({ value }) => setDisplay(Math.round(value * 10)));
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped / 10,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={MEAL_TIER_SOFT[tier]}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <View style={styles.scoreRow}>
          <Text style={[styles.score, { color }]}>{display}</Text>
          <Text style={styles.outOf}>/10</Text>
        </View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {caption ? <Text style={[styles.caption, { color }]} numberOfLines={1}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 52,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  outOf: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#9AA39E',
    marginLeft: 2,
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#6B7069',
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  caption: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
});
