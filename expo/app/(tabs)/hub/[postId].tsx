import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, Heart, MoreHorizontal, ShieldAlert, Send, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { useHub, useHubPost } from '@/providers/HubProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { HubModerationError, type HubComment } from '@/utils/hubApi';
import { hubVerdictColor, hubVerdictLabel, hubAvatarColor, hubInitials, hubTimeAgo, moderationMessage } from '@/utils/hubUi';

export default function HubPostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const id = typeof postId === 'string' ? postId : '';
  const { isPro } = useSubscription();
  const { userId, toggleReaction, addComment, isCommenting, reportPost, reportComment, blockUser } = useHub();
  const { post, comments, isLoading, isError, refetch } = useHubPost(id);

  const [draft, setDraft] = useState<string>('');

  const handleLike = useCallback(() => {
    if (!post) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void toggleReaction(post.id);
  }, [post, toggleReaction]);

  const handleSend = useCallback(async () => {
    if (!post) return;
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    const body = draft.trim();
    if (!body) return;
    try {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addComment({ postId: post.id, body });
      setDraft('');
    } catch (e) {
      if (e instanceof HubModerationError) {
        Alert.alert(
          pick({ en: 'Comment not published', fr: 'Commentaire non publié', ko: '댓글이 게시되지 않음' }),
          moderationMessage(e.category),
        );
      } else {
        Alert.alert(
          pick({ en: 'Something went wrong', fr: "Une erreur s'est produite", ko: '오류가 발생했습니다' }),
          pick({ en: 'Please try again in a moment.', fr: 'Réessaie dans un instant.', ko: '잠시 후 다시 시도해 주세요.' }),
        );
      }
    }
  }, [post, isPro, draft, addComment]);

  const handlePostMenu = useCallback(() => {
    if (!post) return;
    const isOwn = post.authorId === userId;
    if (isOwn) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(post.authorName, undefined, [
      {
        text: pick({ en: 'Report this post', fr: 'Signaler ce post', ko: '이 게시물 신고' }),
        style: 'destructive',
        onPress: () => {
          void reportPost(post.id);
          Alert.alert(pick({ en: 'Thank you', fr: 'Merci', ko: '감사합니다' }), pick({ en: 'Our team will review it.', fr: "Notre équipe va vérifier.", ko: '저희 팀이 검토합니다.' }));
        },
      },
      {
        text: pick({ en: 'Block this member', fr: 'Bloquer ce membre', ko: '이 회원 차단' }),
        style: 'destructive',
        onPress: () => {
          void blockUser(post.authorId);
          router.back();
        },
      },
      { text: pick({ en: 'Cancel', fr: 'Annuler', ko: '취소' }), style: 'cancel' },
    ]);
  }, [post, userId, reportPost, blockUser]);

  const handleCommentMenu = useCallback((comment: HubComment) => {
    if (comment.authorId === userId) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(comment.authorName, undefined, [
      {
        text: pick({ en: 'Report this comment', fr: 'Signaler ce commentaire', ko: '이 댓글 신고' }),
        style: 'destructive',
        onPress: () => {
          void reportComment(comment.id);
          Alert.alert(pick({ en: 'Thank you', fr: 'Merci', ko: '감사합니다' }), pick({ en: 'Our team will review it.', fr: "Notre équipe va vérifier.", ko: '저희 팀이 검토합니다.' }));
        },
      },
      {
        text: pick({ en: 'Block this member', fr: 'Bloquer ce membre', ko: '이 회원 차단' }),
        style: 'destructive',
        onPress: () => { void blockUser(comment.authorId); },
      },
      { text: pick({ en: 'Cancel', fr: 'Annuler', ko: '취소' }), style: 'cancel' },
    ]);
  }, [userId, reportComment, blockUser]);

  const isDenunciation = post?.kind === 'denunciation';
  const verdictColor = hubVerdictColor(post?.verdictLevel ?? null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7} testID="hub-detail-back">
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isDenunciation
            ? pick({ en: 'Denunciation', fr: 'Dénonciation', ko: '고발' })
            : pick({ en: 'Discussion', fr: 'Discussion', ko: '토론' })}
        </Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : isError || !post ? (
        <View style={styles.center}>
          <Text style={styles.notFound}>{pick({ en: 'This post is no longer available.', fr: "Ce post n'est plus disponible.", ko: '이 게시물은 더 이상 볼 수 없습니다.' })}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
            <Text style={styles.retryText}>{pick({ en: 'Retry', fr: 'Réessayer', ko: '다시 시도' })}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Author */}
            <View style={styles.authorRow}>
              <View style={[styles.avatar, { backgroundColor: hubAvatarColor(post.authorId) }]}>
                <Text style={styles.avatarText}>{hubInitials(post.authorName)}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.pseudo}>{post.authorName}</Text>
                <Text style={styles.time}>{hubTimeAgo(post.createdAt)}</Text>
              </View>
              {post.authorId !== userId ? (
                <TouchableOpacity style={styles.menuButton} onPress={handlePostMenu} hitSlop={10} testID="hub-detail-menu">
                  <MoreHorizontal color={Colors.textTertiary} size={20} />
                </TouchableOpacity>
              ) : null}
            </View>

            {isDenunciation ? (
              <View style={styles.denounceBanner}>
                <ShieldAlert color={verdictColor} size={15} strokeWidth={2.4} />
                <Text style={styles.denounceLabel}>{pick({ en: 'DENUNCIATION', fr: 'DÉNONCIATION', ko: '고발' })}</Text>
                {post.verdictLevel ? (
                  <View style={[styles.verdictPill, { backgroundColor: verdictColor }]}>
                    <Text style={styles.verdictPillText}>{hubVerdictLabel(post.verdictLevel)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
            {isDenunciation && post.productName ? <Text style={styles.productName}>{post.productName}</Text> : null}

            {isDenunciation && post.imageUrl ? (
              <View style={styles.imageWrap}>
                <Image source={{ uri: post.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
              </View>
            ) : null}

            {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

            {/* Reactions */}
            <View style={styles.reactionRow}>
              <TouchableOpacity style={styles.likeButton} onPress={handleLike} activeOpacity={0.7} testID="hub-detail-like">
                <Heart color={post.likedByMe ? '#D0260F' : Colors.textSecondary} fill={post.likedByMe ? '#D0260F' : 'transparent'} size={20} strokeWidth={2.2} />
                <Text style={[styles.likeText, post.likedByMe && { color: '#D0260F' }]}>
                  {post.likeCount} {post.likeCount === 1 ? pick({ en: 'like', fr: "j'aime", ko: '좋아요' }) : pick({ en: 'likes', fr: "j'aime", ko: '좋아요' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comments */}
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                {pick({ en: 'Comments', fr: 'Commentaires', ko: '댓글' })} · {post.commentCount}
              </Text>
            </View>

            {comments.length === 0 ? (
              <Text style={styles.noComments}>
                {pick({ en: 'No comments yet. Be the first to reply.', fr: 'Aucun commentaire. Sois le premier à répondre.', ko: '아직 댓글이 없습니다. 첫 댓글을 남겨보세요.' })}
              </Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <View style={[styles.commentAvatar, { backgroundColor: hubAvatarColor(c.authorId) }]}>
                    <Text style={styles.commentAvatarText}>{hubInitials(c.authorName)}</Text>
                  </View>
                  <View style={styles.commentBubble}>
                    <View style={styles.commentTop}>
                      <Text style={styles.commentPseudo} numberOfLines={1}>{c.authorName}</Text>
                      <Text style={styles.commentTime}>{hubTimeAgo(c.createdAt)}</Text>
                      {c.authorId !== userId ? (
                        <TouchableOpacity onPress={() => handleCommentMenu(c)} hitSlop={8} testID={`hub-comment-menu-${c.id}`}>
                          <MoreHorizontal color={Colors.textTertiary} size={16} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={styles.commentBody}>{c.body}</Text>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 12 }} />
          </ScrollView>

          {/* Composer */}
          {isPro ? (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={pick({ en: 'Write a comment…', fr: 'Écris un commentaire…', ko: '댓글을 입력하세요…' })}
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={3000}
                testID="hub-comment-input"
              />
              <TouchableOpacity
                style={[styles.sendButton, (!draft.trim() || isCommenting) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!draft.trim() || isCommenting}
                activeOpacity={0.85}
                testID="hub-comment-send"
              >
                {isCommenting ? <ActivityIndicator color={Colors.white} size="small" /> : <Send color={Colors.white} size={18} strokeWidth={2.4} />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.proComposer} onPress={() => router.push('/paywall')} activeOpacity={0.85} testID="hub-comment-pro">
              <Lock color={Colors.primary} size={16} strokeWidth={2.4} />
              <Text style={styles.proComposerText}>
                {pick({ en: 'Comment with Dr.Toxi Pro', fr: 'Commenter avec Dr.Toxi Pro', ko: 'Dr.Toxi Pro로 댓글 달기' })}
              </Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  notFound: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primaryBorder },
  retryText: { color: Colors.primary, fontSize: 14.5, fontWeight: '700' as const },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const },
  pseudo: { fontSize: 15.5, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  time: { fontSize: 12.5, color: Colors.textTertiary, marginTop: 1 },
  menuButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  denounceBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  denounceLabel: { fontSize: 11, fontWeight: '900' as const, color: Colors.textSecondary, letterSpacing: 1 },
  verdictPill: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3.5, marginLeft: 'auto' },
  verdictPillText: { fontSize: 10.5, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5, marginTop: 14, lineHeight: 29 },
  productName: { fontSize: 17, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginTop: 12 },
  imageWrap: { marginTop: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary, height: 240 },
  image: { width: '100%', height: '100%' },
  body: { fontSize: 16, lineHeight: 24, color: Colors.text, marginTop: 14 },
  reactionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeText: { fontSize: 14.5, fontWeight: '700' as const, color: Colors.textSecondary },
  commentsHeader: { marginTop: 22, marginBottom: 4 },
  commentsTitle: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  noComments: { fontSize: 14, color: Colors.textTertiary, marginTop: 12, lineHeight: 20 },
  commentRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  commentAvatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' as const },
  commentBubble: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, borderTopLeftRadius: 4, padding: 13, borderWidth: 1, borderColor: Colors.border },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  commentPseudo: { flex: 1, fontSize: 13.5, fontWeight: '800' as const, color: Colors.text },
  commentTime: { fontSize: 11.5, color: Colors.textTertiary },
  commentBody: { fontSize: 14.5, lineHeight: 21, color: Colors.text },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input: { flex: 1, maxHeight: 120, backgroundColor: Colors.surfaceSecondary, borderRadius: 20, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: Colors.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  proComposer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  proComposerText: { fontSize: 15, fontWeight: '800' as const, color: Colors.primary, letterSpacing: -0.2 },
});
