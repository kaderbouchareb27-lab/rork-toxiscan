/**
 * Déclare comme fiche PROPRE chaque alias signalé par scripts/auditFicheOwnership.ts.
 *
 * L'audit signale tout mot-clé qui AFFICHE la fiche d'un autre nom. Quand ce mot-clé est
 * un synonyme validé de la tête d'entrée (« shoyu » sous « sauce soja », « platano » sous
 * « plantain »), la bonne correction n'est pas de réécrire un texte : c'est de classer la
 * MÊME fiche sous son nom exact, pour que le lookup soit explicite plutôt qu'hérité.
 *
 * Le texte n'est jamais dupliqué : officialDescriptions.ts indexe les textes, seul un
 * couple clé → index est ajouté.
 *
 * Pipeline :
 *   bun --preload ./scripts/lib/nativeStub.ts scripts/auditFicheOwnership.ts
 *   bun run scripts/fileAliasFiches.ts
 *   bun run scripts/generateOfficialDescriptions.ts
 *
 * Usage : bun run scripts/fileAliasFiches.ts   (cwd = expo/)
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'scripts', 'ficheOwnershipReport.json');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'officialDescriptionsSource.json');

interface Flag {
  entryHead: string;
  keyword: string;
  ficheFor: string;
  text: string;
}
interface SourceDescription {
  name: string;
  description_en: string;
  badge: string;
  lot: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const flags = (JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8')) as { flags: Flag[] }).flags;
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8')) as { descriptions: SourceDescription[] };
const byName = new Map<string, SourceDescription>();
for (const d of source.descriptions) byName.set(normalize(d.name), d);

let added = 0;
let updated = 0;
for (const flag of flags) {
  const key = normalize(flag.keyword);
  if (!key) continue;
  const origin = byName.get(normalize(flag.ficheFor));
  const badge = origin?.badge ?? 'Occasional';
  const lot = origin?.lot ?? '14-verified';
  const existing = byName.get(key);
  if (existing) {
    if (existing.description_en === flag.text) continue;
    existing.description_en = flag.text;
    existing.badge = badge;
    existing.lot = lot;
    updated++;
  } else {
    const fiche: SourceDescription = { name: key, description_en: flag.text, badge, lot };
    source.descriptions.push(fiche);
    byName.set(key, fiche);
    added++;
  }
  console.log(`  • ${flag.keyword} → fiche propre (texte de « ${flag.ficheFor} », badge ${badge})`);
}

source.descriptions.sort((a, b) => a.name.localeCompare(b.name, 'en'));
fs.writeFileSync(SOURCE_PATH, JSON.stringify(source), 'utf-8');
console.log(`\nAlias déclarés : ${added} ajoutés • ${updated} mis à jour • total fiches ${source.descriptions.length}`);
