export type DrToxiVerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve' | 'ultratoxic';

/**
 * An avatar source: either a remote URL (string) or a bundled local asset
 * (number returned by require). Pass directly to expo-image's `source` prop,
 * or through `toDrToxiImageSource` for React Native's core <Image>.
 */
export type DrToxiAvatarSource = string | number;

export const DR_TOXI_DEFAULT_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/97a5e938-5054-43f6-b4a0-83e39183f2a6.png';

export const DR_TOXI_DANGER_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/27e289be-6c64-40c0-bfe4-ebbf77f17086.png';
export const DR_TOXI_WARNING_AVATAR_URI = 'https://r2-pub.rork.com/generated-images/b9ff7bc4-d4a6-403e-8395-770f89c2fa8a.png';
/**
 * MODERATION 🟡 ("Occasionally") avatar — the same broccoli-doctor character in his
 * lab coat, but with the danger sign removed and a warm, relaxed smile. A moderate
 * verdict is reassuring, not alarming, so this yellow avatar stays friendly. The
 * worried/hazard expression is reserved for the orange (warning) tier and above.
 */
export const DR_TOXI_MODERATION_AVATAR_URI = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/94480753-1473-44d4-93b5-06b7fa0d7f0e.png';

/**
 * ULTRA TOXIC 🟥 avatar — the original terrified bordeaux Dr. Toxi (hands on face,
 * full broccoli hair, sweat drops, doctor coat). This generation is framed with
 * generous padding around the character, so the hair fits the circular badge
 * without being clipped.
 */
export const DR_TOXI_ULTRA_TOXIC_AVATAR: DrToxiAvatarSource = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/041a925d-93b4-43ab-829a-5a634484cbe0.png';

/**
 * ULTRA TOXIC 🟥 avatar used in the HISTORY LIST ONLY — a cleaner, friendlier
 * Dr. Toxi with deep burgundy (bordeaux) broccoli hair matching the Ultra toxique
 * badge color, instead of the heavier terrified monster. The scan-result verdict
 * card keeps the original DR_TOXI_ULTRA_TOXIC_AVATAR untouched.
 */
export const DR_TOXI_ULTRA_TOXIC_HISTORY_AVATAR: string = 'https://r2-pub.rork.com/projects/7x6ujs5cfo0x23gzhbn3e/assets/a1dce06b-e0bc-4a27-9139-b092d3f74567.png';

export const DR_TOXI_BADGE_AVATARS: Record<DrToxiVerdictLevel, DrToxiAvatarSource> = {
  danger: DR_TOXI_DANGER_AVATAR_URI,
  warning: DR_TOXI_WARNING_AVATAR_URI,
  moderation: DR_TOXI_MODERATION_AVATAR_URI,
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
 * Converts an avatar source into a value usable by React Native's core <Image>
 * `source` prop (expo-image accepts DrToxiAvatarSource directly).
 */
export function toDrToxiImageSource(avatar: DrToxiAvatarSource): number | { uri: string } {
  return typeof avatar === 'number' ? avatar : { uri: avatar };
}

/**
 * Returns the approved Dr. Toxi avatar variant for colored risk verdict badges.
 */
export function getDrToxiBadgeAvatarForVerdict(level: DrToxiVerdictLevel): DrToxiAvatarSource | null {
  return DR_TOXI_BADGE_AVATARS[level];
}

/**
 * Returns the Dr. Toxi avatar for a cosmetic verdict. The TOXIC (danger) level
 * uses the dedicated violet avatar; other levels reuse the standard variants.
 */
export function getDrToxiCosmeticAvatarForVerdict(level: DrToxiVerdictLevel): DrToxiAvatarSource | null {
  if (level === 'danger') return DR_TOXI_TOXIC_AVATAR;
  return DR_TOXI_BADGE_AVATARS[level];
}

/**
 * Maps the 6-tier food verdict to its Dr. Toxi avatar.
 */
export function getDrToxiAvatarForTier(tier: 'approved' | 'moderation' | 'processed' | 'carcinogenic' | 'ultra_toxic'): DrToxiAvatarSource {
  switch (tier) {
    case 'ultra_toxic': return DR_TOXI_ULTRA_TOXIC_AVATAR;
    case 'carcinogenic': return DR_TOXI_BADGE_AVATARS.danger;
    case 'processed': return DR_TOXI_BADGE_AVATARS.warning;
    case 'moderation': return DR_TOXI_BADGE_AVATARS.moderation;
    case 'approved':
    default: return DR_TOXI_BADGE_AVATARS.approuve;
  }
}
