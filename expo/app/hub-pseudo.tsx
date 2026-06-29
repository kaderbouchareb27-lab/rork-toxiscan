import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { X, RefreshCw, Lock, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { useHub } from '@/providers/HubProvider';
import { generatePseudoSuggestions } from '@/constants/hubPseudo';
import { hubAvatarColor, hubInitials } from '@/utils/hubUi';

export default function HubPseudoScreen() {
  const { userId, pseudo, canEditPseudo, updatePseudo } = useHub();
  const [draft, setDraft] = useState<string>(pseudo);
  const [suggestions, setSuggestions] = useState<string[]>(() => generatePseudoSuggestions(6));

  const handleShuffle = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setSuggestions(generatePseudoSuggestions(6));
  }, []);

  const handleSave = useCallback(async () => {
    const clean = draft.trim();
    if (!clean || clean === pseudo) {
      router.back();
      return;
    }
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updatePseudo(clean);
    router.back();
  }, [draft, pseudo, updatePseudo]);

  const preview = draft.trim() || pseudo;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={10} testID="pseudo-close">
          <X color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pick({ en: 'Your pseudo', fr: 'Ton pseudo', ko: '닉네임' })}</Text>
        <View style={styles.closeButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.previewWrap}>
            <View style={[styles.avatar, { backgroundColor: hubAvatarColor(userId) }]}>
              <Text style={styles.avatarText}>{hubInitials(preview)}</Text>
            </View>
            <Text style={styles.previewName}>{preview}</Text>
            <Text style={styles.previewSub}>
              {pick({ en: 'This is how the community sees you. No email, no login.', fr: "C'est ainsi que la communauté te voit. Aucun email, aucun login.", ko: '커뮤니티에 표시되는 이름입니다. 이메일·로그인 없음.' })}
            </Text>
          </View>

          {canEditPseudo ? (
            <>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={pseudo}
                placeholderTextColor={Colors.textTertiary}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect={false}
                testID="pseudo-input"
              />
              <View style={styles.suggestHeader}>
                <Text style={styles.suggestTitle}>{pick({ en: 'Suggestions', fr: 'Suggestions', ko: '추천' })}</Text>
                <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle} hitSlop={8} testID="pseudo-shuffle">
                  <RefreshCw color={Colors.primary} size={15} strokeWidth={2.4} />
                  <Text style={styles.shuffleText}>{pick({ en: 'Shuffle', fr: 'Mélanger', ko: '새로고침' })}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {suggestions.map((s) => (
                  <TouchableOpacity key={s} style={[styles.chip, draft === s && styles.chipActive]} onPress={() => setDraft(s)} activeOpacity={0.8} testID={`pseudo-suggestion-${s}`}>
                    <Text style={[styles.chipText, draft === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.warnCard}>
                <Lock color={Colors.warning} size={14} strokeWidth={2.4} />
                <Text style={styles.warnText}>
                  {pick({ en: 'You can change your pseudo only once, so choose carefully.', fr: 'Tu peux changer ton pseudo une seule fois, choisis bien.', ko: '닉네임은 한 번만 변경할 수 있으니 신중히 선택하세요.' })}
                </Text>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.9} testID="pseudo-save">
                <Check color={Colors.white} size={18} strokeWidth={2.6} />
                <Text style={styles.saveText}>{pick({ en: 'Save pseudo', fr: 'Enregistrer le pseudo', ko: '닉네임 저장' })}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.lockedCard}>
              <Lock color={Colors.textSecondary} size={18} strokeWidth={2.2} />
              <Text style={styles.lockedText}>
                {pick({ en: 'You have already personalized your pseudo. It cannot be changed again.', fr: 'Tu as déjà personnalisé ton pseudo. Il ne peut plus être changé.', ko: '이미 닉네임을 변경했습니다. 다시 변경할 수 없습니다.' })}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  content: { padding: 20, paddingBottom: 40 },
  previewWrap: { alignItems: 'center', marginTop: 12, marginBottom: 26 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' as const },
  previewName: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  previewSub: { fontSize: 13.5, lineHeight: 20, color: Colors.textTertiary, textAlign: 'center', marginTop: 8, maxWidth: 280 },
  input: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primaryBorder, paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  suggestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  suggestTitle: { fontSize: 13, fontWeight: '800' as const, color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  shuffleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shuffleText: { fontSize: 13.5, fontWeight: '700' as const, color: Colors.primary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { backgroundColor: Colors.surfaceSecondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '700' as const, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  warnCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(232,115,10,0.08)', borderRadius: 14, padding: 14, marginTop: 24 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: Colors.primary, borderRadius: 18, paddingVertical: 17, marginTop: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 6 },
  saveText: { color: Colors.white, fontSize: 16.5, fontWeight: '800' as const, letterSpacing: -0.2 },
  lockedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.surfaceSecondary, borderRadius: 16, padding: 16, marginTop: 10 },
  lockedText: { flex: 1, fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
});
