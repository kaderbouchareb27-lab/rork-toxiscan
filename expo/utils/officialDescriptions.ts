import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { OFFICIAL_DESCRIPTION_KEYS, OFFICIAL_DESCRIPTION_TEXTS } from '@/constants/officialDescriptions';
import { OFFICIAL_DESCRIPTIONS_FR, OFFICIAL_DESCRIPTIONS_KO } from '@/constants/officialDescriptionsI18n';
import { getDeviceLanguage } from '@/utils/i18n';
import { aiGenerateObject } from '@/utils/aiApi';

// ═══════════════════════════════════════════════════════════════════════
// DESCRIPTIONS OFFICIELLES — accès runtime + traduction automatique.
//
// Les 394 descriptions anglaises (constants/officialDescriptions.ts) sont la
// RÉFÉRENCE validée : quand un ingrédient en possède une, elle est servie
// telle quelle et l'IA ne génère PLUS JAMAIS de description pour lui.
//
// FR/KO : traductions FIGÉES, pré-générées hors ligne et livrées avec l'app
// (constants/officialDescriptionsI18n.ts, alignées par index sur l'anglais).
// Affichage instantané, hors ligne, zéro appel IA. La traduction runtime plus
// bas n'est plus qu'un filet de sécurité si un texte figé venait à manquer.
// ═══════════════════════════════════════════════════════════════════════

/** Same normalization as normalizeForLookup in utils/api.ts (ASCII + Hangul kept). */
function normalizeOfficialKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the OFFICIAL English description for an ingredient name and/or code,
 * or undefined when this ingredient has no official description (legacy behavior applies).
 */
export function getOfficialEn(name?: string | null, code?: string | null): string | undefined {
  for (const raw of [code, name]) {
    if (!raw) continue;
    const key = normalizeOfficialKey(String(raw).replace(/^en:/i, ''));
    if (!key) continue;
    const idx = OFFICIAL_DESCRIPTION_KEYS[key];
    if (idx !== undefined) return OFFICIAL_DESCRIPTION_TEXTS[idx];
  }
  return undefined;
}

const OFFICIAL_EN_SET: ReadonlySet<string> = new Set(OFFICIAL_DESCRIPTION_TEXTS);

/** English reference text -> its index, used for the frozen FR/KO lookup. */
const EN_INDEX: ReadonlyMap<string, number> = new Map(
  OFFICIAL_DESCRIPTION_TEXTS.map((t, i) => [t, i] as const),
);

const FROZEN_BY_LANG: Readonly<Record<string, readonly string[]>> = {
  fr: OFFICIAL_DESCRIPTIONS_FR,
  ko: OFFICIAL_DESCRIPTIONS_KO,
};

/** Every bundled translation, so callers can recognize an official translated text. */
const FROZEN_TEXT_SET: ReadonlySet<string> = new Set(
  [...OFFICIAL_DESCRIPTIONS_FR, ...OFFICIAL_DESCRIPTIONS_KO].filter((t) => t.length > 0),
);

/**
 * Bundled pre-translated text for an English reference description in `lang`,
 * or undefined when none ships for it (runtime translation then acts as fallback).
 */
function getFrozenTranslation(en: string, lang: string): string | undefined {
  const list = FROZEN_BY_LANG[lang];
  if (!list) return undefined;
  const idx = EN_INDEX.get(en);
  if (idx === undefined) return undefined;
  const translated = list[idx];
  return translated && translated.length > 0 ? translated : undefined;
}

/** True when `text` is one of the official ENGLISH reference descriptions. */
export function isOfficialEnText(text?: string | null): boolean {
  if (!text) return false;
  return OFFICIAL_EN_SET.has(text);
}

// ─────────────────────────────────────────────────────────────────────
// TRADUCTION AUTOMATIQUE — cache mémoire + AsyncStorage, par langue.
// ─────────────────────────────────────────────────────────────────────

function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

/** `${lang}:${hash(enText)}` → translated text. */
const translationCache = new Map<string, string>();
/** Every translated text ever served — lets callers recognize official (translated) texts. */
const translatedTextSet = new Set<string>();
const hydratedLangs = new Set<string>();
let hydrationPromise: Promise<void> | null = null;

function storageKey(lang: string): string {
  return `official_desc_i18n_v1_${lang}`;
}

/** True when `text` is an official description (English reference OR a cached translation). */
export function isOfficialDescriptionText(text?: string | null): boolean {
  if (!text) return false;
  return OFFICIAL_EN_SET.has(text) || FROZEN_TEXT_SET.has(text) || translatedTextSet.has(text);
}

/** Loads the persisted translation cache for the current language (no-op for EN / already loaded). */
export async function hydrateOfficialTranslations(): Promise<void> {
  const lang = getDeviceLanguage();
  if (lang === 'en' || hydratedLangs.has(lang)) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(lang));
      if (raw) {
        const record = JSON.parse(raw) as Record<string, string>;
        for (const [hash, translated] of Object.entries(record)) {
          if (typeof translated === 'string' && translated.trim().length > 0) {
            translationCache.set(`${lang}:${hash}`, translated);
            translatedTextSet.add(translated);
          }
        }
      }
      hydratedLangs.add(lang);
    } catch (err) {
      console.warn('[OfficialDesc] Failed to hydrate translation cache:', err instanceof Error ? err.message : String(err));
    } finally {
      hydrationPromise = null;
    }
  })();
  return hydrationPromise;
}

/**
 * Returns the display version of an official ENGLISH description in the current app
 * language: the bundled FR/KO translation (instant, offline), then any runtime-cached
 * translation, otherwise the English reference text (EN stays the source of truth).
 */
export function localizeOfficialText(en: string): string {
  const lang = getDeviceLanguage();
  if (lang === 'en') return en;
  return getFrozenTranslation(en, lang) ?? translationCache.get(`${lang}:${hashText(en)}`) ?? en;
}

const TranslationSchema = z.object({ translations: z.array(z.string()) });
const TRANSLATION_BATCH_SIZE = 20;

async function persistTranslations(lang: string, added: Record<string, string>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(lang));
    const record = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    Object.assign(record, added);
    await AsyncStorage.setItem(storageKey(lang), JSON.stringify(record));
  } catch (err) {
    console.warn('[OfficialDesc] Failed to persist translations:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Safety net for official texts that have NO bundled FR/KO translation (should be
 * none today). Anything already shipped in officialDescriptionsI18n.ts is skipped,
 * so this normally performs zero AI calls. Failures are non-blocking: callers fall
 * back to the English reference.
 */
export async function ensureOfficialTranslations(enTexts: string[]): Promise<void> {
  const lang = getDeviceLanguage();
  if (lang === 'en') return;
  await hydrateOfficialTranslations();

  // Les traductions figées couvrent toute la base : en pratique `missing` est vide
  // et aucun appel IA n'est déclenché.
  const missing = [...new Set(enTexts)].filter(
    (t) =>
      OFFICIAL_EN_SET.has(t) &&
      getFrozenTranslation(t, lang) === undefined &&
      !translationCache.has(`${lang}:${hashText(t)}`),
  );
  if (missing.length === 0) return;

  const target = lang === 'fr' ? 'French' : 'Korean';
  for (let i = 0; i < missing.length; i += TRANSLATION_BATCH_SIZE) {
    const chunk = missing.slice(i, i + TRANSLATION_BATCH_SIZE);
    try {
      const result = await aiGenerateObject({
        system:
          `You are a professional translator for a consumer food-safety app. Translate each English ingredient description into ${target}. ` +
          'Rules: preserve the exact factual meaning — no additions, omissions or reinterpretation; keep E-numbers, agency names (IARC, EFSA, FDA, EU, WHO) and all figures unchanged; ' +
          `use natural, clear consumer ${target}. ` +
          `Respond ONLY with JSON: {"translations": [...]} containing exactly ${chunk.length} items, in the same order as the input array.`,
        messages: [{ role: 'user', content: JSON.stringify(chunk) }],
        schema: TranslationSchema,
        maxTokens: 4096,
      });
      if (result.translations.length !== chunk.length) {
        console.warn('[OfficialDesc] Translation count mismatch — keeping English fallback for this batch');
        continue;
      }
      const added: Record<string, string> = {};
      chunk.forEach((en, idx) => {
        const translated = result.translations[idx]?.trim();
        if (translated && translated.length > 0) {
          const hash = hashText(en);
          translationCache.set(`${lang}:${hash}`, translated);
          translatedTextSet.add(translated);
          added[hash] = translated;
        }
      });
      if (Object.keys(added).length > 0) await persistTranslations(lang, added);
      console.log('[OfficialDesc] Translated', Object.keys(added).length, 'official descriptions →', lang);
    } catch (err) {
      console.warn('[OfficialDesc] Translation batch failed (English fallback kept):', err instanceof Error ? err.message : String(err));
      return;
    }
  }
}
