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
import { ChevronLeft, Plus, X, ArrowRight, AlertTriangle, Pencil, RefreshCw, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { t, tf } from '@/utils/i18n';
import { compressImageWeb, compressImageNative } from '@/utils/imageCompression';
import {
  detectMealFromPhoto,
  detectMealFromText,
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
  const [analyzedName, setAnalyzedName] = useState<string>('');
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [newName, setNewName] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [statusIndex, setStatusIndex] = useState<number>(0);
  // True once the user manually adds / edits / removes an ingredient. When set, a dish-name
  // change must NEVER silently re-detect from text and wipe those manual corrections (Bug B).
  const [ingredientsEdited, setIngredientsEdited] = useState<boolean>(false);

  const score = useMemo(() => computeMealScore(ingredients, dishName), [ingredients, dishName]);
  const tier = useMemo(() => scoreToTier(score), [score]);
  const trimmedDishName = dishName.trim();
  const nameChanged = trimmedDishName.length > 0 && trimmedDishName !== analyzedName.trim();

  const detectMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const base64 = Platform.OS === 'web'
        ? await compressImageWeb(imageUri, 1024)
        : await compressImageNative(imageUri, 1024, 0.72);
      return detectMealFromPhoto(base64);
    },
    onSuccess: (detected) => {
      setDishName(detected.dishName);
      setAnalyzedName(detected.dishName);
      setIngredients(detected.ingredients);
      setIngredientsEdited(false);
      setEditingId(null);
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

  // Manual correction of the dish name re-runs detection from the user's TEXT (authoritative),
  // never the photo guess — so "bâtonnet au Nutella" replaces "croissant au chocolat" entirely.
  const reanalyzeMutation = useMutation({
    mutationFn: async (name: string) => detectMealFromText(name),
    onSuccess: (detected) => {
      setDishName(detected.dishName);
      setAnalyzedName(detected.dishName);
      setIngredients(detected.ingredients);
      setIngredientsEdited(false);
      setEditingId(null);
      Keyboard.dismiss();
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: unknown) => {
      console.error('[MealConfirm] Re-analysis failed:', e instanceof Error ? e.message : e);
      Alert.alert(t('error_analysis_title'), t('meal_reanalyze_failed'));
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
    setIngredientsEdited(true);
    setNewName('');
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newName]);

  const handleRemove = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setIngredientsEdited(true);
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleReanalyze = useCallback(() => {
    const name = dishName.trim();
    if (!name || name === analyzedName.trim() || reanalyzeMutation.isPending) return;
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reanalyzeMutation.mutate(name);
  }, [dishName, analyzedName, reanalyzeMutation]);

  const handleEditStart = useCallback((ing: MealIngredient) => {
    setEditingId(ing.id);
    setEditingText(ing.name);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  }, []);

  const handleEditCommit = useCallback(() => {
    const text = editingText.trim();
    if (editingId && text) setIngredientsEdited(true);
    setIngredients((prev) => {
      if (!editingId) return prev;
      if (!text) return prev;
      // Renaming reclassifies the item locally so the live score reacts immediately.
      return prev.map((i) => {
        if (i.id !== editingId) return i;
        const { category, isGrave } = classifyMealIngredient(text);
        return { id: i.id, name: text, category, isGrave, note: '' };
      });
    });
    setEditingId(null);
    setEditingText('');
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [editingId, editingText]);

  const handleSeeResult = useCallback(async () => {
    if (phase === 'generating' || reanalyzeMutation.isPending) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let finalName = dishName.trim();
    let finalIngredients = ingredients;
    setPhase('generating');

    // Safety net: if the dish name was corrected but not re-analyzed yet, re-detect now so the
    // verdict, score and ingredients all reflect the user's correction (manual input wins).
    // BUT if the user manually curated the ingredient list, those corrections are authoritative
    // and must be kept verbatim — never wiped by a text re-detection (Bug B). They can still
    // force a full re-detection via the explicit "Re-analyze" button.
    if (finalName && finalName !== analyzedName.trim() && !ingredientsEdited) {
      try {
        const detected = await detectMealFromText(finalName);
        finalName = detected.dishName;
        finalIngredients = detected.ingredients;
        setDishName(detected.dishName);
        setAnalyzedName(detected.dishName);
        setIngredients(detected.ingredients);
        setIngredientsEdited(false);
        setEditingId(null);
      } catch (e) {
        console.error('[MealConfirm] Re-analysis before result failed:', e instanceof Error ? e.message : e);
        setPhase('ready');
        Alert.alert(t('error_analysis_title'), t('meal_reanalyze_failed'));
        return;
      }
    }

    if (finalIngredients.length === 0) {
      setPhase('ready');
      return;
    }

    try {
      const finalScore = computeMealScore(finalIngredients, finalName);
      const finalTier = scoreToTier(finalScore);
      const verdict = await generateMealVerdict(finalName, finalIngredients, finalScore, finalTier);
      const id = `meal_${Date.now().toString(36)}`;
      addMeal(
        buildMealRecord({
          id,
          dishName: finalName,
          photoUri,
          score: finalScore,
          tier: finalTier,
          ingredients: finalIngredients,
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
  }, [ingredients, dishName, analyzedName, photoUri, addMeal, consumeMealScan, phase, reanalyzeMutation.isPending, ingredientsEdited]);

  const isReanalyzing = reanalyzeMutation.isPending;
  if (phase === 'analyzing' || isReanalyzing) {
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
          <Text style={styles.loaderTitle}>{isReanalyzing ? t('meal_reanalyzing_title') : t('meal_analyzing_title')}</Text>
          <Text style={styles.loaderStatus}>{isReanalyzing ? t('meal_reanalyzing_status') : t(statusKey)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSeeResult = (ingredients.length > 0 || nameChanged) && phase !== 'generating' && !reanalyzeMutation.isPending;

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

          <View style={styles.dishNameRow}>
            <View style={styles.dishNamePencilSpacer} />
            <TextInput
              style={styles.dishNameInput}
              value={dishName}
              onChangeText={setDishName}
              placeholder={t('meal_dish_name_placeholder')}
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={handleReanalyze}
              selectTextOnFocus
              testID="meal-dish-name"
            />
            <Pencil color={Colors.textTertiary} size={16} strokeWidth={2} />
          </View>

          {nameChanged ? (
            <TouchableOpacity style={styles.reanalyzeBtn} onPress={handleReanalyze} activeOpacity={0.85} testID="meal-reanalyze">
              <RefreshCw color={Colors.primary} size={15} strokeWidth={2.4} />
              <Text style={styles.reanalyzeBtnText}>{t('meal_reanalyze')}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.hint}>{nameChanged ? t('meal_estimate_hint') : t('meal_dish_name_hint')}</Text>

          <View style={styles.listCard}>
            <Text style={styles.listCount}>{tf('meal_detected_count', ingredients.length)}</Text>
            {ingredients.map((ing) => (
              <View key={ing.id} style={styles.ingredientRow}>
                <View style={[styles.dot, { backgroundColor: MEAL_CATEGORY_COLORS[ing.category] }]} />
                {editingId === ing.id ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editingText}
                      onChangeText={setEditingText}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleEditCommit}
                      placeholder={t('meal_ingredient_placeholder')}
                      placeholderTextColor={Colors.textTertiary}
                      testID={`meal-edit-input-${ing.id}`}
                    />
                    <TouchableOpacity
                      style={styles.confirmEditButton}
                      onPress={handleEditCommit}
                      activeOpacity={0.85}
                      accessibilityLabel={t('meal_save')}
                    >
                      <Check color={Colors.white} size={18} strokeWidth={2.6} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.ingredientText}
                      onPress={() => handleEditStart(ing)}
                      activeOpacity={0.6}
                      accessibilityLabel={t('meal_edit_ingredient')}
                    >
                      <View style={styles.ingredientNameRow}>
                        <Text style={styles.ingredientName} numberOfLines={1}>{ing.name}</Text>
                        <Pencil color={Colors.textTertiary} size={12} strokeWidth={2} />
                      </View>
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
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemove(ing.id)}
                      activeOpacity={0.7}
                      accessibilityLabel={t('meal_remove_ingredient')}
                    >
                      <X color={Colors.textTertiary} size={18} />
                    </TouchableOpacity>
                  </>
                )}
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
            style={[styles.cta, !canSeeResult && styles.ctaDisabled]}
            onPress={handleSeeResult}
            disabled={!canSeeResult}
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
          {ingredients.length === 0 && !nameChanged ? <Text style={styles.emptyHint}>{t('meal_empty_hint')}</Text> : null}
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
  dishNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, paddingHorizontal: 8 },
  dishNamePencilSpacer: { width: 16 },
  dishNameInput: { flexShrink: 1, fontSize: 22, fontWeight: '800' as const, color: Colors.text, textAlign: 'center', letterSpacing: -0.4, paddingVertical: 4 },
  reanalyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 7, marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(46,158,52,0.1)', borderWidth: 1.5, borderColor: 'rgba(46,158,52,0.3)' },
  reanalyzeBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '800' as const, letterSpacing: -0.2 },
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
  ingredientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ingredientName: { flexShrink: 1, fontSize: 15.5, fontWeight: '600' as const, color: Colors.text, letterSpacing: -0.2 },
  ingredientMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  ingredientCat: { fontSize: 12.5, fontWeight: '700' as const },
  graveTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(208,38,15,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  graveTagText: { fontSize: 10, fontWeight: '900' as const, color: '#D0260F', letterSpacing: 0.4 },
  removeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  editInput: { flex: 1, height: 42, borderRadius: 12, backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 14, fontSize: 15, color: Colors.text },
  confirmEditButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
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
