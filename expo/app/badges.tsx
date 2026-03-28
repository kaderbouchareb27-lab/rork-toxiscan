import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Lock,
  Share2,
  Footprints,
  Search,
  Award,
  Target,
  Trophy,
  Leaf,
  ShoppingBag,
  Home,
  Shield,
  Heart,
  Megaphone,
  Zap,
  Crown,
  MessageCircle,
  GraduationCap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBadges, BADGE_DEFINITIONS, BadgeDefinition } from '@/providers/BadgesProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

const CONFETTI_COLORS = ['#34C759', '#FFD700', '#FF3B30', '#007AFF', '#FF9500', '#AF52DE', '#FF2D55', '#00C7BE'];

function getBadgeIcon(iconName: string, size: number, color: string) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (iconName) {
    case 'footprints': return <Footprints {...props} />;
    case 'search': return <Search {...props} />;
    case 'award': return <Award {...props} />;
    case 'target': return <Target {...props} />;
    case 'trophy': return <Trophy {...props} />;
    case 'leaf': return <Leaf {...props} />;
    case 'shopping-bag': return <ShoppingBag {...props} />;
    case 'home': return <Home {...props} />;
    case 'shield': return <Shield {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'share': return <Share2 {...props} />;
    case 'megaphone': return <Megaphone {...props} />;
    case 'zap': return <Zap {...props} />;
    case 'crown': return <Crown {...props} />;
    case 'message-circle': return <MessageCircle {...props} />;
    case 'graduation-cap': return <GraduationCap {...props} />;
    default: return <Award {...props} />;
  }
}

function ConfettiPiece({ index, isVisible }: { index: number; isVisible: boolean }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) return;

    const startX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
    const endX = startX + (Math.random() - 0.5) * 100;

    translateX.setValue(startX);
    translateY.setValue(-20);
    opacity.setValue(1);

    const delay = Math.random() * 400;

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: Dimensions.get('window').height * 0.6,
          duration: 1800 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: endX,
          duration: 1800 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() * 10,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1200),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);
  }, [isVisible, translateY, translateX, opacity, rotate]);

  if (!isVisible) return null;

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + Math.random() * 6;
  const isCircle = index % 3 === 0;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          width: isCircle ? size : size * 0.6,
          height: isCircle ? size : size * 1.5,
          borderRadius: isCircle ? size / 2 : 2,
          transform: [
            { translateX },
            { translateY },
            { rotate: rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '720deg'] }) },
          ],
          opacity,
        },
      ]}
    />
  );
}

function BadgeCard({
  badge,
  isUnlocked,
  onShare,
}: {
  badge: BadgeDefinition;
  isUnlocked: boolean;
  onShare: (badge: BadgeDefinition) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (!isUnlocked) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [isUnlocked, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.badgeCard,
          isUnlocked && styles.badgeCardUnlocked,
          badge.isGolden && isUnlocked && styles.badgeCardGolden,
        ]}
        activeOpacity={isUnlocked ? 0.8 : 1}
        onPress={handlePress}
        testID={`badge-${badge.id}`}
      >
        <View
          style={[
            styles.badgeIconContainer,
            {
              backgroundColor: isUnlocked
                ? badge.isGolden ? 'rgba(255, 215, 0, 0.15)' : `${badge.color}15`
                : '#F2F2F7',
            },
          ]}
        >
          {isUnlocked ? (
            getBadgeIcon(badge.icon, 28, badge.color)
          ) : (
            <Lock color="#C7C7CC" size={24} strokeWidth={1.5} />
          )}
        </View>
        <Text
          style={[
            styles.badgeName,
            !isUnlocked && styles.badgeNameLocked,
            badge.isGolden && isUnlocked && styles.badgeNameGolden,
          ]}
          numberOfLines={1}
        >
          {badge.name}
        </Text>
        <Text style={[styles.badgeDescription, !isUnlocked && styles.badgeDescriptionLocked]} numberOfLines={2}>
          {badge.description}
        </Text>
        {isUnlocked && (
          <TouchableOpacity
            style={styles.badgeShareButton}
            onPress={() => onShare(badge)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Share2 color={Colors.textSecondary} size={13} />
            <Text style={styles.badgeShareText}>Partager</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BadgesScreen() {
  const {
    badges,
    unlockedCount,
    totalCount,
    shareCount,
    newlyUnlocked,
    shareRewardMessage,
    dismissNewBadge,
    dismissShareReward,
  } = useBadges();

  const showConfetti = newlyUnlocked !== null || shareRewardMessage !== null;

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, []);

  const handleShareBadge = useCallback(async (badge: BadgeDefinition) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Share.share({
        message: `J'ai débloqué le badge "${badge.name}" sur ToxiScan ! ${badge.description}\n\nScannez vos produits gratuitement avec ToxiScan — disponible sur l'App Store`,
      });
    } catch (error) {
      console.log('[Badges] Share error:', error);
    }
  }, []);

  const handleDismissNewBadge = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dismissNewBadge();
  }, [dismissNewBadge]);

  const handleDismissReward = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dismissShareReward();
  }, [dismissShareReward]);

  const scanBadges = useMemo(() => BADGE_DEFINITIONS.filter(b => b.category === 'scan'), []);
  const greenBadges = useMemo(() => BADGE_DEFINITIONS.filter(b => b.category === 'green'), []);
  const shareBadges = useMemo(() => BADGE_DEFINITIONS.filter(b => b.category === 'share'), []);
  const drToxiBadges = useMemo(() => BADGE_DEFINITIONS.filter(b => b.category === 'drtoxi'), []);

  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const renderSection = useCallback((title: string, items: BadgeDefinition[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.badgesGrid}>
        {items.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isUnlocked={badges[badge.id]?.unlockedAt !== null}
            onShare={handleShareBadge}
          />
        ))}
      </View>
    </View>
  ), [badges, handleShareBadge]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes badges</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.trophyContainer}>
              <Trophy color="#FFD700" size={28} strokeWidth={1.8} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryCount}>{unlockedCount}/{totalCount}</Text>
              <Text style={styles.summaryLabel}>badges débloqués</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.max(progressPercent, 2)}%` }]} />
          </View>
          <View style={styles.shareCountRow}>
            <Share2 color={Colors.primary} size={14} />
            <Text style={styles.shareCountText}>{shareCount} partage{shareCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {renderSection('Badges de scan', scanBadges)}
        {renderSection('Produits verts', greenBadges)}
        {renderSection('Partage', shareBadges)}
        {renderSection('Dr. Toxi', drToxiBadges)}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={newlyUnlocked !== null} transparent animationType="fade" onRequestClose={handleDismissNewBadge}>
        <View style={styles.celebrationOverlay}>
          {showConfetti && Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece key={`confetti-${i}`} index={i} isVisible={showConfetti} />
          ))}
          {newlyUnlocked && (
            <View style={styles.celebrationCard}>
              <View style={[styles.celebrationIcon, { backgroundColor: `${newlyUnlocked.color}15` }]}>
                {getBadgeIcon(newlyUnlocked.icon, 48, newlyUnlocked.color)}
              </View>
              <Text style={styles.celebrationTitle}>Badge débloqué !</Text>
              <Text style={[styles.celebrationBadgeName, newlyUnlocked.isGolden && { color: '#B8860B' }]}>
                {newlyUnlocked.name}
              </Text>
              <Text style={styles.celebrationDescription}>{newlyUnlocked.description}</Text>
              <TouchableOpacity style={styles.celebrationButton} onPress={handleDismissNewBadge} activeOpacity={0.85}>
                <Text style={styles.celebrationButtonText}>Super !</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={shareRewardMessage !== null} transparent animationType="fade" onRequestClose={handleDismissReward}>
        <View style={styles.celebrationOverlay}>
          {showConfetti && Array.from({ length: 50 }).map((_, i) => (
            <ConfettiPiece key={`reward-confetti-${i}`} index={i} isVisible={showConfetti} />
          ))}
          {shareRewardMessage && (
            <View style={styles.celebrationCard}>
              <View style={[styles.celebrationIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                <Crown color="#FFD700" size={48} strokeWidth={1.8} />
              </View>
              <Text style={styles.celebrationTitle}>Récompense débloquée !</Text>
              <Text style={styles.rewardMessage}>{shareRewardMessage}</Text>
              <TouchableOpacity style={styles.celebrationButton} onPress={handleDismissReward} activeOpacity={0.85}>
                <Text style={styles.celebrationButtonText}>Merci !</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  trophyContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryCount: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  shareCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareCountText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: BADGE_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeCardUnlocked: {
    borderColor: 'rgba(52, 199, 89, 0.2)',
    backgroundColor: '#FAFFFE',
  },
  badgeCardGolden: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: '#FFFEF5',
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: Colors.textTertiary,
  },
  badgeNameGolden: {
    color: '#B8860B',
  },
  badgeDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 8,
  },
  badgeDescriptionLocked: {
    color: Colors.textTertiary,
  },
  badgeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  badgeShareText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  bottomSpacer: {
    height: 20,
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    left: SCREEN_WIDTH / 2,
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  celebrationIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  celebrationBadgeName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 8,
  },
  celebrationDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  rewardMessage: {
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  celebrationButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  celebrationButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
// Badges screen
