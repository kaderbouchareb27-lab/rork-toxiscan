import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ShoppingCart, Plus, Check, Camera, X, Flag, Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import { useShopping } from '@/providers/ShoppingProvider';
import { shoppingVerdictColor, shoppingVerdictLabel } from '@/utils/shopping';
import type { ShoppingItem } from '@/utils/shopping';
import { t, pick } from '@/utils/i18n';

function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function ShoppingScreen() {
  const {
    items,
    isActive,
    averageScore,
    startSession,
    addManualFood,
    removeItem,
    toggleChecked,
  } = useShopping();

  const [showManualAdd, setShowManualAdd] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');

  const presetFoods = useMemo(() => [
    pick({ en: 'Vegetables', fr: 'Légumes', ko: '채소' }),
    pick({ en: 'Fruits', fr: 'Fruits', ko: '과일' }),
    pick({ en: 'Eggs', fr: 'Œufs', ko: '달걀' }),
    pick({ en: 'Meat', fr: 'Viande', ko: '고기' }),
    pick({ en: 'Fish', fr: 'Poisson', ko: '생선' }),
    pick({ en: 'Rice', fr: 'Riz', ko: '쌀' }),
    pick({ en: 'Pasta', fr: 'Pâtes', ko: '파스타' }),
    pick({ en: 'Yogurt', fr: 'Yaourt', ko: '요거트' }),
    pick({ en: 'Bread', fr: 'Pain', ko: '빵' }),
    pick({ en: 'Water', fr: 'Eau', ko: '물' }),
  ], []);

  const handleStart = useCallback(() => {
    tap();
    startSession();
  }, [startSession]);

  const handleAddManual = useCallback(() => {
    tap();
    if (manualText.trim()) {
      addManualFood(manualText.trim());
      setManualText('');
    }
    setShowManualAdd(false);
  }, [manualText, addManualFood]);

  const handleAddPreset = useCallback((name: string) => {
    tap();
    addManualFood(name);
  }, [addManualFood]);

  // ── État initial : aucune session active ──
  if (!isActive) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.welcomeBody}>
          <View style={styles.welcomeAvatarStage}>
            <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.welcomeAvatar} contentFit="contain" transition={200} />
          </View>
          <Text style={styles.welcomeTitle}>
            {pick({ en: 'Ready for a healthier shop?', fr: 'Prêt à faire des courses plus saines ?', ko: '더 건강한 장보기 준비됐나요?' })}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {pick({
              en: 'Scan products as you shop to build a list with a live health score. Simple foods (vegetables, eggs, rice…) are added in one tap.',
              fr: 'Scanne tes produits au fil des courses pour construire une liste avec un score santé en direct. Les aliments simples (légumes, œufs, riz…) s’ajoutent en un geste.',
              ko: '장보는 동안 제품을 스캔해 실시간 건강 점수를 확인하세요. 채소, 달걀, 쌀 같은 간단한 식품은 한 번에 추가됩니다.',
            })}
          </Text>
          <TouchableOpacity style={styles.welcomeButton} onPress={handleStart} activeOpacity={0.85} testID="shopping-start">
            <ShoppingCart color="#FFFFFF" size={20} />
            <Text style={styles.welcomeButtonText}>
              {pick({ en: 'Start my shop', fr: 'Commencer mes courses', ko: '장보기 시작하기' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {pick({ en: 'Shopping mode', fr: 'Mode courses', ko: '장보기 모드' })}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            tap();
            setShowManualAdd((v) => !v);
          }}
          activeOpacity={0.8}
          testID="shopping-manual-add-toggle"
        >
          <Plus color={Colors.primary} size={20} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      {/* Compteur flottant persistant */}
      <View style={styles.counterRow}>
        <View style={styles.counterCard}>
          <ShoppingCart color={Colors.primary} size={18} strokeWidth={2.2} />
          <Text style={styles.counterText}>
            {items.length}{' '}
            {items.length === 1
              ? pick({ en: 'item', fr: 'article', ko: '개' })
              : pick({ en: 'items', fr: 'articles', ko: '개' })}{' '}
            — <Text style={styles.counterScore}>{averageScore > 0 ? averageScore.toFixed(1) : '–'}/10</Text>
          </Text>
        </View>
      </View>

      {/* Ajout manuel (panneau repliable) */}
      {showManualAdd ? (
        <View style={styles.manualPanel}>
          <View style={styles.chipsWrap}>
            {presetFoods.map((food) => (
              <TouchableOpacity
                key={food}
                style={styles.chip}
                onPress={() => handleAddPreset(food)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{food}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              value={manualText}
              onChangeText={setManualText}
              placeholder={pick({ en: 'Another food…', fr: 'Un autre aliment…', ko: '다른 식품…' })}
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={handleAddManual}
            />
            <TouchableOpacity style={styles.manualAddButton} onPress={handleAddManual} activeOpacity={0.85}>
              <Text style={styles.manualAddButtonText}>
                {pick({ en: 'Add', fr: 'Ajouter', ko: '추가' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Liste */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {pick({ en: 'Your list is empty — scan a product or add a simple food.', fr: 'Ta liste est vide — scanne un produit ou ajoute un aliment simple.', ko: '목록이 비어 있어요 — 제품을 스캔하거나 간단한 식품을 추가하세요.' })}
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={() => toggleChecked(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Actions fixes */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            tap();
            router.push('/shopping-scan');
          }}
          activeOpacity={0.85}
          testID="shopping-scan-product"
        >
          <Camera color="#FFFFFF" size={20} />
          <Text style={styles.scanButtonText}>
            {pick({ en: 'Scan a product', fr: 'Scanner un produit', ko: '제품 스캔' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.finishButton}
          onPress={() => {
            tap();
            router.push('/shopping-summary');
          }}
          activeOpacity={0.85}
          testID="shopping-finish"
        >
          <Flag color={Colors.primary} size={18} />
          <Text style={styles.finishButtonText}>
            {pick({ en: 'Finish my shop', fr: 'Terminer mes courses', ko: '장보기 끝내기' })}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ShoppingItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const color = shoppingVerdictColor(item.verdictLevel, item.isCosmetic);
  const label = shoppingVerdictLabel(item.verdictLevel, item.isCosmetic);

  const handleDelete = useCallback(() => {
    tap();
    onRemove();
  }, [onRemove]);

  return (
    <Swipeable
      containerStyle={styles.swipeableContainer}
      overshootRight={false}
      friction={2}
      rightThreshold={36}
      renderRightActions={(progress) => {
        const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
        return (
          <Animated.View style={[styles.swipeDelete, { transform: [{ scale }] }]}>
            <TouchableOpacity
              style={styles.swipeDeleteButton}
              onPress={handleDelete}
              activeOpacity={0.85}
              testID="shopping-item-swipe-delete"
            >
              <Trash2 color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </Animated.View>
        );
      }}
    >
      <View style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
        <TouchableOpacity
          style={[styles.checkbox, item.checked && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
          onPress={onToggle}
          activeOpacity={0.7}
          testID="shopping-item-check"
        >
          {item.checked ? <Check color="#FFFFFF" size={14} strokeWidth={3.2} /> : null}
        </TouchableOpacity>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={[styles.itemBadge, { backgroundColor: color }]}>
            <Text style={styles.itemBadgeText} numberOfLines={1}>{label}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.7} testID="shopping-item-remove">
          <X color={Colors.textTertiary} size={16} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },

  // ── État initial ──
  welcomeBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 60 },
  welcomeAvatarStage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  welcomeAvatar: { width: 88, height: 88 },
  welcomeTitle: { fontSize: 25, fontWeight: '800' as const, color: Colors.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: 12 },
  welcomeSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  welcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 22,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  welcomeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.1 },

  // ── Session active ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  counterRow: { paddingHorizontal: 20, paddingBottom: 8 },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  counterText: { fontSize: 14, fontWeight: '700' as const, color: Colors.primaryDark },
  counterScore: { fontWeight: '900' as const, color: Colors.primary },

  manualPanel: { paddingHorizontal: 20, paddingBottom: 6 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  manualInputRow: { flexDirection: 'row', gap: 10 },
  manualInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manualAddButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  manualAddButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' as const },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  emptyState: { paddingVertical: 36, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemRowChecked: { opacity: 0.6 },
  swipeableContainer: { marginBottom: 10, borderRadius: 18 },
  swipeDelete: { width: 72 },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: '#D0260F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1, gap: 7 },
  itemName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.1 },
  itemNameChecked: { textDecorationLine: 'line-through' as const, color: Colors.textSecondary },
  itemBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  itemBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.3, textTransform: 'uppercase' as const },
  removeButton: { padding: 6 },

  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#2E9E34',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  scanButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' as const, letterSpacing: -0.1 },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
  },
  finishButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '800' as const, letterSpacing: -0.1 },
});
