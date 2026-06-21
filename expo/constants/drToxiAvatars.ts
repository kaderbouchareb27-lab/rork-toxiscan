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
 * Cosmetic TOXIC verdict avatar — same scared Dr. Toxi character as the others,
 * tinted in the cosmetic TOXIC violet (#7C3AED).
 */
export const DR_TOXI_TOXIC_AVATAR = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/e296eb29-2e3a-427a-b456-1043176e5ca9.png';

/**
 * TOXIC LOAD / DANGER CUMULÉ / 과다 위험 avatar — same Dr. Toxi character with a
 * more serious, concerned expression, tinted in the bordeaux toxic-load color (#722F37).
 */
export const DR_TOXI_TOXIC_LOAD_AVATAR = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/b0215852-e4b8-46db-abe6-4bbc69ca2fad.png';

/**
 * Returns the approved Dr. Toxi avatar variant for colored risk verdict badges.
 */
export function getDrToxiBadgeAvatarForVerdict(level: DrToxiVerdictLevel): string | null {
  return DR_TOXI_BADGE_AVATARS[level];
}

/**
 * Returns the Dr. Toxi avatar for a cosmetic verdict. The TOXIC (danger) level
 * uses the dedicated violet avatar; other levels reuse the standard variants.
 */
export function getDrToxiCosmeticAvatarForVerdict(level: DrToxiVerdictLevel): string | null {
  if (level === 'danger') return DR_TOXI_TOXIC_AVATAR;
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
