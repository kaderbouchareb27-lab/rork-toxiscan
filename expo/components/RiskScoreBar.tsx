import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Animated as RNAnimated } from 'react-native';
import { Activity } from 'lucide-react-native';
import { t } from '@/utils/i18n';

interface RiskLevel {
  color: string;
  label: string;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return { color: '#4CD964', label: t('risk_low') };
  if (score <= 40) return { color: '#2E9E34', label: t('risk_limited') };
  if (score <= 60) return { color: '#FF9500', label: t('risk_moderate') };
  if (score <= 80) return { color: '#FF6B35', label: t('risk_high') };
  return { color: '#FF3B30', label: t('risk_very_high') };
}

export default function RiskScoreBar({ score }: { score: number }) {
  const animRef = useRef(new RNAnimated.Value(0));
  const level = getRiskLevel(score);

  useEffect(() => {
    RNAnimated.timing(animRef.current, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const widthInterpolation = animRef.current.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} testID="risk-score-block">
      <View style={styles.titleRow}>
        <Activity color={level.color} size={18} />
        <Text style={styles.title}>{t('risk_score_title')}</Text>
      </View>
      <View style={styles.scoreRow}>
        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <RNAnimated.View
              style={[
                styles.barFill,
                { width: widthInterpolation, backgroundColor: level.color },
              ]}
            />
          </View>
        </View>
        <Text style={[styles.scoreValue, { color: level.color }]}>{score}</Text>
      </View>
      <Text style={styles.levelLabel}>{level.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1C1E',
    letterSpacing: -0.2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  barContainer: {
    flex: 1,
  },
  barTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F0F1F4',
    overflow: 'hidden' as const,
  },
  barFill: {
    height: 14,
    borderRadius: 7,
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: '800' as const,
    minWidth: 48,
    textAlign: 'right' as const,
    letterSpacing: -1,
  },
  levelLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 12,
    fontWeight: '500' as const,
  },
});
