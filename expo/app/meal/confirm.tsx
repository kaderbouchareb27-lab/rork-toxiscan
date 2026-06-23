import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, Plus, X, ArrowRight, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { t, tf } from '@/utils/i18n';
import { compressImageWeb, compressImageNative } from '@/utils/imageCompression';
import {
  detectMealFromPhoto,
  computeMealScore,
  scoreToTier,
  classifyMealIngredient,
  newMealIngredientId,
  generateMealVerdict,
  type MealIngredient,
} from '@/utils/mealAnalysis';
import { useMeals, buildMealRecord } from '@/providers/MealHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { MEAL_CATEGORY_COLORS, mealCategoryLabel, mealTierLabel } from '@/constants/mealAvatars';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import ToxicityScoreRing from '@/components/ToxicityScoreRing';

type Phase = 'analyzing' | 'ready' | 'generating';

export default function MealConfirmScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const photoUri = typeof uri === 'string' ? uri : '';
  const { addMeal } = useMeals();
  const { consumeMealScan } = useSubscription();

  const [phase, setPhase] = useState<Phase>('analyzing');
  const [dishName, setDishName] = useState<string>('');
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [newName, setNewName] = useState<string>('');
  const [statusIndex, setStatusIndex] = useState<number>(0);

  const score = useMemo(() => computeMealScore(ingredients), [ingredients]);
  const tier = useMemo(() => scoreToTier(score), [score]);

  const detectMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const base64 = Platform.OS === 'web'
        ? await compressImageWeb(imageUri, 900)
        : await compressImageNative(imageUri, 900, 0.6);
      return detectMealFromPhoto(base64);
    },
    onSuccess: (detected) => {
      setDishName(detected.dishName);
      setIngredients(detected.ingredients);
      setPhase('ready');
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: unknown) => {
      console.error('[MealConfirm] Detection failed:', e instanceof Error ? e.message : e);
      Alert.alert(t('error_analysis_title'), t('meal_analysis_failed'), [
        { text: t('ok'), onPress: () => router.back() },
      ]);
    },
  });

  const startedRef = useRef<boolean>(false);
  useEffect(() => {
    if (startedRef.current) return;
    if (!photoUri) {
      router.back();
      return;
    }
    startedRef.current = true;
    detectMutation.mutate(photoUri);
  }, [photoUri, detectMutation]);

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const interval = setInterval(() => setStatusIndex((p) => (p + 1) % 3), 1100);
    return () => clearInterval(interval);
  }, [phase]);

  const handleAdd = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const { category, isGrave } = classifyMealIngredient(name);
    setIngredients((prev) => [...prev, { id: newMealIngredientId(), name, category, isGrave, note: '' }]);
    setNewName('');
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newName]);

  const handleRemove = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSeeResult = useCallback(async () => {
    if (ingredients.length === 0 || phase === 'generating') return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('generating');
    try {
      const finalScore = computeMealScore(ingredients);
      const finalTier = scoreToTier(finalScore);
      const verdict = await generateMealVerdict(dishName, ingredients, finalScore, finalTier);
      const id = `meal_${Date.now().toString(36)}`;
      addMeal(
        buildMealRecord({
          id,
          dishName,
          photoUri,
          score: finalScore,
          tier: finalTier,
          ingredients,
          verdictText: verdict.verdictText,
          alternatives: verdict.alternatives,
        }),
      );
      consumeMealScan();
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/meal/${id}`);
    } catch (e) {
      console.error('[MealConfirm] Verdict failed:', e instanceof Error ? e.message : e);
      setPhase('ready');
      Alert.alert(t('error_analysis_title'), t('error_chat_generic'));
    }
  }, [ingredients, dishName, photoUri, addMeal, consumeMealScan, phase]);

  if (phase === 'analyzing') {
    const statusKey = (['meal_analyzing_status_1', 'meal_analyzing_status_2', 'meal_analyzing_status_3'] as const)[statusIndex];
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loaderCenter}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.loaderPhoto} /> : null}
          <View style={styles.loaderAvatarDisc}>
            <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.loaderAvatar} resizeMode="contain" />
          </View>
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 18 }} />
          <Text style={styles.loaderTitle}>{t('meal_analyzing_title')}</Text>
          <Text style={styles.loaderStatus}>{t(statusKey)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('meal_confirm_title')}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.ringWrap}>
            <ToxicityScoreRing score={score} tier={tier} label={t('meal_toxicity_level')} caption={mealTierLabel(tier)} />
          </View>

          {dishName ? <Text style={styles.dishName}>{dishName}</Text> : null}
          <Text style={styles.hint}>{t('meal_estimate_hint')}</Text>

          <View style={styles.listCard}>
            <Text style={styles.listCount}>{tf('meal_detected_count', ingredients.length)}</Text>
            {ingredients.map((ing) => (
              <View key={ing.id} style={styles.ingredientRow}>
                <View style={[styles.dot, { backgroundColor: MEAL_CATEGORY_COLORS[ing.category] }]} />
                <View style={styles.ingredientText}>
                  <Text style={styles.ingredientName} numberOfLines={1}>{ing.name}</Text>
                  <View style={styles.ingredientMetaRow}>
                    <Text style={[styles.ingredientCat, { color: MEAL_CATEGORY_COLORS[ing.category] }]}>
                      {mealCategoryLabel(ing.category)}
                    </Text>
                    {ing.isGrave ? (
                      <View style={styles.graveTag}>
                        <AlertTriangle color="#D0260F" size={10} strokeWidth={2.4} />
                        <Text style={styles.graveTagText}>{t('meal_grave_tag')}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(ing.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={t('meal_remove_ingredient')}
                >
                  <X color={Colors.textTertiary} size={18} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder={t('meal_ingredient_placeholder')}
                placeholderTextColor={Colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity
                style={[styles.addButton, !newName.trim() && styles.addButtonDisabled]}
                onPress={handleAdd}
                disabled={!newName.trim()}
                activeOpacity={0.8}
              >
                <Plus color={Colors.white} size={20} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, ingredients.length === 0 && styles.ctaDisabled]}
            onPress={handleSeeResult}
            disabled={ingredients.length === 0 || phase === 'generating'}
            activeOpacity={0.9}
            testID="meal-see-result"
          >
            {phase === 'generating' ? (
              <>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={styles.ctaText}>{t('meal_generating_verdict')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.ctaText}>{t('meal_see_result')}</Text>
                <ArrowRight color={Colors.white} size={20} strokeWidth={2.2} />
              </>
            )}
          </TouchableOpacity>
          {ingredients.length === 0 ? <Text style={styles.emptyHint}>{t('meal_empty_hint')}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loaderCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loaderPhoto: { width: 120, height: 120, borderRadius: 24, marginBottom: 22 },
  loaderAvatarDisc: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4,
  },
  loaderAvatar: { width: 56, height: 56 },
  loaderTitle: { marginTop: 18, fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  loaderStatus: { marginTop: 6, fontSize: 14.5, fontWeight: '500' as const, color: '#6C8A74' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  ringWrap: { alignItems: 'center', marginTop: 8, marginBottom: 6 },
  dishName: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, textAlign: 'center', letterSpacing: -0.4, marginTop: 6 },
  hint: { fontSize: 13.5, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 18, paddingHorizontal: 12 },
  listCard: {
    backgroundColor: Colors.surface, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  listCount: { fontSize: 12, fontWeight: '700' as const, color: Colors.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' as const, marginBottom: 10 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  dot: { width: 12, height: 12, borderRadius: 6 },
  ingredientText: { flex: 1 },
  ingredientName: { fontSize: 15.5, fontWeight: '600' as const, color: Colors.text, letterSpacing: -0.2 },
  ingredientMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  ingredientCat: { fontSize: 12.5, fontWeight: '700' as const },
  graveTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(208,38,15,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  graveTagText: { fontSize: 10, fontWeight: '900' as const, color: '#D0260F', letterSpacing: 0.4 },
  removeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  addInput: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 16, fontSize: 15, color: Colors.text,
  },
  addButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { opacity: 0.4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, backgroundColor: 'rgba(250,250,248,0.96)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 18, paddingVertical: 18, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 6 },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: Colors.white, fontSize: 17, fontWeight: '800' as const, letterSpacing: -0.2 },
  emptyHint: { textAlign: 'center', fontSize: 12.5, color: Colors.textSecondary, marginTop: 10 },
});
