import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Check,
  Trash2,
  HeartPulse,
  Baby,
  Users,
  Candy,
  FlaskConical,
  TestTube,
  Heart,
  Salad,
  Sprout,
  WheatOff,
  MilkOff,
  ShieldAlert,
  Wheat,
  Shell,
  Egg,
  Fish,
  Nut,
  TreePine,
  Bean,
  Milk,
  Carrot,
  Droplets,
  Wine,
  Flower2,
  Snail,
  type LucideIcon,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { t, tf } from '@/utils/i18n';
import { useHealthProfile } from '@/providers/HealthProfileProvider';
import { HEALTH_PREFS, HealthPrefId, HealthPrefGroup, getHealthPrefLabel } from '@/utils/healthProfile';

const ALLERGEN_ACCENT = '#D64545';

const DR_TOXI_AVATAR = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

const ICONS: Record<string, LucideIcon> = {
  HeartPulse,
  Baby,
  Users,
  Candy,
  FlaskConical,
  TestTube,
  Heart,
  Salad,
  Sprout,
  WheatOff,
  MilkOff,
  Wheat,
  Shell,
  Egg,
  Fish,
  Nut,
  TreePine,
  Bean,
  Milk,
  Carrot,
  Droplets,
  Wine,
  Flower2,
  Snail,
};

export default function HealthProfileScreen() {
  const { profile, activeCount, togglePref, setNote, clearProfile } = useHealthProfile();
  const [noteDraft, setNoteDraft] = useState<string>(profile.note);

  const handleToggle = useCallback(
    (id: HealthPrefId) => {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      togglePref(id);
    },
    [togglePref],
  );

  const handleNoteBlur = useCallback(() => {
    if (noteDraft !== profile.note) {
      setNote(noteDraft.trim());
    }
  }, [noteDraft, profile.note, setNote]);

  const handleClear = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setNoteDraft('');
    clearProfile();
  }, [clearProfile]);

  const lifePrefs = HEALTH_PREFS.filter((p) => p.group === ('life' as HealthPrefGroup));
  const dietPrefs = HEALTH_PREFS.filter((p) => p.group === ('diet' as HealthPrefGroup));
  const allergenPrefs = HEALTH_PREFS.filter((p) => p.group === ('allergen' as HealthPrefGroup));
  const activeAllergens = allergenPrefs.filter((p) => profile.prefs.includes(p.id)).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7} testID="hp-back">
          <ChevronLeft color={Colors.text} size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('health_profile_title')}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: DR_TOXI_AVATAR }} style={styles.avatar} />
            </View>
            <Text style={styles.introText}>{t('health_profile_intro')}</Text>
            {activeCount > 0 && (
              <View style={styles.savedPill}>
                <Check color={Colors.primary} size={13} strokeWidth={3} />
                <Text style={styles.savedPillText}>{tf('health_profile_active', activeCount)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('health_profile_section_life')}</Text>
          <View style={styles.chipsWrap}>
            {lifePrefs.map((meta) => (
              <PrefChip
                key={meta.id}
                id={meta.id}
                label={getHealthPrefLabel(meta)}
                icon={ICONS[meta.icon] ?? Check}
                selected={profile.prefs.includes(meta.id)}
                onToggle={handleToggle}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('health_profile_section_diet')}</Text>
          <View style={styles.chipsWrap}>
            {dietPrefs.map((meta) => (
              <PrefChip
                key={meta.id}
                id={meta.id}
                label={getHealthPrefLabel(meta)}
                icon={ICONS[meta.icon] ?? Check}
                selected={profile.prefs.includes(meta.id)}
                onToggle={handleToggle}
              />
            ))}
          </View>

          <View style={[styles.allergenHeader, styles.sectionTitleSpaced]}>
            <ShieldAlert color={ALLERGEN_ACCENT} size={16} strokeWidth={2.4} />
            <Text style={[styles.sectionTitle, styles.allergenTitle]}>{t('health_profile_section_allergens')}</Text>
            {activeAllergens > 0 && (
              <View style={styles.allergenCount}>
                <Text style={styles.allergenCountText}>{activeAllergens}</Text>
              </View>
            )}
          </View>
          <Text style={styles.allergenHint}>{t('health_profile_allergens_hint')}</Text>
          <View style={styles.chipsWrap}>
            {allergenPrefs.map((meta) => (
              <PrefChip
                key={meta.id}
                id={meta.id}
                label={getHealthPrefLabel(meta)}
                icon={ICONS[meta.icon] ?? Check}
                selected={profile.prefs.includes(meta.id)}
                onToggle={handleToggle}
                accent={ALLERGEN_ACCENT}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('health_profile_note_label')}</Text>
          <TextInput
            style={styles.noteInput}
            value={noteDraft}
            onChangeText={setNoteDraft}
            onBlur={handleNoteBlur}
            placeholder={t('health_profile_note_placeholder')}
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={200}
            textAlignVertical="top"
            testID="hp-note"
          />

          <Text style={styles.privacy}>{t('health_profile_privacy')}</Text>

          {activeCount > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.7} testID="hp-clear">
              <Trash2 color={Colors.textSecondary} size={16} />
              <Text style={styles.clearButtonText}>{t('health_profile_clear')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrefChip({
  id,
  label,
  icon: Icon,
  selected,
  onToggle,
  accent,
}: {
  id: HealthPrefId;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onToggle: (id: HealthPrefId) => void;
  /** Optional accent color (allergen chips turn red instead of green). */
  accent?: string;
}) {
  const tint = accent ?? Colors.primary;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        selected && { backgroundColor: tint, borderColor: tint, shadowColor: tint },
      ]}
      onPress={() => onToggle(id)}
      activeOpacity={0.8}
      testID={`hp-pref-${id}`}
    >
      <Icon color={selected ? Colors.white : tint} size={17} strokeWidth={2.2} />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  intro: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 158, 52, 0.1)',
  },
  savedPillText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  sectionTitleSpaced: {
    marginTop: 28,
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  allergenTitle: {
    color: ALLERGEN_ACCENT,
    marginBottom: 0,
  },
  allergenCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: ALLERGEN_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenCountText: {
    fontSize: 11.5,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  allergenHint: {
    fontSize: 13,
    lineHeight: 18.5,
    color: Colors.textTertiary,
    marginBottom: 14,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  chipLabel: {
    fontSize: 14.5,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chipLabelSelected: {
    color: Colors.white,
  },
  noteInput: {
    minHeight: 90,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.text,
  },
  privacy: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textTertiary,
    marginTop: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
