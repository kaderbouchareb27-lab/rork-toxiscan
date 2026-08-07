/**
 * BENCHMARK — modèles vision OpenRouter pour le SCAN REPAS (photo d'assiette).
 *
 * Le scan repas ne demande PAS le même travail que la lecture d'étiquette : il n'y a aucun
 * texte à lire, il faut reconnaître un plat cuisiné et en déduire une recette réaliste.
 * Ce banc mesure donc les critères propres au repas :
 *
 *   1. dish   — le plat est-il correctement nommé ?
 *   2. BASE   — l'aliment de BASE est-il listé (règle n°2 du prompt : la pâte d'une pizza,
 *               le pain + le steak d'un burger, la viennoiserie d'un croissant) ?
 *               C'est la règle que les modèles violent le plus : ils ne voient que les garnitures.
 *   3. recall — les ingrédients réellement visibles sont-ils retrouvés ?
 *   4. GRAVE  — règle d'or : jamais « cancérigène » sur un aliment simple (salade, pâte,
 *               sucre, viande fraîche). Seule la charcuterie/viande transformée y a droit.
 *   5. count  — 4 à 8 ingrédients (règle de vitesse du prompt).
 *   6. note   — notes de 10 mots maximum.
 *   7. lang   — VERROU DE LANGUE : l'app force FR/EN/KO ; un modèle qui laisse fuiter du
 *               coréen dans une app française (ou l'inverse) est disqualifié, quelle que
 *               soit sa vitesse. Piloté par BENCH_LANG=en|fr|ko.
 *   8. latence moyenne ET pic (le pic est ce que l'utilisateur ressent).
 *
 * Usage : bun run scripts/benchMealModels.ts [modele1 modele2 ...]   (cwd = expo/)
 * Photos : BENCH_MEALS (défaut /tmp/meals). Langue : BENCH_LANG (défaut en).
 * BENCH_SHOW=1 affiche le détail de chaque réponse.
 */
import * as fs from 'fs';
import * as path from 'path';

const KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
if (!KEY) throw new Error('EXPO_PUBLIC_OPENROUTER_API_KEY manquant');

const URL = 'https://openrouter.ai/api/v1/chat/completions';
const MEAL_DIR = process.env.BENCH_MEALS ?? '/tmp/meals';
const TIMEOUT_MS = 45000;

const DEFAULT_MODELS = [
  'google/gemini-3.5-flash-lite',
  'google/gemini-3.6-flash',
  'google/gemini-3.1-flash-lite',
  'qwen/qwen3.7-plus',
  'qwen/qwen3.7-flash',
  'openai/gpt-5.6-luna',
  'minimax/minimax-m3',
  'z-ai/glm-5v-turbo',
  'perceptron/perceptron-mk1',
];

const MODELS = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_MODELS;

type Lang = 'en' | 'fr' | 'ko';
const RAW_LANG = process.env.BENCH_LANG ?? 'en';
const LANG: Lang = RAW_LANG === 'fr' || RAW_LANG === 'ko' ? RAW_LANG : 'en';

/** Verrou de langue — même substance que mealLanguageLock() en production. */
const LANGUAGE_LOCK: Record<Lang, string> = {
  en: 'ABSOLUTE LANGUAGE RULE (overrides everything below): the app language is ENGLISH. Write dish_name, EVERY ingredient name and EVERY note in ENGLISH ONLY. NEVER output a Korean or French word.',
  fr: "RÈGLE DE LANGUE ABSOLUE (prime sur tout ce qui suit) : la langue de l'app est le FRANÇAIS. Écris dish_name, CHAQUE nom d'ingrédient et CHAQUE note en FRANÇAIS UNIQUEMENT. N'écris JAMAIS un mot coréen ou anglais.",
  ko: '절대 언어 규칙(아래의 모든 규칙에 우선): 앱 언어는 한국어입니다. dish_name, 모든 재료 이름, 그리고 모든 note를 반드시 한국어로만 작성하세요. 영어나 프랑스어 단어를 절대 쓰지 마세요.',
};

const HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF]/;

/**
 * Le verrou tient-il ? En coréen chaque nom doit être en hangul ; en FR/EN aucun hangul ne
 * doit apparaître. C'est le garde-fou anti-fuite de langue de l'app.
 */
function isLanguageClean(names: readonly string[], notes: readonly string[]): boolean {
  const all = [...names, ...notes].filter((s) => s.trim().length > 0);
  if (all.length === 0) return false;
  return LANG === 'ko' ? names.every((n) => HANGUL.test(n)) : all.every((s) => !HANGUL.test(s));
}

/** Catégories autorisées — copie exacte de l'énumération du prompt de production. */
const VALID_CATEGORIES = new Set([
  'carcinogen_g1', 'carcinogen_2a', 'carcinogen_2b', 'processed', 'added_sugar',
  'refined_oil', 'refined_flour', 'excess_salt', 'saturated_fat', 'additive', 'healthy', 'neutral',
]);
const CARCINOGEN_CATEGORIES = new Set(['carcinogen_g1', 'carcinogen_2a', 'carcinogen_2b']);

/**
 * Prompt volontairement identique en substance à celui de production (mealAnalysis.ts) :
 * on teste le modèle dans les conditions réelles de l'app, pas sur un prompt idéalisé.
 */
const SYSTEM = `You are Dr. Toxi, an expert in food toxicity (WHO/IARC classification) AND nutrition. You analyze a PHOTO of a real meal.

TASK:
1. Identify the dish in a few words (dish_name).
2. ALWAYS identify the MAIN / BASE food of the dish FIRST — the pastry, bread, dough, batter, noodles, rice or protein the dish is built on — not only the toppings or fillings. A "chocolate croissant" MUST list the viennoiserie pastry itself (refined flour + butter), not just the chocolate. A "pizza" must list the dough; a "burger" the bun and the patty. THEN add toppings, sauces and the usual hidden ingredients a real recipe contains (oils, sugar, sauces, condiments). Stay realistic — do not invent rare additives.
3. For EACH ingredient set:
   - name: the ingredient name.
   - category: EXACTLY one of: carcinogen_g1 | carcinogen_2a | carcinogen_2b | processed | added_sugar | refined_oil | refined_flour | excess_salt | saturated_fat | additive | healthy | neutral
   - is_grave: true ONLY if dangerous / IARC-classified (carcinogen). NEVER true for merely processed/sugary/fatty food.
   - intensity: "high" ONLY for added_sugar when the sugar is MASSIVE / DOMINANT; otherwise "normal".
   - note: ONE VERY SHORT educational note (maximum 10 words), frank.

GOLDEN RULE: NEVER label sugar, fat, refined flour or processed food as "carcinogenic". NEVER label plain fresh meat, ground/minced meat, poultry or fish as "carcinogenic" either — only PROCESSED / CURED meat (charcuterie: ham, bacon, sausage, salami) is. A sugary cake is "ultra-processed and very sweet" — never "carcinogenic".

SPEED RULE: be concise. Return 4 to 8 ingredients MAXIMUM, plus the top-level "is_fast_food" boolean. Output compact JSON only, no prose, no reasoning.

Return ONLY JSON: {"dish_name":"...","is_fast_food":false,"ingredients":[{"name":"...","category":"...","is_grave":false,"intensity":"normal","note":"..."}]}`;

type Case = {
  readonly file: string;
  /** Noms de plat acceptés (EN ou FR) — au moins un doit apparaître dans dish_name. */
  readonly dish: readonly string[];
  /** Aliment(s) de BASE — chaque groupe doit être retrouvé, c'est la règle critique n°2. */
  readonly base: readonly (readonly string[])[];
  /** Autres ingrédients réellement visibles sur la photo. */
  readonly expect: readonly (readonly string[])[];
  /** true si la charcuterie/viande transformée y est légitime (carbonara) : G1 alors permis. */
  readonly curedMeatAllowed: boolean;
};

/** Vérité terrain établie en regardant chaque photo une par une. */
const CASES: readonly Case[] = [
  {
    file: 'burger.jpg',
    dish: ['burger', 'cheeseburger', 'hamburger', '버거'],
    base: [['bun', 'bread', 'pain', 'brioche', '번', '빵'], ['beef', 'patty', 'steak', 'boeuf', 'bœuf', 'viande', '패티', '소고기']],
    expect: [['cheese', 'fromage', 'cheddar', '치즈'], ['sauce', 'mayo', 'dressing', '소스'], ['lettuce', 'salade', 'laitue', '양상추'], ['tomato', 'tomate', '토마토'], ['pickle', 'cornichon', '피클'], ['onion', 'oignon', '양파']],
    curedMeatAllowed: false,
  },
  {
    file: 'pizza.jpg',
    dish: ['pizza', '피자'],
    base: [['dough', 'crust', 'pate', 'pâte', 'flour', 'farine', 'base', '도우', '반죽']],
    expect: [['cheese', 'fromage', 'mozzarella', '치즈'], ['tomato', 'tomate', 'sauce', '토마토'], ['oil', 'huile', '오일', '기름'], ['salt', 'sel', '소금']],
    curedMeatAllowed: false,
  },
  {
    file: 'korean.jpg',
    dish: ['bibimbap', 'rice bowl', 'bol de riz', 'riz', 'rice', 'bowl', '비빔밥', '덮밥', '밥'],
    base: [['rice', 'riz', '밥', '쌀']],
    expect: [['egg', 'oeuf', 'œuf', '계란', '달걀', '에그'], ['carrot', 'carotte', '당근'], ['vegetable', 'legume', 'légume', 'bean', 'haricot', '채소', '나물'], ['meat', 'beef', 'viande', 'boeuf', 'bœuf', 'pork', 'porc', 'chicken', 'poulet', '고기'], ['sauce', 'gochujang', 'soy', 'soja', '고추장', '간장']],
    curedMeatAllowed: false,
  },
  {
    file: 'pasta.jpg',
    dish: ['carbonara', 'pasta', 'spaghetti', 'pate', 'pâtes', '카르보나라', '파스타'],
    base: [['pasta', 'spaghetti', 'noodle', 'pate', 'pâtes', '파스타', '스파게티', '면']],
    expect: [['bacon', 'pancetta', 'guanciale', 'lardon', 'ham', 'jambon', 'pork', 'porc', '베이컨', '판체타'], ['cheese', 'parmesan', 'fromage', 'pecorino', '치즈', '파르메산'], ['egg', 'oeuf', 'œuf', '계란', '달걀'], ['pepper', 'poivre', '후추']],
    curedMeatAllowed: true,
  },
  {
    file: 'salad.jpg',
    dish: ['caesar', 'cesar', 'césar', 'salad', 'salade', '시저', '샐러드'],
    base: [['lettuce', 'romaine', 'salade', 'laitue', 'green', '양상추', '로메인', '상추']],
    expect: [['crouton', 'bread', 'pain', '크루통', '빵'], ['cheese', 'parmesan', 'fromage', '치즈', '파르메산'], ['tomato', 'tomate', '토마토'], ['dressing', 'sauce', 'oil', 'huile', 'mayo', '드레싱', '소스']],
    curedMeatAllowed: false,
  },
  {
    file: 'croissant.jpg',
    dish: ['croissant', 'viennoiserie', 'pastry', '크루아상'],
    base: [['flour', 'farine', 'dough', 'pastry', 'pate', 'pâte', 'viennoiserie', '밀가루', '반죽'], ['butter', 'beurre', '버터']],
    expect: [['sugar', 'sucre', '설탕'], ['salt', 'sel', 'yeast', 'levure', 'egg', 'oeuf', 'œuf', 'milk', 'lait', '소금', '이스트', '우유']],
    curedMeatAllowed: false,
  },
];

function toDataUrl(file: string): string {
  const buf = fs.readFileSync(path.join(MEAL_DIR, file));
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1] ?? text;
  const a = body.indexOf('{');
  const b = body.lastIndexOf('}');
  return a !== -1 && b > a ? body.slice(a, b + 1) : body.trim();
}

type Ing = { name?: unknown; category?: unknown; is_grave?: unknown; note?: unknown };

type Outcome = {
  ok: boolean;
  ms: number;
  dishOk: boolean;
  baseOk: boolean;
  recall: number;
  graveOk: boolean;
  countOk: boolean;
  noteOk: boolean;
  catOk: boolean;
  langOk: boolean;
  sample: string;
  count: number;
  dish: string;
  fastFood: boolean;
  missingBase: string;
  missing: string;
  graveOffenders: string;
  error?: string;
};

async function runCase(model: string, c: Case, noReasoning = true): Promise<Outcome> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const fail = (ms: number, error: string): Outcome => ({
    ok: false, ms, dishOk: false, baseOk: false, recall: 0, graveOk: false, countOk: false,
    noteOk: false, catOk: false, langOk: false, sample: '', count: 0, dish: '', fastFood: false,
    missingBase: '', missing: '', graveOffenders: '', error,
  });
  try {
    const res = await fetch(URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${KEY}`,
        'HTTP-Referer': 'https://toxiscan.app',
        'X-Title': 'ToxiScan meal bench',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        ...(noReasoning ? { reasoning: { enabled: false } } : {}),
        messages: [
          { role: 'system', content: LANGUAGE_LOCK[LANG] + '\n\n' + SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this meal photo and return the dish name and its ingredients. JSON only.' },
              { type: 'image_url', image_url: { url: toDataUrl(c.file), detail: 'high' } },
            ],
          },
        ],
      }),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      const t = await res.text();
      // Certains endpoints (Gemini « thinking ») refusent reasoning:{enabled:false}.
      if (noReasoning && /reasoning is mandatory/i.test(t)) {
        clearTimeout(timer);
        return runCase(model, c, false);
      }
      return fail(ms, `${res.status} ${t.slice(0, 90)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const raw = data.choices?.[0]?.message?.content;
    const text = typeof raw === 'string'
      ? raw
      : Array.isArray(raw) ? raw.map((b: { text?: string }) => b.text ?? '').join('') : '';
    const parsed = JSON.parse(extractJson(text)) as { dish_name?: unknown; is_fast_food?: unknown; ingredients?: unknown };
    const list: Ing[] = Array.isArray(parsed.ingredients) ? (parsed.ingredients as Ing[]) : [];
    const rawNames = list.map((i) => String(i.name ?? ''));
    const rawNotes = list.map((i) => String(i.note ?? ''));
    const names = rawNames.map((n) => n.toLowerCase());
    const joined = names.join(' | ');
    const dish = String(parsed.dish_name ?? '');
    const dishNorm = dish.toLowerCase();

    const missedBase = c.base.filter((alts) => !alts.some((a) => joined.includes(a)));
    const missed = c.expect.filter((alts) => !alts.some((a) => joined.includes(a)));

    // Règle d'or : aucun aliment simple ne doit être marqué cancérigène. La charcuterie n'est
    // tolérée que là où elle existe vraiment (carbonara).
    const offenders = list.filter((i) => {
      const cat = String(i.category ?? '');
      const isCarcinogen = CARCINOGEN_CATEGORIES.has(cat) || i.is_grave === true;
      if (!isCarcinogen) return false;
      const n = String(i.name ?? '').toLowerCase();
      const isCured = /bacon|pancetta|guanciale|lardon|ham |jambon|sausage|saucisse|salami|charcut|cured|fume|fumé|processed meat|viande transform|베이컨|판체타/.test(n);
      return !(c.curedMeatAllowed && isCured);
    });

    return {
      ok: true,
      ms,
      dishOk: c.dish.some((d) => dishNorm.includes(d)),
      baseOk: missedBase.length === 0,
      recall: c.expect.length === 0 ? 1 : (c.expect.length - missed.length) / c.expect.length,
      graveOk: offenders.length === 0,
      countOk: list.length >= 4 && list.length <= 8,
      noteOk: list.every((i) => String(i.note ?? '').trim().split(/\s+/).filter(Boolean).length <= 10),
      catOk: list.every((i) => VALID_CATEGORIES.has(String(i.category ?? ''))),
      langOk: isLanguageClean(rawNames, rawNotes),
      sample: rawNames.slice(0, 4).join(', '),
      count: list.length,
      dish,
      fastFood: parsed.is_fast_food === true,
      missingBase: missedBase.map((a) => a[0]).join(','),
      missing: missed.map((a) => a[0]).join(','),
      graveOffenders: offenders.map((i) => String(i.name ?? '')).join(','),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(Date.now() - started, msg.slice(0, 90));
  } finally {
    clearTimeout(timer);
  }
}

async function benchModel(model: string): Promise<void> {
  const results = await Promise.all(CASES.map((c) => runCase(model, c)));
  const ok = results.filter((r) => r.ok);
  const avg = ok.length ? Math.round(ok.reduce((a, r) => a + r.ms, 0) / ok.length) : 0;
  const max = ok.length ? Math.max(...ok.map((r) => r.ms)) : 0;
  const recall = ok.length ? ok.reduce((a, r) => a + r.recall, 0) / ok.length : 0;
  const dishes = results.filter((r) => r.dishOk).length;
  const bases = results.filter((r) => r.baseOk).length;
  const graves = ok.filter((r) => r.graveOk).length;
  const counts = ok.filter((r) => r.countOk).length;
  const notes = ok.filter((r) => r.noteOk).length;
  const cats = ok.filter((r) => r.catOk).length;
  const langs = ok.filter((r) => r.langOk).length;
  const n = results.length;

  console.log(
    `${model.padEnd(30)} ok ${ok.length}/${n}  avg ${String(avg).padStart(6)}ms  max ${String(max).padStart(6)}ms` +
      `  dish ${dishes}/${n}  BASE ${bases}/${n}  recall ${(recall * 100).toFixed(0).padStart(3)}%` +
      `  golden ${graves}/${ok.length}  4-8 ${counts}/${ok.length}  note ${notes}/${ok.length}  cat ${cats}/${ok.length}  lang ${langs}/${ok.length}`,
  );
  for (const [i, r] of results.entries()) {
    const f = CASES[i]!.file;
    if (!r.ok) { console.log(`   · ${f} ERROR ${r.error}`); continue; }
    const flags: string[] = [];
    if (!r.dishOk) flags.push(`dish="${r.dish}"`);
    if (!r.baseOk) flags.push(`BASE MANQUANTE=[${r.missingBase}]`);
    if (r.recall < 1) flags.push(`missing=[${r.missing}]`);
    if (!r.graveOk) flags.push(`REGLE D'OR VIOLEE=[${r.graveOffenders}]`);
    if (!r.countOk) flags.push(`n=${r.count}`);
    if (!r.noteOk) flags.push('note>10 mots');
    if (!r.catOk) flags.push('categorie hors enumeration');
    if (!r.langOk) flags.push(`FUITE DE LANGUE=[${r.sample}]`);
    if (flags.length > 0) console.log(`   · ${f} ${flags.join(' ')}`);
    if (process.env.BENCH_SHOW === '1') console.log(`     ${f} → "${r.dish}" : ${r.sample}`);
  }
}

async function main(): Promise<void> {
  console.log('Photos de repas :', CASES.map((c) => c.file).join(', '), '· langue', LANG.toUpperCase());
  console.log("Critere cle = BASE (aliment de base liste) + regle d'or (pas de cancerigene abusif)\n");
  for (const model of MODELS) {
    await benchModel(model);
  }
}

void main();
