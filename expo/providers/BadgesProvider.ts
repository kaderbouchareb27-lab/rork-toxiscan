import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { t } from '@/utils/i18n';

export function getBadgeName(id: string): string {
  return t(`badge_name_${id}` as Parameters<typeof t>[0]);
}

export function getBadgeDescription(id: string): string {
  return t(`badge_desc_${id}` as Parameters<typeof t>[0]);
}

const BADGES_STORAGE_KEY = 'toxiscan_badges';
const REWARD_STORAGE_KEY = 'toxiscan_share_rewards';

export type BadgeCategory = 'scan' | 'green' | 'share' | 'drtoxi';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  threshold: number;
  icon: string;
  color: string;
  isGolden?: boolean;
}

export interface BadgeState {
  unlockedAt: string | null;
}

export interface ShareRewards {
  month25Claimed: boolean;
  year100Claimed: boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'scan_1', name: 'Premier pas', description: 'Premier produit scanné', category: 'scan', threshold: 1, icon: 'footprints', color: '#34C759' },
  { id: 'scan_10', name: 'Détective santé', description: '10 produits scannés', category: 'scan', threshold: 10, icon: 'search', color: '#007AFF' },
  { id: 'scan_50', name: 'Expert en étiquettes', description: '50 produits scannés', category: 'scan', threshold: 50, icon: 'award', color: '#FF9500' },
  { id: 'scan_100', name: 'Chasseur de toxines', description: '100 produits scannés', category: 'scan', threshold: 100, icon: 'target', color: '#FF3B30' },
  { id: 'scan_500', name: 'Légende Dr.Toxi', description: '500 produits scannés', category: 'scan', threshold: 500, icon: 'trophy', color: '#AF52DE' },

  { id: 'green_1', name: 'Bon choix', description: 'Premier produit vert trouvé', category: 'green', threshold: 1, icon: 'leaf', color: '#34C759' },
  { id: 'green_10', name: 'Panier sain', description: '10 produits verts trouvés', category: 'green', threshold: 10, icon: 'shopping-bag', color: '#34C759' },
  { id: 'green_25', name: 'Frigo propre', description: '25 produits verts trouvés', category: 'green', threshold: 25, icon: 'home', color: '#34C759' },
  { id: 'green_50', name: 'Maison saine', description: '50 produits verts trouvés', category: 'green', threshold: 50, icon: 'shield', color: '#007AFF' },
  { id: 'green_100', name: 'Mode de vie sain', description: '100 produits verts trouvés', category: 'green', threshold: 100, icon: 'heart', color: '#FF2D55' },

  { id: 'share_1', name: 'Ambassadeur', description: 'Premier partage sur les réseaux sociaux', category: 'share', threshold: 1, icon: 'share', color: '#007AFF' },
  { id: 'share_10', name: 'Influenceur santé', description: '10 partages', category: 'share', threshold: 10, icon: 'megaphone', color: '#FF9500' },
  { id: 'share_25', name: 'Viral', description: '25 partages', category: 'share', threshold: 25, icon: 'zap', color: '#FF3B30' },
  { id: 'share_100', name: 'Ambassadeur Légendaire', description: '100 partages — Badge doré exclusif rare', category: 'share', threshold: 100, icon: 'crown', color: '#FFD700', isGolden: true },

  { id: 'drtoxi_1', name: 'Curieux', description: 'Première question à Dr. Toxi', category: 'drtoxi', threshold: 1, icon: 'message-circle', color: '#34C759' },
  { id: 'drtoxi_10', name: 'Étudiant en santé', description: '10 questions posées', category: 'drtoxi', threshold: 10, icon: 'graduation-cap', color: '#007AFF' },
];

interface BadgesData {
  badges: Record<string, BadgeState>;
  scanCount: number;
  greenCount: number;
  shareCount: number;
  drToxiCount: number;
}

function getDefaultBadgesData(): BadgesData {
  const badges: Record<string, BadgeState> = {};
  for (const def of BADGE_DEFINITIONS) {
    badges[def.id] = { unlockedAt: null };
  }
  return { badges, scanCount: 0, greenCount: 0, shareCount: 0, drToxiCount: 0 };
}

function getDefaultRewards(): ShareRewards {
  return { month25Claimed: false, year100Claimed: false };
}

export const [BadgesProvider, useBadges] = createContextHook(() => {
  const [data, setData] = useState<BadgesData>(getDefaultBadgesData());
  const [rewards, setRewards] = useState<ShareRewards>(getDefaultRewards());
  const [newlyUnlocked, setNewlyUnlocked] = useState<BadgeDefinition | null>(null);
  const [shareRewardMessage, setShareRewardMessage] = useState<string | null>(null);

  const badgesQuery = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BADGES_STORAGE_KEY);
      if (!stored) return getDefaultBadgesData();
      try {
        const parsed = JSON.parse(stored) as BadgesData;
        const merged = getDefaultBadgesData();
        merged.scanCount = parsed.scanCount ?? 0;
        merged.greenCount = parsed.greenCount ?? 0;
        merged.shareCount = parsed.shareCount ?? 0;
        merged.drToxiCount = parsed.drToxiCount ?? 0;
        for (const key of Object.keys(merged.badges)) {
          if (parsed.badges?.[key]) {
            merged.badges[key] = parsed.badges[key];
          }
        }
        return merged;
      } catch {
        return getDefaultBadgesData();
      }
    },
  });

  const rewardsQuery = useQuery({
    queryKey: ['shareRewards'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(REWARD_STORAGE_KEY);
      if (!stored) return getDefaultRewards();
      try {
        return JSON.parse(stored) as ShareRewards;
      } catch {
        return getDefaultRewards();
      }
    },
  });

  useEffect(() => {
    if (badgesQuery.data) {
      setData(badgesQuery.data);
    }
  }, [badgesQuery.data]);

  useEffect(() => {
    if (rewardsQuery.data) {
      setRewards(rewardsQuery.data);
    }
  }, [rewardsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: BadgesData) => {
      await AsyncStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
  });

  const saveRewardsMutation = useMutation({
    mutationFn: async (updated: ShareRewards) => {
      await AsyncStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
  });

  const checkAndUnlockBadges = useCallback((updatedData: BadgesData): BadgesData => {
    const now = new Date().toISOString();
    let firstNewBadge: BadgeDefinition | null = null;

    for (const def of BADGE_DEFINITIONS) {
      if (updatedData.badges[def.id]?.unlockedAt) continue;

      let currentCount = 0;
      if (def.category === 'scan') currentCount = updatedData.scanCount;
      else if (def.category === 'green') currentCount = updatedData.greenCount;
      else if (def.category === 'share') currentCount = updatedData.shareCount;
      else if (def.category === 'drtoxi') currentCount = updatedData.drToxiCount;

      if (currentCount >= def.threshold) {
        updatedData.badges[def.id] = { unlockedAt: now };
        console.log('[Badges] Unlocked:', def.id);
        if (!firstNewBadge) {
          firstNewBadge = def;
        }
      }
    }

    if (firstNewBadge) {
      setNewlyUnlocked(firstNewBadge);
    }

    return updatedData;
  }, []);

  const checkShareRewards = useCallback((shareCount: number, currentRewards: ShareRewards): ShareRewards => {
    const updated = { ...currentRewards };

    if (shareCount >= 25 && !updated.month25Claimed) {
      updated.month25Claimed = true;
      setShareRewardMessage(
        t('share_reward_25')
      );
      console.log('[Badges] Share reward: 25 shares milestone');
    } else if (shareCount >= 100 && !updated.year100Claimed) {
      updated.year100Claimed = true;
      setShareRewardMessage(
        t('share_reward_100')
      );
      console.log('[Badges] Share reward: 100 shares milestone');
    }

    return updated;
  }, []);

  const recordScan = useCallback((isGreen: boolean) => {
    setData(prev => {
      const updated: BadgesData = {
        ...prev,
        scanCount: prev.scanCount + 1,
        greenCount: isGreen ? prev.greenCount + 1 : prev.greenCount,
        badges: { ...prev.badges },
      };
      const checked = checkAndUnlockBadges(updated);
      saveMutation.mutate(checked);
      return checked;
    });
    console.log('[Badges] Recorded scan, isGreen:', isGreen);
  }, [checkAndUnlockBadges, saveMutation]);

  const recordShare = useCallback(() => {
    setData(prev => {
      const updated: BadgesData = {
        ...prev,
        shareCount: prev.shareCount + 1,
        badges: { ...prev.badges },
      };
      const checked = checkAndUnlockBadges(updated);
      saveMutation.mutate(checked);

      const newRewards = checkShareRewards(updated.shareCount, rewards);
      if (newRewards.month25Claimed !== rewards.month25Claimed || newRewards.year100Claimed !== rewards.year100Claimed) {
        setRewards(newRewards);
        saveRewardsMutation.mutate(newRewards);
      }

      return checked;
    });
    console.log('[Badges] Recorded share');
  }, [checkAndUnlockBadges, saveMutation, rewards, checkShareRewards, saveRewardsMutation]);

  const recordDrToxiQuestion = useCallback(() => {
    setData(prev => {
      const updated: BadgesData = {
        ...prev,
        drToxiCount: prev.drToxiCount + 1,
        badges: { ...prev.badges },
      };
      const checked = checkAndUnlockBadges(updated);
      saveMutation.mutate(checked);
      return checked;
    });
    console.log('[Badges] Recorded Dr. Toxi question');
  }, [checkAndUnlockBadges, saveMutation]);

  const dismissNewBadge = useCallback(() => {
    setNewlyUnlocked(null);
  }, []);

  const dismissShareReward = useCallback(() => {
    setShareRewardMessage(null);
  }, []);

  const unlockedCount = useMemo(() => {
    return Object.values(data.badges).filter(b => b.unlockedAt !== null).length;
  }, [data.badges]);

  const totalCount = BADGE_DEFINITIONS.length;

  return useMemo(() => ({
    badges: data.badges,
    scanCount: data.scanCount,
    greenCount: data.greenCount,
    shareCount: data.shareCount,
    drToxiCount: data.drToxiCount,
    unlockedCount,
    totalCount,
    newlyUnlocked,
    shareRewardMessage,
    rewards,
    recordScan,
    recordShare,
    recordDrToxiQuestion,
    dismissNewBadge,
    dismissShareReward,
    isLoading: badgesQuery.isLoading,
  }), [
    data, unlockedCount, totalCount, newlyUnlocked, shareRewardMessage, rewards,
    recordScan, recordShare, recordDrToxiQuestion, dismissNewBadge, dismissShareReward,
    badgesQuery.isLoading,
  ]);
});
