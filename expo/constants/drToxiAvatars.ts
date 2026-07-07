export type DrToxiVerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve' | 'ultratoxic';

export const DR_TOXI_DEFAULT_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

/**
 * ULTRA TOXIC 🟥 avatar — visually identical to the CARCINOGENIC (danger) avatar
 * (same shocked/terrified pose, hands on face, lab coat, stethoscope), but the
 * character is tinted deep bordeaux (#6A3338) instead of bright red.
 */
export const DR_TOXI_ULTRA_TOXIC_AVATAR = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/9a6b5672-f6d6-4287-814c-a24a98c1612d.png';

export const DR_TOXI_BADGE_AVATARS: Record<DrToxiVerdictLevel, string> = {
  danger: 'https://r2-pub.rork.com/generated-images/27e289be-6c64-40c0-bfe4-ebbf77f17086.png',
  warning: 'https://r2-pub.rork.com/generated-images/b9ff7bc4-d4a6-403e-8395-770f89c2fa8a.png',
  moderation: 'https://r2-pub.rork.com/generated-images/060a2f78-45c6-4c6f-953f-9d8ca12edcce.png',
  // The positive/green verdict reuses the single canonical Dr. Toxi avatar so there is
  // exactly ONE green Dr. Toxi across the whole app (chat, scans, meal scores, weekly report).
  approuve: DR_TOXI_DEFAULT_AVATAR_URI,
  // 🟥 ULTRA TOXIC tier — dedicated bordeaux extreme-fear avatar (one step below carcinogenic).
  ultratoxic: DR_TOXI_ULTRA_TOXIC_AVATAR,
};

/**
 * Cosmetic TOXIC verdict avatar — same scared Dr. Toxi character as the others,
 * tinted in the cosmetic TOXIC violet (#7C3AED).
 */
export const DR_TOXI_TOXIC_AVATAR = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/e296eb29-2e3a-427a-b456-1043176e5ca9.png';

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
 * Maps the 6-tier food verdict to its Dr. Toxi avatar.
 */
export function getDrToxiAvatarForTier(tier: 'approved' | 'moderation' | 'processed' | 'carcinogenic' | 'ultra_toxic'): string {
  switch (tier) {
    case 'ultra_toxic': return DR_TOXI_ULTRA_TOXIC_AVATAR;
    case 'carcinogenic': return DR_TOXI_BADGE_AVATARS.danger;
    case 'processed': return DR_TOXI_BADGE_AVATARS.warning;
    case 'moderation': return DR_TOXI_BADGE_AVATARS.moderation;
    case 'approved':
    default: return DR_TOXI_BADGE_AVATARS.approuve;
  }
}
