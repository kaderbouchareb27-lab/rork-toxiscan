import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus, ShieldCheck, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { DR_TOXI_DEFAULT_AVATAR_URI } from '@/constants/drToxiAvatars';
import { useHub, useHubFeed, type HubFilter } from '@/providers/HubProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import HubPostCard from '@/components/HubPostCard';
import type { HubPost } from '@/utils/hubApi';

const FILTERS: { key: HubFilter; label: () => string }[] = [
  { key: 'all', label: () => pick({ en: 'All', fr: 'Tout', ko: '전체' }) },
  { key: 'denunciation', label: () => pick({ en: 'Denunciations', fr: 'Dénonciations', ko: '고발' }) },
  { key: 'discussion', label: () => pick({ en: 'Discussions', fr: 'Discussions', ko: '토론' }) },
];

export default function HubFeedScreen() {
  const [filter, setFilter] = useState<HubFilter>('all');
  const { isPro } = useSubscription();
  const { userId, pseudo, toggleReaction, reportPost, blockUser } = useHub();
  const { posts, isLoading, isError, refetch, isRefetching } = useHubFeed(filter);

  const handleSelectFilter = useCallback((key: HubFilter) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setFilter(key);
  }, []);

  const handleNewTopic = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(isPro ? '/hub-compose' : '/paywall');
  }, [isPro]);

  const handleOpenPost = useCallback((post: HubPost) => {
    router.push(`/hub/${post.id}`);
  }, []);

  const handleLike = useCallback((post: HubPost) => {
    void toggleReaction(post.id);
  }, [toggleReaction]);

  const handleMenu = useCallback((post: HubPost) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isOwn = post.authorId === userId;
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];

    if (!isOwn) {
      buttons.push({
        text: pick({ en: 'Report this post', fr: 'Signaler ce post', ko: '이 게시물 신고' }),
        style: 'destructive',
        onPress: () => {
          void reportPost(post.id);
          Alert.alert(
            pick({ en: 'Thank you', fr: 'Merci', ko: '감사합니다' }),
            pick({
              en: 'Our team will review this post. It is hidden automatically if several members report it.',
              fr: "Notre équipe va vérifier ce post. Il est masqué automatiquement si plusieurs membres le signalent.",
              ko: '저희 팀이 이 게시물을 검토합니다. 여러 회원이 신고하면 자동으로 숨겨집니다.',
            }),
          );
        },
      });
      buttons.push({
        text: pick({ en: 'Block this member', fr: 'Bloquer ce membre', ko: '이 회원 차단' }),
        style: 'destructive',
        onPress: () => {
          void blockUser(post.authorId);
        },
      });
    }
    buttons.push({ text: pick({ en: 'Cancel', fr: 'Annuler', ko: '취소' }), style: 'cancel' });

    Alert.alert(post.authorName, isOwn ? pick({ en: 'This is your post.', fr: 'Ceci est ton post.', ko: '내 게시물입니다.' }) : undefined, buttons);
  }, [userId, reportPost, blockUser]);

  const renderItem = useCallback(({ item }: { item: HubPost }) => (
    <HubPostCard
      post={item}
      onPress={() => handleOpenPost(item)}
      onLike={() => handleLike(item)}
      onMenu={() => handleMenu(item)}
    />
  ), [handleOpenPost, handleLike, handleMenu]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>{pick({ en: 'Connection issue', fr: 'Problème de connexion', ko: '연결 문제' })}</Text>
          <Text style={styles.emptySub}>
            {pick({ en: 'Could not load the Hub. Pull to refresh or try again.', fr: 'Impossible de charger le Hub. Tire pour rafraîchir ou réessaie.', ko: 'Hub를 불러올 수 없습니다. 아래로 당겨 새로고침하세요.' })}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
            <RotateCcw color={Colors.primary} size={16} />
            <Text style={styles.retryText}>{pick({ en: 'Retry', fr: 'Réessayer', ko: '다시 시도' })}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centerState}>
        <View style={styles.emptyAvatarHalo}>
          <Image source={{ uri: DR_TOXI_DEFAULT_AVATAR_URI }} style={styles.emptyAvatar} contentFit="contain" />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === 'denunciation'
            ? pick({ en: 'No denunciations yet', fr: 'Aucune dénonciation pour le moment', ko: '아직 고발이 없습니다' })
            : pick({ en: 'Be the first to start a topic', fr: 'Sois le premier à lancer un sujet', ko: '첫 번째 주제를 시작해 보세요' })}
        </Text>
        <Text style={styles.emptySub}>
          {pick({
            en: 'Share a question, a clean tip, or denounce a toxic product straight from a scan.',
            fr: "Partage une question, un bon plan clean, ou dénonce un produit toxique directement depuis un scan.",
            ko: '질문이나 건강 팁을 공유하거나, 스캔에서 바로 유해 제품을 고발해 보세요.',
          })}
        </Text>
        <TouchableOpacity style={styles.emptyCta} onPress={handleNewTopic} activeOpacity={0.9}>
          <Plus color={Colors.white} size={18} strokeWidth={2.5} />
          <Text style={styles.emptyCtaText}>{pick({ en: 'New topic', fr: 'Nouveau sujet', ko: '새 주제' })}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, isError, filter, refetch, handleNewTopic]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <ShieldCheck color={Colors.primary} size={18} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.headerTitle}>NonToxic Hub</Text>
              <Text style={styles.headerSubtitle}>
                {pick({ en: 'The clean community', fr: 'La communauté clean', ko: '클린 커뮤니티' })}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.pseudoChip} onPress={() => router.push('/hub-pseudo')} activeOpacity={0.8} testID="hub-pseudo-chip">
            <Text style={styles.pseudoChipText} numberOfLines={1}>{pseudo || '…'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => handleSelectFilter(f.key)}
                activeOpacity={0.8}
                testID={`hub-filter-${f.key}`}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, posts.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching && posts.length > 0} onRefresh={refetch} tintColor={Colors.primary} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleNewTopic} activeOpacity={0.9} testID="hub-new-topic">
        <Plus color={Colors.white} size={22} strokeWidth={2.6} />
        <Text style={styles.fabText}>{pick({ en: 'New topic', fr: 'Nouveau sujet', ko: '새 주제' })}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  brandIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12.5, color: Colors.textTertiary, marginTop: 1, fontWeight: '600' as const },
  pseudoChip: { maxWidth: 130, backgroundColor: Colors.surfaceSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  pseudoChipText: { fontSize: 13, fontWeight: '700' as const, color: Colors.text },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { flex: 1, paddingVertical: 9, borderRadius: 13, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  filterPillActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '700' as const, color: Colors.textSecondary, letterSpacing: -0.1 },
  filterTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  listContentEmpty: { flexGrow: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 16 },
  emptyAvatarHalo: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyAvatar: { width: 80, height: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, textAlign: 'center' },
  emptySub: { fontSize: 14.5, lineHeight: 21, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 22, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 6 },
  emptyCtaText: { color: Colors.white, fontSize: 15.5, fontWeight: '800' as const, letterSpacing: -0.2 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primaryBorder },
  retryText: { color: Colors.primary, fontSize: 14.5, fontWeight: '700' as const },
  fab: {
    position: 'absolute', right: 20, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 30, paddingVertical: 15, paddingHorizontal: 22,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 16, elevation: 8,
  },
  fabText: { color: Colors.white, fontSize: 15.5, fontWeight: '800' as const, letterSpacing: -0.2 },
});
