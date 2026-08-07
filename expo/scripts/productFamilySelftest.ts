/**
 * SELFTEST — moteur de familles produit (utils/productFamily.ts).
 *
 * Chaque cas est une liste d'ingrédients réelle + la famille attendue. Le cas « bonbons
 * colorés » est le bug historique : il était nommé « Corn chips » parce que « sirop de
 * glucose de maïs » comptait comme une base de maïs.
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/productFamilySelftest.ts   (cwd = expo/)
 */
import { detectProductFamily, familyAssertedByName, isNameContradicted } from '../utils/productFamily';
import type { ProductFamily } from '../utils/productFamily';

type FamilyCase = {
  readonly label: string;
  readonly ingredients: readonly string[];
  readonly expect: ProductFamily | null;
  /** A name the app might have produced, expected to be rejected as contradictory. */
  readonly rejects?: readonly string[];
  /** A name that must NOT be rejected (real brand names, cross-category product names). */
  readonly keeps?: readonly string[];
};

const CASES: readonly FamilyCase[] = [
  {
    label: 'Bonbons colorés (bug « Corn chips »)',
    ingredients: [
      'sucre', 'sirop de glucose de maïs', 'acide citrique', 'amidon modifié', 'gélatine',
      'rouge 40', 'jaune 5', 'bleu 1', 'cire de carnauba', 'arôme artificiel',
    ],
    expect: 'candy',
    rejects: ['Corn chips', 'Chips de maïs', 'Potato chips', 'Tortilla chips', 'Nachos'],
    keeps: ['Skittles', 'Bonbons acidulés', 'Haribo Dragibus'],
  },
  {
    label: 'Bonbons gélifiés simples',
    ingredients: ['sirop de glucose', 'sucre', 'gélatine', 'acide citrique', 'colorants', 'arôme'],
    expect: 'candy',
    rejects: ['Corn chips'],
  },
  {
    label: 'Chewing-gum',
    ingredients: ['gum base', 'sorbitol', 'xylitol', 'arôme menthe', 'aspartame', 'e171'],
    expect: 'chewing-gum',
    rejects: ['Potato chips'],
  },
  {
    label: 'Chips de maïs (vraie base maïs)',
    ingredients: ['farine de maïs', 'huile de tournesol', 'sel', 'arôme fromage'],
    expect: 'corn-chips',
    keeps: ['Doritos', 'Tortilla chips'],
    rejects: ['Bonbons colorés', 'Chocolat au lait'],
  },
  {
    label: 'Tortilla chips (masa)',
    ingredients: ['masa de maïs nixtamalisé', 'huile de palme', 'sel'],
    expect: 'corn-chips',
  },
  {
    label: 'Chips de pommes de terre',
    ingredients: ['pommes de terre', 'huile de tournesol', 'sel'],
    expect: 'potato-chips',
    rejects: ['Bonbons', 'Soda cola'],
  },
  {
    label: 'Chips de pommes de terre reconstituées',
    ingredients: ['flocons de pomme de terre', 'huile de palme', 'amidon de maïs', 'sel', 'glutamate monosodique'],
    expect: 'potato-chips',
  },
  {
    label: 'Chocolat au lait',
    ingredients: ['sucre', 'beurre de cacao', 'pâte de cacao', 'lait en poudre', 'lécithine de soja'],
    expect: 'chocolate',
    keeps: ['Nutella Biscuit', 'Mars'],
    rejects: ['Potato chips', 'Jambon fumé'],
  },
  {
    label: 'Biscuit sucré',
    ingredients: ['farine de blé', 'sucre', 'beurre', 'oeufs', 'poudre à lever', 'sel'],
    expect: 'biscuit',
  },
  {
    label: 'Pain',
    ingredients: ['farine de blé', 'eau', 'levure', 'sel'],
    expect: 'bakery',
  },
  {
    label: 'Céréales petit-déjeuner',
    ingredients: ['flocons d avoine', 'sucre', 'miel', 'huile de tournesol', 'sel'],
    expect: 'breakfast-cereal',
  },
  {
    label: 'Charcuterie',
    ingredients: ['jambon de porc', 'sel', 'dextrose', 'nitrite de sodium', 'ascorbate de sodium'],
    expect: 'processed-meat',
    rejects: ['Bonbons colorés', 'Soda'],
  },
  {
    label: 'Soda',
    ingredients: ['eau gazéifiée', 'sucre', 'colorant caramel', 'acide phosphorique', 'arôme naturel', 'caféine'],
    expect: 'sweet-drink',
    rejects: ['Potato chips', 'Jambon'],
  },
  {
    label: 'Ketchup',
    ingredients: ['tomates', 'vinaigre', 'sucre', 'sel', 'épices'],
    expect: 'condiment',
  },
  {
    label: 'Pâtes sèches',
    ingredients: ['semoule de blé dur', 'eau'],
    expect: 'pasta',
  },
  {
    label: 'Yaourt sucré',
    ingredients: ['lait entier', 'sucre', 'crème', 'arôme vanille', 'pectine'],
    expect: 'dairy-dessert',
  },
  {
    label: 'Liste vide',
    ingredients: [],
    expect: null,
  },
  {
    label: 'Ingrédient unique non discriminant',
    ingredients: ['eau'],
    expect: null,
  },
];

let failures = 0;

for (const c of CASES) {
  const detected = detectProductFamily(c.ingredients, null);
  const got = detected?.family ?? null;
  const ok = got === c.expect;
  if (!ok) {
    failures += 1;
    console.log(`FAIL ${c.label.padEnd(42)} expected ${String(c.expect)} got ${String(got)}`);
  } else {
    console.log(`ok   ${c.label.padEnd(42)} -> ${String(got)}${detected ? ' (' + detected.confidence + ')' : ''}`);
  }

  for (const name of c.rejects ?? []) {
    if (!isNameContradicted(name, detected)) {
      failures += 1;
      console.log(`     FAIL name "${name}" should be rejected on ${c.label}`);
    }
  }
  for (const name of c.keeps ?? []) {
    if (isNameContradicted(name, detected)) {
      failures += 1;
      console.log(`     FAIL name "${name}" must be KEPT on ${c.label}`);
    }
  }
}

// A visual hint may only refine WITHIN a group, never jump to another one.
const chipsIngredients = ['farine de maïs', 'huile de tournesol', 'sel'];
const hijacked = detectProductFamily(chipsIngredients, 'Bonbons colorés');
if (hijacked?.family !== 'corn-chips') {
  failures += 1;
  console.log(`FAIL visual hint must not override the ingredient family (got ${String(hijacked?.family)})`);
} else {
  console.log('ok   visual hint cannot jump group                  -> corn-chips');
}

const refined = detectProductFamily(['pommes de terre', 'huile de tournesol', 'sel'], 'Chips de maïs');
if (refined?.family !== 'corn-chips') {
  failures += 1;
  console.log(`FAIL visual hint should refine within the same group (got ${String(refined?.family)})`);
} else {
  console.log('ok   visual hint refines inside the group           -> corn-chips');
}

// A name asserting nothing is never rejected.
if (familyAssertedByName('Zéphyr 3000') !== null) {
  failures += 1;
  console.log('FAIL a neutral brand name must assert no family');
} else {
  console.log('ok   neutral brand name asserts no family');
}

console.log('');
if (failures > 0) {
  console.log(`${failures} échec(s).`);
  process.exit(1);
}
console.log(`All ${CASES.length} family cases + 3 guards pass.`);
