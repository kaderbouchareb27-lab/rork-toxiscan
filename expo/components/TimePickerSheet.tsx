import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t } from '@/utils/i18n';

const ITEM_HEIGHT = 46;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const CENTER_OFFSET = Math.floor(VISIBLE_ROWS / 2);

const HOURS: number[] = Array.from({ length: 24 }, (_, i) => i);
const MINUTES: number[] = Array.from({ length: 12 }, (_, i) => i * 5);

interface Props {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  onCancel: () => void;
  onConfirm: (hour: number, minute: number) => void;
}

interface WheelProps {
  values: number[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  testID?: string;
}

function Wheel({ values, selectedIndex, onIndexChange, testID }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastIndexRef = useRef<number>(selectedIndex);

  useEffect(() => {
    // Position the wheel on the selected value when (re)opened.
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clampIndex = useCallback((raw: number): number => {
    return Math.max(0, Math.min(values.length - 1, raw));
  }, [values.length]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = clampIndex(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT));
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      onIndexChange(idx);
    }
  }, [clampIndex, onIndexChange]);

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = clampIndex(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT));
    lastIndexRef.current = idx;
    onIndexChange(idx);
  }, [clampIndex, onIndexChange]);

  return (
    <View style={styles.wheel}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * CENTER_OFFSET }}
        testID={testID}
      >
        {values.map((v, i) => {
          const isSelected = i === selectedIndex;
          return (
            <View key={v} style={styles.wheelItem}>
              <Text style={[styles.wheelText, isSelected ? styles.wheelTextSelected : styles.wheelTextDim]}>
                {v.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Premium self-contained time picker (no native module). Two snapping wheels for the
 * hour and minute, used to let the user pick the exact time of each meal reminder.
 * Works on iOS, Android and web.
 */
export default function TimePickerSheet({ visible, initialHour, initialMinute, onCancel, onConfirm }: Props) {
  const initialHourIndex = useMemo(() => {
    const i = HOURS.indexOf(initialHour);
    return i >= 0 ? i : 8;
  }, [initialHour]);
  const initialMinuteIndex = useMemo(() => {
    const rounded = Math.round(initialMinute / 5) * 5;
    const i = MINUTES.indexOf(Math.min(55, rounded));
    return i >= 0 ? i : 0;
  }, [initialMinute]);

  const [hourIndex, setHourIndex] = useState<number>(initialHourIndex);
  const [minuteIndex, setMinuteIndex] = useState<number>(initialMinuteIndex);

  // Re-seed selection each time the sheet is opened for a (possibly different) reminder.
  useEffect(() => {
    if (visible) {
      setHourIndex(initialHourIndex);
      setMinuteIndex(initialMinuteIndex);
    }
  }, [visible, initialHourIndex, initialMinuteIndex]);

  const handleConfirm = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(HOURS[hourIndex], MINUTES[minuteIndex]);
  }, [hourIndex, minuteIndex, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{t('time_picker_title')}</Text>

          <View style={styles.pickerRow}>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>{t('time_hours')}</Text>
              <Wheel values={HOURS} selectedIndex={hourIndex} onIndexChange={setHourIndex} testID="hour-wheel" />
            </View>
            <Text style={styles.colon}>:</Text>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>{t('time_minutes')}</Text>
              <Wheel values={MINUTES} selectedIndex={minuteIndex} onIndexChange={setMinuteIndex} testID="minute-wheel" />
            </View>
            <View style={styles.centerBand} pointerEvents="none" />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.9} testID="time-confirm">
              <Text style={styles.confirmText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,20,0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: PICKER_HEIGHT + 28,
  },
  wheelColumn: {
    alignItems: 'center',
    width: 96,
  },
  wheelLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  wheel: {
    height: PICKER_HEIGHT,
    width: 90,
    overflow: 'hidden',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 26,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'],
  },
  wheelTextSelected: {
    color: Colors.text,
  },
  wheelTextDim: {
    color: Colors.textTertiary,
    opacity: 0.5,
  },
  colon: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginHorizontal: 4,
    marginBottom: ITEM_HEIGHT * CENTER_OFFSET - 4,
  },
  centerBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: ITEM_HEIGHT * CENTER_OFFSET,
    height: ITEM_HEIGHT,
    borderRadius: 14,
    backgroundColor: 'rgba(46,158,52,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,158,52,0.18)',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 5,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.white,
  },
});
