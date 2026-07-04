import { t, tf, pick } from '@/utils/i18n';
import type { HubVerdictLevel, ModerationCategory } from '@/utils/hubApi';

/** Verdict accent color — reuses the scan system's palette. */
export function hubVerdictColor(level: HubVerdictLevel | null): string {
  switch (level) {
    case 'ultratoxic': return '#722F37';
    case 'danger': return '#D0260F';
    case 'warning': return '#E8730A';
    case 'moderation': return '#EAB308';
    case 'approuve': return '#2E9E34';
    default: return '#9AA39E';
  }
}

/** Localized verdict label, rendered in the viewer's language (not the author's). */
export function hubVerdictLabel(level: HubVerdictLevel | null): string {
  switch (level) {
    case 'ultratoxic': return pick({ en: 'ULTRA TOXIC', fr: 'ULTRA TOXIQUE', ko: '초독성' });
    case 'danger': return pick({ en: 'CARCINOGENIC', fr: 'CANCÉRIGÈNE', ko: '발암성' });
    case 'warning': return pick({ en: 'PROCESSED', fr: 'TRANSFORMÉ', ko: '가공' });
    case 'moderation': return pick({ en: 'MODERATION', fr: 'MODÉRATION', ko: '주의' });
    case 'approuve': return pick({ en: 'APPROVED', fr: 'APPROUVÉ', ko: '승인됨' });
    default: return '';
  }
}

const AVATAR_COLORS = [
  '#2E9E34', '#1B7F8C', '#7C3AED', '#E8730A', '#D0260F',
  '#0F766E', '#B45309', '#9333EA', '#2563EB', '#DB2777',
];

/** Stable color for a member's avatar bubble, derived from their id. */
export function hubAvatarColor(authorId: string): string {
  let hash = 0;
  for (let i = 0; i < authorId.length; i += 1) {
    hash = (hash * 31 + authorId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 1–2 letter initials for the avatar bubble. */
export function hubInitials(pseudo: string): string {
  const clean = (pseudo ?? '').trim();
  if (!clean) return '?';
  const upper = clean.replace(/[^\p{L}\p{N}]/gu, '');
  return upper.slice(0, 2).toUpperCase();
}

/** Localized relative time, reusing the app's existing time keys. */
export function hubTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('just_now');
  if (min < 60) return tf('minutes_ago', min);
  const hours = Math.floor(min / 60);
  if (hours < 24) return tf('hours_ago', hours);
  const days = Math.floor(hours / 24);
  return tf('days_ago', days);
}

/** Clear, localized explanation shown when AI moderation blocks a post/comment. */
export function moderationMessage(category: ModerationCategory): string {
  switch (category) {
    case 'harassment':
      return pick({
        en: 'This message looks like an insult or personal attack. Criticize products, not people — please rephrase.',
        fr: "Ce message ressemble à une insulte ou une attaque personnelle. Critique les produits, pas les personnes — reformule s'il te plaît.",
        ko: '이 메시지는 모욕이나 인신공격으로 보입니다. 사람이 아니라 제품을 비판해 주세요 — 다시 작성해 주세요.',
      });
    case 'sexual':
      return pick({
        en: 'This message contains sexual or adult content, which is not allowed in the Hub.',
        fr: "Ce message contient un contenu sexuel ou +18, interdit dans le Hub.",
        ko: '이 메시지에는 성적이거나 성인용 콘텐츠가 포함되어 있어 Hub에서 허용되지 않습니다.',
      });
    case 'spam':
      return pick({
        en: 'This looks like spam or advertising. Share a genuine opinion or question instead.',
        fr: "Cela ressemble à du spam ou de la publicité. Partage plutôt une vraie opinion ou question.",
        ko: '스팸이나 광고로 보입니다. 진솔한 의견이나 질문을 공유해 주세요.',
      });
    case 'medical_misinfo':
      return pick({
        en: 'This message may contain dangerous health misinformation, so it cannot be published.',
        fr: "Ce message peut contenir une désinformation médicale dangereuse, il ne peut donc pas être publié.",
        ko: '이 메시지에는 위험한 건강 허위 정보가 포함될 수 있어 게시할 수 없습니다.',
      });
    case 'hate':
      return pick({
        en: 'This message contains hate speech or discrimination, which is not allowed.',
        fr: "Ce message contient un discours de haine ou de la discrimination, ce qui est interdit.",
        ko: '이 메시지에는 혐오 발언이나 차별이 포함되어 있어 허용되지 않습니다.',
      });
    default:
      return pick({
        en: "This message goes against the Hub's community rules. Please rephrase it.",
        fr: "Ce message va à l'encontre des règles de la communauté du Hub. Merci de le reformuler.",
        ko: '이 메시지는 Hub 커뮤니티 규칙에 어긋납니다. 다시 작성해 주세요.',
      });
  }
}
