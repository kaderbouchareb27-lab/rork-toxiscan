import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Lightbulb } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { DAILY_FACTS, getTodayFactIndex } from '@/mocks/scannerContent';
import { t } from '@/utils/i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 50;

export default function DailyFact() {
  const todayIndex = getTodayFactIndex();
  const [currentIndex, setCurrentIndex] = useState<number>(todayIndex);
  const translateX = useRef(new Animated.Value(0)).current;

  const animateSwipe = useCallback((direction: 'left' | 'right') => {
    const toValue = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    Animated.timing(translateX, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => {
        if (direction === 'left') {
          return (prev + 1) % DAILY_FACTS.length;
        }
        return (prev - 1 + DAILY_FACTS.length) % DAILY_FACTS.length;
      });
      translateX.setValue(direction === 'left' ? SCREEN_WIDTH * 0.3 : -SCREEN_WIDTH * 0.3);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderMove: (_evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          animateSwipe('left');
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          animateSwipe('right');
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const fact = DAILY_FACTS[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarBubble}>
          <Lightbulb color={Colors.primaryDark} size={22} strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>{t('daily_fact_title')}</Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.factContent, { transform: [{ translateX }] }]}
      >
        <Text style={styles.factText}>{fact.text}</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === 1 && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0ECE4',
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  avatarBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(45, 106, 79, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.45,
  },
  factContent: {
    minHeight: 52,
    justifyContent: 'center',
    paddingLeft: 72,
  },
  factText: {
    fontSize: 15,
    color: '#4D5350',
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD8CE',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 18,
    borderRadius: 4,
  },
});
