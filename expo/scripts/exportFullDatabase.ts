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
import { INGREDIENTS_DATABASE, IngredientEntry, RiskLevel } from '@/constants/ingredientsDatabase';

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, 'scripts', 'ingredientsFullExport.json');

function badgeForEntry(entry: IngredientEntry): string {
  if (entry.risk === 'aucun') return 'Approved';
  if (entry.risk === 'possible') return 'Occasional';
  if (entry.risk === 'probable') return 'Processed';
  return entry.circ.toLowerCase().includes('groupe 1') ? 'Carcinogenic' : 'Ultra toxic';
}

interface ExportedEntry {
  name: string;
  description_en: string;
  badge: string;
  risk: RiskLevel;
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
