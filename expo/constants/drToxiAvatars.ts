import type { RiskGroup } from '@/types';

export type DrToxiVerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

export const DR_TOXI_DEFAULT_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

export const DR_TOXI_BADGE_AVATARS: Record<'danger' | 'warning' | 'moderation', string> = {
  danger: 'https://r2-pub.rork.com/generated-images/56be70c6-a769-45ba-82ec-33d4fa3eb4d5.png',
  warning: 'https://r2-pub.rork.com/generated-images/b9ff7bc4-d4a6-403e-8395-770f89c2fa8a.png',
  moderation: 'https://r2-pub.rork.com/generated-images/f7afa0f8-dad2-4d9a-ad05-53956011be10.png',
};

/**
 * Returns the approved Dr. Toxi avatar variant for colored risk verdict badges.
 */
export function getDrToxiBadgeAvatarForVerdict(level: DrToxiVerdictLevel): string | null {
  if (level === 'approuve') return null;
  return DR_TOXI_BADGE_AVATARS[level];
}

/**
 * Maps saved scan risk groups to the matching Dr. Toxi badge avatar.
 */
export function getDrToxiBadgeAvatarForRiskGroup(group: RiskGroup): string | null {
  switch (group) {
    case 'group1':
      return DR_TOXI_BADGE_AVATARS.danger;
    case 'group2a':
      return DR_TOXI_BADGE_AVATARS.warning;
    case 'group2b':
      return DR_TOXI_BADGE_AVATARS.moderation;
    case 'none':
    default:
      return null;
  }
}
