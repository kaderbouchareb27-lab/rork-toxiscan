import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { X, ShieldCheck, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { useHub } from '@/providers/HubProvider';
import { HubModerationError } from '@/utils/hubApi';
import { moderationMessage } from '@/utils/hubUi';

export default function HubComposeScreen() {
  const { pseudo, createPost, isPosting } = useHub();
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');

  const canPublish = body.trim().length > 0 && !isPosting;

  const handlePublish = useCallback(async () => {
    if (!canPublish) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createPost({ kind: 'discussion', title: title.trim() || null, body: body.trim() });
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      if (e instanceof HubModerationError) {
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          pick({ en: 'Topic not published', fr: 'Sujet non publié', ko: '주제가 게시되지 않음' }),
          moderationMessage(e.category),
        );
      } else {
        Alert.alert(
          pick({ en: 'Something went wrong', fr: "Une erreur s'est produite", ko: '오류가 발생했습니다' }),
          pick({ en: 'Please check your connection and try again.', fr: 'Vérifie ta connexion et réessaie.', ko: '연결을 확인하고 다시 시도해 주세요.' }),
        );
      }
    }
  }, [canPublish, createPost, title, body]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={10} testID="compose-close">
          <X color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pick({ en: 'New topic', fr: 'Nouveau sujet', ko: '새 주제' })}</Text>
        <TouchableOpacity
          style={[styles.publishButton, !canPublish && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={!canPublish}
          activeOpacity={0.85}
          testID="compose-publish"
        >
          {isPosting ? <ActivityIndicator color={Colors.white} size="small" /> : (
            <Text style={styles.publishText}>{pick({ en: 'Publish', fr: 'Publier', ko: '게시' })}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.identityRow}>
            <ShieldCheck color={Colors.primary} size={15} strokeWidth={2.4} />
            <Text style={styles.identityText}>
              {pick({ en: 'Posting as', fr: 'Tu publies en tant que', ko: '게시자' })} <Text style={styles.identityName}>{pseudo}</Text>
            </Text>
          </View>

          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={pick({ en: 'Title (optional)', fr: 'Titre (optionnel)', ko: '제목 (선택)' })}
            placeholderTextColor={Colors.textTertiary}
            maxLength={140}
            testID="compose-title"
          />
          <View style={styles.divider} />
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder={pick({
              en: 'Ask a question, share a clean tip, debate an ingredient…',
              fr: 'Pose une question, partage un bon plan clean, débats d\'un ingrédient…',
              ko: '질문하거나, 건강 팁을 공유하거나, 성분에 대해 토론해 보세요…',
            })}
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={5000}
            textAlignVertical="top"
            testID="compose-body"
          />

          <View style={styles.moderationNote}>
            <Sparkles color={Colors.textTertiary} size={14} />
            <Text style={styles.moderationNoteText}>
              {pick({
                en: 'Every topic is checked by AI before it goes live, to keep the Hub respectful and safe.',
                fr: "Chaque sujet est vérifié par l'IA avant publication, pour garder le Hub respectueux et sûr.",
                ko: '모든 주제는 게시 전 AI가 검토하여 Hub를 안전하고 존중하는 공간으로 유지합니다.',
              })}
            </Text>
          </View>
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
  publishButton: { minWidth: 84, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  publishButtonDisabled: { opacity: 0.4 },
  publishText: { color: Colors.white, fontSize: 15, fontWeight: '800' as const, letterSpacing: -0.2 },
  content: { padding: 20, paddingBottom: 40 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primaryLight, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 18 },
  identityText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' as const },
  identityName: { color: Colors.primary, fontWeight: '800' as const },
  titleInput: { fontSize: 21, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4, paddingVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: 8 },
  bodyInput: { fontSize: 16.5, lineHeight: 24, color: Colors.text, minHeight: 200, paddingTop: 6 },
  moderationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 24, backgroundColor: Colors.surfaceSecondary, borderRadius: 14, padding: 14 },
  moderationNoteText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: Colors.textSecondary },
});
