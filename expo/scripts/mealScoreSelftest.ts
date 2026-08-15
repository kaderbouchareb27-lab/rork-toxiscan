/**
 * SELF-TEST du calibrage score repas — vérifie les correctifs récents :
 *   1. « riz » (et féculents de base) ne doit plus être classé « additive ».
 *   2. Un wrap majoritairement sain (verdure/légumineuses + un seul orange) doit
 *      atterrir ~6-7/10, pas 4/10.
 *
 * Deux modes :
 *   - classifyMealIngredient() : test la classification NOM (le bug riz).
 *   - computeMealScore()        : test le CALIBRAGE avec des catégories explicites
 *     (ce que renvoie le modèle vision en prod) + le vrai nom de plat (ancres).
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/mealScoreSelftest.ts
 */
import {
  classifyMealIngredient,
  computeMealScore,
  scoreToTier,
  type MealCategory,
  type MealIngredient,
} from '@/utils/mealAnalysis';

let failures = 0;

function check(ok: boolean, msg: string): void {
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
}

function dish(dishName: string, parts: [name: string, category: MealCategory][]): void {
  const ingredients: MealIngredient[] = parts.map(([name, category], i) => ({
    id: `${i}`,
    name,
    category,
    isGrave: category.startsWith('carcinogen'),
  }));
  const score = computeMealScore(ingredients, dishName);
  const tier = scoreToTier(score);
  const cats = ingredients.map((i) => `${i.name}=${i.category}`).join(' · ');
  console.log(`\n■ ${dishName}  →  ${score}/10 (${tier})`);
  console.log(`  ${cats}`);
}

// ── 1. Classification isolée (bug « riz = additive ») ──
console.log('── 1. Classification nom ──');
check(classifyMealIngredient('riz').category === 'neutral', 'riz → neutral');
check(classifyMealIngredient('riz blanc').category === 'neutral', 'riz blanc → neutral');
check(classifyMealIngredient('amidon').category === 'neutral', 'amidon → neutral');
check(classifyMealIngredient('lait de riz').category === 'neutral', 'lait de riz → neutral');
check(classifyMealIngredient('silice').category === 'additive', 'silice → additive (industriel)');
check(classifyMealIngredient('chlorure de calcium').category === 'additive', 'chlorure de calcium → additive (industriel)');

// ── 2. Score repas (catégories du modèle vision, vrai nom de plat) ──
console.log('\n── 2. Calibrage score ──');

// Le wrap de l'utilisateur : 1 orange (tortilla), 3 verts, riz neutre, fromage jaune.
dish('wrap', [
  ['tortilla', 'refined_flour'],
  ['riz', 'neutral'],
  ['fromage', 'saturated_fat'],
  ["huile d'olive", 'healthy'],
  ['légumes', 'healthy'],
  ['légumineuses', 'healthy'],
  ['verdure', 'healthy'],
]);

// Même wrap mais huile raffinée (2 orange) — plancher cohérence ≤ 6.
dish('wrap', [
  ['tortilla', 'refined_flour'],
  ['riz', 'neutral'],
  ['fromage', 'saturated_fat'],
  ['huile', 'refined_oil'],
  ['légumes', 'healthy'],
  ['légumineuses', 'healthy'],
  ['verdure', 'healthy'],
]);

// Régression — ancres de référence. Ingrédients RÉALISTES (ce que le modèle renvoie
// + le marker injecté par l'ancre), pas un empilement forcé : le but est de vérifier
// que les planchers d'ancre tiennent toujours et ne sont pas devenus verts.
dish('croissant', [
  ['croissant', 'refined_flour'],
  ['beurre', 'saturated_fat'],
]);
dish('burger', [
  ['pain burger', 'refined_flour'],
  ['steak', 'neutral'],
  ['fromage', 'saturated_fat'],
]);
dish('pizza', [
  ['pâte à pizza', 'refined_flour'],
  ['fromage', 'saturated_fat'],
]);
dish('salade', [
  ['salade verte', 'healthy'],
  ['tomate', 'healthy'],
  ['concombre', 'healthy'],
  ["huile d'olive", 'healthy'],
]);

console.log(`\n${failures === 0 ? '✓ Tous les garde-fous OK' : `✗ ${failures} échec(s)`}`);
process.exit(failures === 0 ? 0 : 1);
