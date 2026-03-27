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
import { Image as RNImage } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { DAILY_FACTS, getTodayFactIndex } from '@/mocks/scannerContent';

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
          <RNImage
            source={{ uri: 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png' }}
            style={styles.avatarImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerTitle}>Le saviez-vous ?</Text>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  avatarBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  factContent: {
    minHeight: 40,
    justifyContent: 'center',
  },
  factText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E0E0E5',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 14,
    borderRadius: 3,
  },
});
