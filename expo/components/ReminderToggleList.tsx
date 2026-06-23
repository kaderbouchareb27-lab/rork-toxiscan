import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { Sunrise, Sun, Moon, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { t } from '@/utils/i18n';
import {
  formatTime,
  type MealReminder,
  type ReminderPrefs,
  type ReminderSlot,
} from '@/utils/reminderPrefs';
import TimePickerSheet from '@/components/TimePickerSheet';

interface Props {
  prefs: ReminderPrefs;
  onChange: (next: ReminderPrefs) => void;
  /** When false, the rows are dimmed and non-interactive (master notifications off). */
  enabled?: boolean;
}

const SLOT_META: { slot: ReminderSlot; labelKey: 'reminder_morning' | 'reminder_noon' | 'reminder_evening'; Icon: typeof Sunrise }[] = [
  { slot: 'morning', labelKey: 'reminder_morning', Icon: Sunrise },
  { slot: 'noon', labelKey: 'reminder_noon', Icon: Sun },
  { slot: 'evening', labelKey: 'reminder_evening', Icon: Moon },
];

/**
 * The 3 optional meal reminders, each independently toggleable with a user-chosen
 * time. Shared by the first-launch onboarding and the in-profile settings screen.
 */
export default function ReminderToggleList({ prefs, onChange, enabled = true }: Props) {
  const [editingSlot, setEditingSlot] = useState<ReminderSlot | null>(null);

  const updateReminder = useCallback((slot: ReminderSlot, patch: Partial<MealReminder>) => {
    onChange({ ...prefs, [slot]: { ...prefs[slot], ...patch } });
  }, [prefs, onChange]);

  const handleToggle = useCallback((slot: ReminderSlot, value: boolean) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateReminder(slot, { enabled: value });
  }, [updateReminder]);

  const handleOpenPicker = useCallback((slot: ReminderSlot) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setEditingSlot(slot);
  }, []);

  const handleConfirmTime = useCallback((hour: number, minute: number) => {
    if (editingSlot) updateReminder(editingSlot, { hour, minute });
    setEditingSlot(null);
  }, [editingSlot, updateReminder]);

  const editing = editingSlot ? prefs[editingSlot] : null;

  return (
    <View style={[styles.container, !enabled && styles.containerDisabled]} pointerEvents={enabled ? 'auto' : 'none'}>
      {SLOT_META.map(({ slot, labelKey, Icon }, index) => {
        const reminder = prefs[slot];
        const isOn = reminder.enabled;
        return (
          <View key={slot} style={[styles.row, index < SLOT_META.length - 1 && styles.rowBorder]}>
            <View style={[styles.iconWrap, isOn && styles.iconWrapOn]}>
              <Icon color={isOn ? Colors.primary : Colors.textTertiary} size={19} strokeWidth={2.1} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t(labelKey)}</Text>
              <TouchableOpacity
                onPress={() => handleOpenPicker(slot)}
                disabled={!isOn}
                activeOpacity={0.7}
                style={[styles.timeChip, !isOn && styles.timeChipOff]}
                testID={`reminder-time-${slot}`}
              >
                <Clock color={isOn ? Colors.primary : Colors.textTertiary} size={13} strokeWidth={2.2} />
                <Text style={[styles.timeText, !isOn && styles.timeTextOff]}>
                  {formatTime(reminder.hour, reminder.minute)}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={isOn}
              onValueChange={(v) => handleToggle(slot, v)}
              trackColor={{ false: '#D9D4C8', true: Colors.primary }}
              thumbColor={Platform.OS === 'android' ? (isOn ? '#FFFFFF' : '#FFFFFF') : undefined}
              ios_backgroundColor="#D9D4C8"
              testID={`reminder-switch-${slot}`}
            />
          </View>
        );
      })}

      <TimePickerSheet
        visible={editingSlot !== null}
        initialHour={editing?.hour ?? 8}
        initialMinute={editing?.minute ?? 0}
        onCancel={() => setEditingSlot(null)}
        onConfirm={handleConfirmTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerDisabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOn: {
    backgroundColor: 'rgba(46,158,52,0.1)',
  },
  rowText: {
    flex: 1,
    gap: 5,
  },
  rowLabel: {
    fontSize: 15.5,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,158,52,0.1)',
  },
  timeChipOff: {
    backgroundColor: Colors.surfaceSecondary,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  timeTextOff: {
    color: Colors.textTertiary,
  },
});
