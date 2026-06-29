import { getDeviceLanguage } from '@/utils/i18n';

/**
 * Anonymous pseudo generator for NonToxic Hub. Style: "BrocoliVigilant47" —
 * a clean noun + an adjective + a small number. Localized so a French phone
 * gets French pseudos, etc. No email, no login: this is the member's whole
 * identity in the forum.
 */

const NOUNS: Record<'fr' | 'en' | 'ko', string[]> = {
  fr: ['Brocoli', 'Avocat', 'Curcuma', 'Épinard', 'Gingembre', 'Citron', 'Tomate', 'Carotte', 'Myrtille', 'Grenade', 'Amande', 'Kale', 'Quinoa', 'Basilic', 'Radis'],
  en: ['Broccoli', 'Avocado', 'Turmeric', 'Spinach', 'Ginger', 'Lemon', 'Tomato', 'Carrot', 'Blueberry', 'Pomegranate', 'Almond', 'Kale', 'Quinoa', 'Basil', 'Radish'],
  ko: ['브로콜리', '아보카도', '강황', '시금치', '생강', '레몬', '토마토', '당근', '블루베리', '석류', '아몬드', '케일', '퀴노아', '바질', '무'],
};

const ADJECTIVES: Record<'fr' | 'en' | 'ko', string[]> = {
  fr: ['Vigilant', 'Lucide', 'Curieux', 'Malin', 'Alerte', 'Sain', 'Futé', 'Éveillé', 'Tenace', 'Zen'],
  en: ['Vigilant', 'Lucid', 'Curious', 'Sharp', 'Alert', 'Healthy', 'Clever', 'Awake', 'Tenacious', 'Zen'],
  ko: ['예리한', '맑은', '호기심', '똑똑한', '경계', '건강한', '영리한', '깨어난', '끈질긴', '차분한'],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generates a fresh random pseudo in the current device language. */
export function generatePseudo(): string {
  const lang = getDeviceLanguage();
  const noun = pickRandom(NOUNS[lang]);
  const adj = pickRandom(ADJECTIVES[lang]);
  const num = Math.floor(Math.random() * 90) + 10; // 10–99
  if (lang === 'ko') return `${adj}${noun}${num}`;
  return `${noun}${adj}${num}`;
}

/** A short list of suggestions for the "change my pseudo" screen. */
export function generatePseudoSuggestions(count: number = 6): string[] {
  const set = new Set<string>();
  let guard = 0;
  while (set.size < count && guard < count * 6) {
    set.add(generatePseudo());
    guard += 1;
  }
  return Array.from(set);
}
