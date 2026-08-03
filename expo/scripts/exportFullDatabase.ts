/**
 * EXPORT COMPLET de la base d'ingrédients : pour CHAQUE entrée, le texte RÉELLEMENT
 * affiché dans l'app (même moteur de résolution que utils/api.ts — officialDescriptions
 * en priorité, sinon note DB, sinon fallback déterministe) + le badge résultant.
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/exportFullDatabase.ts
 *         (cwd = expo/)
 *
 * Sortie : scripts/ingredientsFullExport.json — un objet par entrée de la base :
 *   { name, description_en, badge }
 * `name` = premier mot-clé (nom canonique de l'entrée). `description_en` = texte anglais
 * réellement servi pour ce nom (identique à ce que l'app affiche, langue anglaise).
 */
import * as fs from 'fs';
import * as path from 'path';
import { classifyLocal } from '@/utils/api';
import { badgeFromRiskAndCirc } from '@/utils/hazardProfile';
import { advisoryPill } from '@/utils/badgeEngine';
import { INGREDIENTS_DATABASE, IngredientEntry, RiskLevel } from '@/constants/ingredientsDatabase';

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, 'scripts', 'ingredientsFullExport.json');

/** Same derivation as the ingredient row and the badge audit (single source of truth). */
function badgeForEntry(entry: IngredientEntry): string {
  return badgeFromRiskAndCirc(entry.risk, entry.circ);
}

interface ExportedEntry {
  name: string;
  description_en: string;
  badge: string;
  risk: RiskLevel;
  /** IARC group when the ingredient carries one, else null. */
  iarc: string | null;
  /** Advisory pill shown next to the badge, else null. */
  advisory: string | null;
  aliases: string[];
}

const results: ExportedEntry[] = INGREDIENTS_DATABASE.map((entry) => {
  const canonical = entry.keywords[0] ?? '(sans nom)';
  const substance = classifyLocal([canonical])[0];
  return {
    name: canonical,
    description_en: (substance?.explication ?? '').trim(),
    badge: badgeForEntry(entry),
    risk: entry.risk,
    iarc: entry.iarc ?? null,
    advisory: advisoryPill(entry.advisory ?? null),
    aliases: entry.keywords.slice(1),
  };
});

fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
console.log(`Exporté ${results.length} entrées → ${OUT_PATH}`);

const empty = results.filter((r) => !r.description_en);
if (empty.length > 0) {
  console.log(`⚠️ ${empty.length} entrée(s) sans texte servi (en attente IA) :`);
  for (const e of empty.slice(0, 20)) console.log(`   • ${e.name}`);
}
