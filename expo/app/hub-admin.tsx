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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { X, ShieldCheck, BadgeCheck, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { useHub } from '@/providers/HubProvider';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';

export default function HubAdminScreen() {
  const { isAdmin, unlockAdmin, lockAdmin } = useHub();
  const [draft, setDraft] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);

  const handleUnlock = useCallback(async () => {
    const secret = draft.trim();
    if (!secret || checking) return;
    setChecking(true);
    try {
      const ok = await unlockAdmin(secret);
      if (ok) {
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          pick({ en: 'Invalid key', fr: 'Clé invalide', ko: '잘못된 키' }),
          pick({ en: 'This admin key is not recognized.', fr: "Cette clé admin n'est pas reconnue.", ko: '이 관리자 키는 인식되지 않습니다.' }),
        );
      }
    } catch {
      Alert.alert(
        pick({ en: 'Connection issue', fr: 'Problème de connexion', ko: '연결 문제' }),
        pick({ en: 'Please try again in a moment.', fr: 'Réessaie dans un instant.', ko: '잠시 후 다시 시도해 주세요.' }),
      );
    } finally {
      setChecking(false);
    }
  }, [draft, checking, unlockAdmin]);

  const handleLogout = useCallback(async () => {
    await lockAdmin();
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.back();
  }, [lockAdmin]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={10} testID="admin-close">
          <X color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pick({ en: 'ToxiScan Team', fr: 'Équipe ToxiScan', ko: 'ToxiScan 팀' })}</Text>
        <View style={styles.closeButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.previewWrap}>
            <View style={styles.avatar}>
              <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.avatarImg} contentFit="contain" />
            </View>
            <View style={styles.previewBadge}>
              <BadgeCheck color={Colors.primary} size={14} strokeWidth={2.6} />
              <Text style={styles.previewBadgeText}>{pick({ en: 'Official', fr: 'Officiel', ko: '공식' })}</Text>
            </View>
            <Text style={styles.previewSub}>
              {isAdmin
                ? pick({ en: 'Admin mode is active. Your replies appear as the official ToxiScan Team.', fr: "Le mode admin est actif. Tes réponses apparaissent en tant qu'Équipe ToxiScan officielle.", ko: '관리자 모드가 활성화되었습니다. 답글이 공식 ToxiScan 팀으로 표시됩니다.' })
                : pick({ en: 'Enter your admin key to reply as the official ToxiScan Team and moderate comments.', fr: "Saisis ta clé admin pour répondre en tant qu'Équipe ToxiScan officielle et modérer les commentaires.", ko: '관리자 키를 입력하면 공식 ToxiScan 팀으로 답글을 달고 댓글을 관리할 수 있습니다.' })}
            </Text>
          </View>

          {isAdmin ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.9} testID="admin-logout">
              <LogOut color={Colors.danger} size={18} strokeWidth={2.4} />
              <Text style={styles.logoutText}>{pick({ en: 'Exit admin mode', fr: 'Quitter le mode admin', ko: '관리자 모드 종료' })}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={pick({ en: 'Admin key', fr: 'Clé admin', ko: '관리자 키' })}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                testID="admin-input"
              />
              <TouchableOpacity
                style={[styles.unlockButton, (!draft.trim() || checking) && styles.unlockButtonDisabled]}
                onPress={handleUnlock}
                disabled={!draft.trim() || checking}
                activeOpacity={0.9}
                testID="admin-unlock"
              >
                {checking ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <ShieldCheck color={Colors.white} size={18} strokeWidth={2.6} />
                    <Text style={styles.unlockText}>{pick({ en: 'Unlock admin mode', fr: 'Activer le mode admin', ko: '관리자 모드 활성화' })}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
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
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.primaryBorder, overflow: 'hidden' },
  avatarImg: { width: 78, height: 78 },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: Colors.primaryBorder },
  previewBadgeText: { fontSize: 13, fontWeight: '900' as const, color: Colors.primary, letterSpacing: 0.2 },
  previewSub: { fontSize: 13.5, lineHeight: 20, color: Colors.textTertiary, textAlign: 'center', marginTop: 12, maxWidth: 300 },
  input: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primaryBorder, paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  unlockButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: Colors.primary, borderRadius: 18, paddingVertical: 17, marginTop: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 6 },
  unlockButtonDisabled: { opacity: 0.4 },
  unlockText: { color: Colors.white, fontSize: 16.5, fontWeight: '800' as const, letterSpacing: -0.2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: Colors.surface, borderRadius: 18, paddingVertical: 17, marginTop: 10, borderWidth: 1.5, borderColor: Colors.border },
  logoutText: { color: Colors.danger, fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.2 },
});
