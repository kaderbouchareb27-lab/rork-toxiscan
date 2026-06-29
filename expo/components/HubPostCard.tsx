import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MessageCircle, MoreHorizontal, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { hubVerdictColor, hubVerdictLabel, hubAvatarColor, hubInitials, hubTimeAgo } from '@/utils/hubUi';
import type { HubPost } from '@/utils/hubApi';

interface Props {
  post: HubPost;
  onPress: () => void;
  onLike: () => void;
  onMenu: () => void;
}

function HubPostCard({ post, onPress, onLike, onMenu }: Props) {
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.stopAnimation();
    heartScale.setValue(0.6);
    Animated.spring(heartScale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: Platform.OS !== 'web' }).start();
    onLike();
  }, [heartScale, onLike]);

  const isDenunciation = post.kind === 'denunciation';
  const verdictColor = hubVerdictColor(post.verdictLevel);
  const avatarColor = hubAvatarColor(post.authorId);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      testID={`hub-post-${post.id}`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{hubInitials(post.authorName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.pseudo} numberOfLines={1}>{post.authorName}</Text>
          <Text style={styles.time}>{hubTimeAgo(post.createdAt)}</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={onMenu} hitSlop={10} testID={`hub-menu-${post.id}`}>
          <MoreHorizontal color={Colors.textTertiary} size={20} />
        </TouchableOpacity>
      </View>

      {isDenunciation ? (
        <View style={styles.denounceBanner}>
          <ShieldAlert color={verdictColor} size={15} strokeWidth={2.4} />
          <Text style={styles.denounceLabel}>
            {pick({ en: 'DENUNCIATION', fr: 'DÉNONCIATION', ko: '고발' })}
          </Text>
          {post.verdictLevel ? (
            <View style={[styles.verdictPill, { backgroundColor: verdictColor }]}>
              <Text style={styles.verdictPillText}>{hubVerdictLabel(post.verdictLevel)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {post.title ? <Text style={styles.title}>{post.title}</Text> : null}

      {isDenunciation && post.productName ? (
        <Text style={styles.productName} numberOfLines={1}>{post.productName}</Text>
      ) : null}

      {post.body ? (
        <Text style={styles.body} numberOfLines={isDenunciation ? 2 : 3}>{post.body}</Text>
      ) : null}

      {isDenunciation && post.imageUrl ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: post.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
          <View style={[styles.imageVerdictTag, { backgroundColor: verdictColor }]} />
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.action} onPress={handleLike} testID={`hub-like-${post.id}`} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Heart
              color={post.likedByMe ? '#D0260F' : Colors.textTertiary}
              fill={post.likedByMe ? '#D0260F' : 'transparent'}
              size={19}
              strokeWidth={2.2}
            />
          </Animated.View>
          <Text style={[styles.actionText, post.likedByMe && { color: '#D0260F' }]}>{post.likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.action}>
          <MessageCircle color={Colors.textTertiary} size={19} strokeWidth={2.2} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(HubPostCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.992 }] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' as const, letterSpacing: -0.2 },
  headerText: { flex: 1 },
  pseudo: { fontSize: 14.5, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2 },
  time: { fontSize: 12.5, color: Colors.textTertiary, marginTop: 1 },
  menuButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  denounceBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  denounceLabel: { fontSize: 11, fontWeight: '900' as const, color: Colors.textSecondary, letterSpacing: 1 },
  verdictPill: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
  verdictPillText: { fontSize: 10.5, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginTop: 12, lineHeight: 23 },
  productName: { fontSize: 15.5, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.2, marginTop: 10 },
  body: { fontSize: 14.5, lineHeight: 21, color: Colors.textSecondary, marginTop: 6 },
  imageWrap: { marginTop: 13, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary, height: 180 },
  image: { width: '100%', height: '100%' },
  imageVerdictTag: { position: 'absolute', top: 0, left: 0, width: 6, height: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionText: { fontSize: 14, fontWeight: '700' as const, color: Colors.textSecondary },
});
