import { isEnglish } from '@/utils/i18n';

export type ScanFactCategory = 'plastic' | 'food' | 'endocrine' | 'environment' | 'general';

export interface ScanFact {
  id: number;
  text: string;
  source: string;
  category: ScanFactCategory;
}

const FACTS_FR: ScanFact[] = [
  { id: 1, category: 'plastic', text: "Une bouteille d'eau en plastique laissée au soleil libère du BPA et des phtalates dans l'eau. Ces perturbateurs endocriniens imitent les œstrogènes et sont liés au cancer du sein et des ovaires.", source: 'Slate.fr / ANSES 2025' },
  { id: 2, category: 'plastic', text: "Une étude PNAS (2024) a révélé que l'eau embouteillée contient en moyenne 240 000 fragments de nanoplastiques par litre — 100 fois plus que les estimations précédentes.", source: 'PNAS, janvier 2024' },
  { id: 3, category: 'plastic', text: "Une étude du New England Journal of Medicine (2024) a établi un lien direct entre microplastiques dans les artères et risque d'infarctus ou d'AVC multiplié par 4,5.", source: 'NEJM / Nature Medicine 2024' },
  { id: 4, category: 'plastic', text: "Février 2025 : Nature Medicine montre que le cerveau humain contient en moyenne l'équivalent d'une petite cuillère de microplastiques. +50% de concentration cérébrale entre 2016 et 2024.", source: 'Nature Medicine, février 2025' },
  { id: 5, category: 'plastic', text: "Boire l'eau d'une bouteille oubliée dans une voiture au soleil est risqué : UV et chaleur accélèrent la libération de phtalates et multiplient les microplastiques dans l'eau.", source: 'Slate.fr / EPA 2024' },
  { id: 6, category: 'plastic', text: 'Les microplastiques ont été détectés dans le placenta, le lait maternel, le sang du cordon ombilical et les organes de nouveau-nés. Préférer les biberons en verre pendant la grossesse.', source: 'INSERM / CNRS 2024' },
  { id: 7, category: 'plastic', text: "Paradoxe : selon le CNRS Toulouse (janvier 2025), 8 marques d'eau en bouteille sur 10 contiennent PLUS de microplastiques que l'eau du robinet. La solution : le filtre à eau.", source: 'CNRS Toulouse, janvier 2025' },
  { id: 8, category: 'plastic', text: 'Les microplastiques ont été retrouvés dans les poumons, le sang, le foie, les reins, le cœur, le placenta et la moelle osseuse humaine.', source: 'Nature, février 2025' },
  { id: 9, category: 'food', text: "Les charcuteries (bacon, jambon, saucisses) sont classées cancérigènes Groupe 1 par l'OMS depuis 2015 — la même catégorie que le tabac. 50g par jour = +18% de risque de cancer colorectal.", source: 'IARC Vol.114, OMS 2015' },
  { id: 10, category: 'food', text: "L'acrylamide se forme quand on cuit des féculents à haute température : frites, chips, pain grillé, café, biscuits. Classé Groupe 2A (probablement cancérigène) par l'IARC.", source: 'IARC Vol.60 / EFSA 2015' },
  { id: 11, category: 'food', text: "Le glyphosate, herbicide le plus utilisé au monde, est classé 'probablement cancérigène' (Groupe 2A) par l'IARC depuis 2015. Présent en résidus sur céréales, légumineuses et produits OGM.", source: 'IARC Vol.112, 2015' },
  { id: 12, category: 'food', text: "Le cacao peut être contaminé par le cadmium, métal lourd classé Groupe 1. Ce n'est pas le cacao qui est dangereux, c'est le sol. Privilégier le chocolat bio certifié faible en cadmium.", source: 'EFSA / ANSES / IARC Vol.58' },
  { id: 13, category: 'food', text: "L'alcool est classé cancérigène Groupe 1 par l'OMS. Lié à 7 types de cancers. Aucune dose sans risque — même un verre par jour augmente le risque de cancer du sein.", source: 'IARC Vol.100E / OMS 2024' },
  { id: 14, category: 'food', text: "Boire des boissons très chaudes (>65°C) — thé, café, maté — est classé Groupe 2A par l'IARC depuis 2018. Solution simple : attendre 5 minutes avant de boire.", source: 'IARC Vol.116, 2018' },
  { id: 15, category: 'food', text: 'Les mycotoxines sont des moisissures cancérigènes invisibles dans les céréales, maïs, arachides et café mal stockés. Les aflatoxines (Groupe 1) sont parmi les substances naturelles les plus cancérigènes.', source: 'IARC Vol.56, 82, 100F' },
  { id: 16, category: 'food', text: "La viande rouge consommée régulièrement est classée 'probablement cancérigène' (Groupe 2A) par l'OMS. Ne pas dépasser 500g par semaine. Le barbecue produit des amines hétérocycliques.", source: 'IARC Vol.114, OMS 2015' },
  { id: 17, category: 'food', text: "L'aspartame (E951) a été classé cancérigène possible (Groupe 2B) par l'IARC en juillet 2023. Présent dans sodas light, yaourts 0%, bonbons sans sucre et produits 'diet'.", source: 'IARC Vol.134, juillet 2023' },
  { id: 18, category: 'food', text: 'Les colorants artificiels FD&C (Red 40, Yellow 5, Yellow 6, Blue 1) contiennent des contaminants comme la benzidine, cancérigène Groupe 1. La FDA a annoncé leur retrait progressif en 2025.', source: 'FDA/HHS, avril 2025 / EWG' },
  { id: 19, category: 'food', text: 'Les boîtes de conserve et canettes sont souvent tapissées de résines contenant du BPA, perturbateur endocrinien lié aux cancers hormono-dépendants.', source: 'INRAE/CNRS 2025' },
  { id: 20, category: 'food', text: "Le thon, l'espadon et le requin concentrent du mercure méthylé, neurotoxique classé Groupe 2B. Les femmes enceintes et enfants doivent limiter leur consommation.", source: 'IARC Vol.58 / EFSA' },
  { id: 21, category: 'endocrine', text: 'Les parabènes (methylparaben, propylparaben, butylparaben) sont présents dans 80% des cosmétiques. Ils imitent les œstrogènes et ont été détectés dans des tumeurs du sein.', source: 'ANSES / Darbre 2004' },
  { id: 22, category: 'endocrine', text: 'Les phtalates et parabènes posent le plus grand risque pendant la grossesse et la petite enfance. Une méta-analyse de 2024 lie les phtalates au risque accru de fausse couche.', source: 'Systematic Review 2024 / EWG' },
  { id: 23, category: 'endocrine', text: 'Le triclosan — antibactérien dans dentifrices, déodorants, savons — est interdit dans les savons aux USA depuis 2017. Perturbateur endocrinien affectant la thyroïde.', source: 'FDA USA 2017 / ANSES' },
  { id: 24, category: 'endocrine', text: 'Les filtres UV chimiques (oxybenzone, octinoxate, homosalate) sont des perturbateurs endocriniens détectés dans le sang et le lait maternel. Préférer les filtres minéraux (oxyde de zinc).', source: 'FDA 2019 / EWG Skin Deep' },
  { id: 25, category: 'endocrine', text: 'Le formaldéhyde (Groupe 1) est libéré par des conservateurs : DMDM Hydantoin, Quaternium-15, Diazolidinyl Urea. Interdits au Canada et dans plusieurs États américains depuis 2020.', source: 'IARC / Campaign for Safe Cosmetics 2025' },
  { id: 26, category: 'endocrine', text: "Les PFAS ont été détectés dans plus de 1700 produits cosmétiques selon un rapport FDA 2024. Éviter tout produit contenant 'PTFE' ou 'perfluoro-'.", source: 'FDA 2024 / EWG' },
  { id: 27, category: 'endocrine', text: 'Les bisphénols BPS et BPF (remplaçants du BPA) sont tout aussi préoccupants : troubles de la fertilité, dysfonctionnements thyroïdiens, risques cancérigènes.', source: 'Environmental Health Perspectives' },
  { id: 28, category: 'endocrine', text: 'Le phénoxyéthanol, conservateur très répandu, est interdit en France dans les produits pour enfants de moins de 3 ans. Perturbateur endocrinien suspecté.', source: 'ANSES / Règlement cosmétiques UE' },
  { id: 29, category: 'environment', text: "En janvier 2025, l'UFC-Que Choisir a détecté des PFAS dans 96% des communes françaises testées, y compris Paris, Lyon et Bordeaux.", source: 'UFC-Que Choisir, janvier 2025' },
  { id: 30, category: 'environment', text: "Les microplastiques et PFAS ont infiltré le cycle de l'eau : pluie, neige, rivières, nappes phréatiques. Science (2020) en a détecté dans la pluie des parcs nationaux américains.", source: 'Science 2020 / Slate.fr 2025' },
  { id: 31, category: 'environment', text: 'Les poêles anti-adhésives au PTFE (Téflon) libèrent des PFAS quand surchauffées ou rayées. Préférer inox, fonte ou céramique sans revêtement chimique.', source: 'ECHA / EPA / EWG' },
  { id: 32, category: 'environment', text: 'Les PFAS sont présents dans les textiles imperméables, emballages alimentaires gras (papier pizza, pop-corn micro-ondes) et même le papier toilette.', source: 'Collège de France 2025 / ECHA' },
  { id: 33, category: 'environment', text: "Nature Medicine 2025 : les microplastiques dans les plaques d'athérome augmentent le risque cardiovasculaire de 4,5 fois. Première preuve directe d'un impact cardiovasculaire.", source: 'Nature Medicine 2024-2025' },
  { id: 34, category: 'environment', text: "Nous ingérons en moyenne 5 grammes de plastique par semaine — l'équivalent d'une carte de crédit — via l'eau, les aliments et l'air (Université de Newcastle / WWF).", source: 'Université de Newcastle / WWF 2019' },
  { id: 35, category: 'general', text: "Selon l'OMS, 40% des cancers sont évitables grâce à des changements de mode de vie. ToxiScan t'aide à agir sur les facteurs alimentation et cosmétique.", source: 'OMS / INCa 2024' },
  { id: 36, category: 'general', text: "L'effet cocktail : deux substances individuellement sans danger peuvent devenir toxiques combinées. Une femme applique en moyenne 12 à 19 produits par jour.", source: 'INSERM / EWG / ANSES' },
  { id: 37, category: 'general', text: "Le cancer du sein est le plus fréquent chez la femme. Les études lient l'exposition aux perturbateurs endocriniens (parabènes, phtalates, BPA) au risque accru.", source: 'IARC / Darbre 2004 / EWG' },
  { id: 38, category: 'general', text: 'Les nitrosamines — formées à partir des nitrites dans les charcuteries — sont parmi les substances les plus cancérigènes connues (Groupe 1).', source: 'ANSES 2022 / IARC / OMS' },
  { id: 39, category: 'general', text: "Une étude d'Oxford 2024 a montré que le colorant Red 40 (E129) cause des dommages à l'ADN de souris. Première preuve directe de génotoxicité pour ce colorant.", source: "Université d'Oxford 2024 / FDA" },
  { id: 40, category: 'general', text: "ToxiScan est basé sur les classifications officielles du CIRC, de l'OMS, de l'EFSA, de l'ANSES et de l'EWG. Chaque badge est fondé sur des preuves scientifiques vérifiées.", source: 'IARC / OMS / EFSA / ANSES / EWG' },
];

const FACTS_EN: ScanFact[] = [
  { id: 1, category: 'plastic', text: 'A plastic water bottle left in the sun releases BPA and phthalates into the water. These endocrine disruptors mimic estrogen and are linked to breast and ovarian cancer.', source: 'Slate.fr / ANSES 2025' },
  { id: 2, category: 'plastic', text: 'A PNAS study (2024) revealed that bottled water contains on average 240,000 nanoplastic fragments per liter — 100 times more than previous estimates.', source: 'PNAS, January 2024' },
  { id: 3, category: 'plastic', text: 'A NEJM study (2024) established a direct link between microplastics in arteries and a 4.5x higher risk of heart attack or stroke.', source: 'NEJM / Nature Medicine 2024' },
  { id: 4, category: 'plastic', text: 'February 2025: Nature Medicine showed that the human brain contains on average a teaspoon-equivalent of microplastics. +50% brain concentration between 2016 and 2024.', source: 'Nature Medicine, February 2025' },
  { id: 5, category: 'plastic', text: 'Drinking water from a bottle left in a sunlit car is risky: UV and heat accelerate phthalate release and multiply microplastics in the water.', source: 'Slate.fr / EPA 2024' },
  { id: 6, category: 'plastic', text: 'Microplastics have been detected in placenta, breast milk, umbilical cord blood and newborn organs. Prefer glass bottles during pregnancy.', source: 'INSERM / CNRS 2024' },
  { id: 7, category: 'plastic', text: 'Paradox: according to CNRS Toulouse (Jan 2025), 8 out of 10 bottled water brands contain MORE microplastics than tap water. The solution: a water filter.', source: 'CNRS Toulouse, January 2025' },
  { id: 8, category: 'plastic', text: 'Microplastics have been found in lungs, blood, liver, kidneys, heart, placenta and human bone marrow.', source: 'Nature, February 2025' },
  { id: 9, category: 'food', text: 'Processed meats (bacon, ham, sausages) have been classified as Group 1 carcinogens by the WHO since 2015 — the same category as tobacco. 50g/day = +18% colorectal cancer risk.', source: 'IARC Vol.114, WHO 2015' },
  { id: 10, category: 'food', text: 'Acrylamide forms when starches are cooked at high temperature: fries, chips, toast, coffee, cookies. Classified as Group 2A (probably carcinogenic) by IARC.', source: 'IARC Vol.60 / EFSA 2015' },
  { id: 11, category: 'food', text: "Glyphosate, the world's most used herbicide, has been classified 'probably carcinogenic' (Group 2A) by IARC since 2015. Found as residue on grains and GMO products.", source: 'IARC Vol.112, 2015' },
  { id: 12, category: 'food', text: "Cocoa can be contaminated with cadmium, a Group 1 heavy metal. It's not cocoa itself that's dangerous — it's the soil. Prefer certified organic chocolate low in cadmium.", source: 'EFSA / ANSES / IARC Vol.58' },
  { id: 13, category: 'food', text: 'Alcohol is classified Group 1 carcinogen by the WHO. Linked to 7 cancer types. No safe dose — even one glass a day increases breast cancer risk.', source: 'IARC Vol.100E / WHO 2024' },
  { id: 14, category: 'food', text: 'Drinking very hot beverages (>65°C / 149°F) — tea, coffee, mate — is classified Group 2A by IARC since 2018. Simple fix: wait 5 minutes before drinking.', source: 'IARC Vol.116, 2018' },
  { id: 15, category: 'food', text: 'Mycotoxins are invisible carcinogenic molds in poorly stored grains, corn, peanuts and coffee. Aflatoxins (Group 1) are among the most carcinogenic natural substances known.', source: 'IARC Vol.56, 82, 100F' },
  { id: 16, category: 'food', text: "Regular red meat consumption is classified 'probably carcinogenic' (Group 2A) by the WHO. Don't exceed 500g per week. BBQ produces heterocyclic amines.", source: 'IARC Vol.114, WHO 2015' },
  { id: 17, category: 'food', text: "Aspartame (E951) was classified possible carcinogen (Group 2B) by IARC in July 2023. Found in diet sodas, 0% yogurts, sugar-free candy and 'diet' products.", source: 'IARC Vol.134, July 2023' },
  { id: 18, category: 'food', text: 'FD&C artificial dyes (Red 40, Yellow 5, Yellow 6, Blue 1) contain contaminants like benzidine, a Group 1 carcinogen. FDA announced their gradual phase-out in 2025.', source: 'FDA/HHS, April 2025 / EWG' },
  { id: 19, category: 'food', text: 'Canned goods are often lined with resins containing BPA, an endocrine disruptor linked to hormone-dependent cancers.', source: 'INRAE/CNRS 2025' },
  { id: 20, category: 'food', text: 'Tuna, swordfish and shark concentrate methyl mercury, a Group 2B neurotoxin. Pregnant women and children must limit consumption.', source: 'IARC Vol.58 / EFSA' },
  { id: 21, category: 'endocrine', text: 'Parabens (methyl-, propyl-, butylparaben) are in 80% of cosmetics. They mimic estrogen and have been detected in breast tumors.', source: 'ANSES / Darbre 2004' },
  { id: 22, category: 'endocrine', text: 'Phthalates and parabens pose the greatest risk during pregnancy and early childhood. A 2024 meta-analysis links phthalates to increased miscarriage risk.', source: 'Systematic Review 2024 / EWG' },
  { id: 23, category: 'endocrine', text: 'Triclosan — antibacterial in toothpastes, deodorants, soaps — has been banned in US soaps since 2017. Endocrine disruptor affecting thyroid function.', source: 'FDA USA 2017 / ANSES' },
  { id: 24, category: 'endocrine', text: 'Chemical UV filters (oxybenzone, octinoxate, homosalate) are endocrine disruptors detected in blood and breast milk. Prefer mineral filters (zinc oxide).', source: 'FDA 2019 / EWG Skin Deep' },
  { id: 25, category: 'endocrine', text: 'Formaldehyde (Group 1) is released by preservatives: DMDM Hydantoin, Quaternium-15, Diazolidinyl Urea. Banned in Canada and several US states since 2020.', source: 'IARC / Campaign for Safe Cosmetics 2025' },
  { id: 26, category: 'endocrine', text: "PFAS have been detected in over 1,700 cosmetic products according to a 2024 FDA report. Avoid any product containing 'PTFE' or 'perfluoro-'.", source: 'FDA 2024 / EWG' },
  { id: 27, category: 'endocrine', text: 'Bisphenols BPS and BPF (BPA replacements) are equally concerning: fertility issues, thyroid dysfunction, increased cancer risks.', source: 'Environmental Health Perspectives' },
  { id: 28, category: 'endocrine', text: 'Phenoxyethanol, a widespread preservative, is banned in France in products for children under 3. Suspected endocrine disruptor.', source: 'ANSES / EU Cosmetics Regulation' },
  { id: 29, category: 'environment', text: 'In January 2025, UFC-Que Choisir detected PFAS in 96% of French towns tested, including Paris, Lyon and Bordeaux.', source: 'UFC-Que Choisir, January 2025' },
  { id: 30, category: 'environment', text: 'Microplastics and PFAS have infiltrated the water cycle: rain, snow, rivers, groundwater. Science (2020) even detected them in rain over US national parks.', source: 'Science 2020 / Slate.fr 2025' },
  { id: 31, category: 'environment', text: 'PTFE (Teflon) non-stick pans release PFAS when overheated or scratched. Prefer stainless steel, cast iron or uncoated ceramic.', source: 'ECHA / EPA / EWG' },
  { id: 32, category: 'environment', text: 'PFAS are present in waterproof textiles, grease-resistant food packaging (pizza paper, microwave popcorn) and even toilet paper.', source: 'Collège de France 2025 / ECHA' },
  { id: 33, category: 'environment', text: 'Nature Medicine 2025: microplastics in atheroma plaques increase cardiovascular risk by 4.5x. First direct evidence of cardiovascular impact.', source: 'Nature Medicine 2024-2025' },
  { id: 34, category: 'environment', text: 'We ingest on average 5 grams of plastic per week — equivalent to a credit card — through water, food and air (University of Newcastle / WWF).', source: 'University of Newcastle / WWF 2019' },
  { id: 35, category: 'general', text: 'According to the WHO, 40% of cancers are preventable through lifestyle changes. ToxiScan helps you act on food and cosmetics factors.', source: 'WHO / INCa 2024' },
  { id: 36, category: 'general', text: 'The cocktail effect: two individually harmless substances can become toxic when combined. A woman applies on average 12 to 19 products per day.', source: 'INSERM / EWG / ANSES' },
  { id: 37, category: 'general', text: 'Breast cancer is the most common cancer in women. Studies link exposure to endocrine disruptors (parabens, phthalates, BPA) to increased risk.', source: 'IARC / Darbre 2004 / EWG' },
  { id: 38, category: 'general', text: 'Nitrosamines — formed from nitrites in processed meats — are among the most carcinogenic substances known (Group 1 IARC).', source: 'ANSES 2022 / IARC / WHO' },
  { id: 39, category: 'general', text: 'A 2024 Oxford study showed that Red 40 (E129) causes DNA damage in mice. First direct evidence of genotoxicity for this widely used dye.', source: 'University of Oxford 2024 / FDA' },
  { id: 40, category: 'general', text: 'ToxiScan is based on official classifications from IARC, WHO, EFSA, ANSES and EWG. Every badge is grounded in verified scientific evidence.', source: 'IARC / WHO / EFSA / ANSES / EWG' },
];

export function getScanFacts(): ScanFact[] {
  return isEnglish() ? FACTS_EN : FACTS_FR;
}

export function pickRandomFactIndex(excludeIndex: number, total: number): number {
  if (total <= 1) return 0;
  let next = Math.floor(Math.random() * total);
  if (next === excludeIndex) {
    next = (next + 1) % total;
  }
  return next;
}
