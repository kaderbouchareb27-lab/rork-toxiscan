import { z } from 'zod';
import { aiGenerateObject } from '@/utils/aiApi';
import { getLanguageInstruction, getResponseLanguage } from '@/utils/regionDetection';
import { getHealthProfileAnalysisPrompt } from '@/utils/healthProfile';
import { getDeviceLanguage, pick } from '@/utils/i18n';
import type { MealIngredient } from '@/utils/mealAnalysis';

/** A single "before → after" improvement highlighted on the healthier recipe card. */
export interface RecipeSwap {
  from: string;
  to: string;
}

/**
 * A healthier, same-spirit version of the scanned meal: a short appetizing title,
 * a one-line intro, the COMPLETE shopping list (all ingredients, not only the swaps),
 * and the key improvements as before/after pairs.
 */
export interface HealthierRecipe {
  title: string;
  intro: string;
  ingredients: string[];
  swaps: RecipeSwap[];
}

const safeString = (fallback = '') =>
  z.preprocess(
    (v) => (v === undefined || v === null ? fallback : typeof v === 'string' ? v : String(v)),
    z.string(),
  );

const recipeSchema = z.object({
  title: safeString(''),
  intro: safeString(''),
  ingredients: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(safeString(''))),
  swaps: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({ from: safeString(''), to: safeString('') })),
  ),
});

// ─────────────────────────────────────────────
// Session cache: one AI call per dish per language. Results survive leaving and
// re-opening the meal result screen (mirrors realAlternatives.ts).
// ─────────────────────────────────────────────
const recipeCache = new Map<string, HealthierRecipe>();

function cacheKey(dishName: string): string {
  return `${dishName.trim().toLowerCase()}|${getDeviceLanguage()}`;
}

/** Returns a previously generated recipe for this dish in this session, if any. */
export function getCachedHealthierRecipe(dishName: string): HealthierRecipe | null {
  return recipeCache.get(cacheKey(dishName)) ?? null;
}

/**
 * Generates a HEALTHIER version of the scanned meal that keeps the dish's spirit and
 * format (a burger lover gets a better burger, not a salad). Applies only simple, solid
 * swaps (remove added sugar, refined → whole grain, processed/cured meat → unprocessed,
 * refined oil → better fat) and returns the full shopping list so the user can actually
 * cook it. On-demand only; result is cached for the session. Returns null on failure.
 */
export async function findHealthierMealRecipe(params: {
  dishName: string;
  ingredients: MealIngredient[];
  score: number;
}): Promise<HealthierRecipe | null> {
  const key = cacheKey(params.dishName);
  const cached = recipeCache.get(key);
  if (cached) return cached;

  const ingredientLines = params.ingredients
    .map((i) => `- ${i.name} [${i.category}${i.isGrave ? ', GRAVE' : ''}]`)
    .join('\n');

  const system = `You are Dr. Toxi, an expert in nutrition. The user scanned a meal that scored ${params.score}/10 on a HEALTH scale (10 = healthiest, 0 = most toxic). Propose a HEALTHIER version of the SAME dish that KEEPS ITS SPIRIT and format — a burger lover wants a better burger (not a salad); a sugary latte + fried pastry becomes an unsweetened latte + whole-grain toast; eggs + bacon becomes eggs + lean beef.

SCANNED DISH: ${params.dishName}
CURRENT INGREDIENTS (category in brackets — improve the unhealthy ones, keep the healthy ones):
${ingredientLines}

RULES — apply SIMPLE, SOLID swaps only, nothing exotic:
- added sugar / sweetened item → unsweetened, no added sugar
- refined flour, white bread, pastry, viennoiserie → the whole-grain version
- processed / cured meat (bacon, ham, sausage, deli, nuggets) → unprocessed lean meat (lean beef, chicken, turkey, eggs, fish)
- refined / frying oil → a better fat (extra-virgin olive oil, avocado oil)
- ultra-processed / industrial component → a fresh, simple equivalent
- Keep every already-healthy ingredient as it is. NEVER turn the dish into a completely different meal.

WRITE (keep EVERYTHING short and actionable):
1. title: the name of the healthier version — short, appetizing, still recognizably the same dish.
2. intro: ONE short, motivating sentence.
3. ingredients: the COMPLETE shopping list for this healthier recipe — EVERY ingredient needed to make it (not only the swapped ones), short shopping-list names.
4. swaps: the KEY improvements as {from, to} pairs (2 to 4 maximum). "from" = the original unhealthy item, "to" = the healthier replacement.

Respond in the user's app language. Output JSON only.`;

  try {
    const raw = await aiGenerateObject({
      system:
        system +
        '\n\n' +
        getLanguageInstruction(getResponseLanguage()) +
        getHealthProfileAnalysisPrompt(),
      schema: recipeSchema,
      maxTokens: 800,
      messages: [
        {
          role: 'user',
          content: pick({
            en: 'Give me the healthier version of this meal.',
            fr: 'Donne-moi la version plus saine de ce repas.',
            ko: '이 식사의 더 건강한 버전을 알려주세요.',
          }),
        },
      ],
    });

    const ingredients = raw.ingredients.map((s) => s.trim()).filter((s) => s.length > 0);
    if (ingredients.length === 0) return null;

    const swaps = raw.swaps
      .map((s) => ({ from: s.from.trim(), to: s.to.trim() }))
      .filter((s) => s.from.length > 0 && s.to.length > 0)
      .slice(0, 4);

    const recipe: HealthierRecipe = {
      title: raw.title.trim() || params.dishName,
      intro: raw.intro.trim(),
      ingredients,
      swaps,
    };
    recipeCache.set(key, recipe);
    return recipe;
  } catch (e) {
    console.log('[mealRecipe] generation failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
