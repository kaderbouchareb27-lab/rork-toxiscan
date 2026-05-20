import type { RiskGroup } from '@/types';

export type DrToxiVerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';

export const DR_TOXI_DEFAULT_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

export const DR_TOXI_BADGE_AVATARS: Record<DrToxiVerdictLevel, string> = {
  danger: 'https://r2-pub.rork.com/generated-images/27e289be-6c64-40c0-bfe4-ebbf77f17086.png',
  warning: 'https://r2-pub.rork.com/generated-images/b9ff7bc4-d4a6-403e-8395-770f89c2fa8a.png',
  moderation: 'https://r2-pub.rork.com/generated-images/060a2f78-45c6-4c6f-953f-9d8ca12edcce.png',
  approuve: 'https://r2-pub.rork.com/generated-images/fef91878-245c-412f-9512-9995c01331f9.png',
};

/**
 * Returns the approved Dr. Toxi avatar variant for colored risk verdict badges.
 */
export function getDrToxiBadgeAvatarForVerdict(level: DrToxiVerdictLevel): string | null {
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
      return DR_TOXI_BADGE_AVATARS.approuve;
    default:
      return null;
  }
}
