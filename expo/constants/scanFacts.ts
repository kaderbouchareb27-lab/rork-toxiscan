import { getDeviceLanguage } from '@/utils/i18n';

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
  { id: 41, category: 'general', text: "La pilule contraceptive est classée Groupe 1 par le CIRC — comme l'alcool et la cigarette. Mais elle réduit aussi le risque de certains cancers. Le risque n'est pas équivalent.", source: 'IARC Vol.100A / OMS' },
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
  { id: 41, category: 'general', text: 'Oral contraceptives are classified Group 1 by the IARC — like alcohol and tobacco. But they also reduce the risk of certain cancers. The risk level is not equivalent.', source: 'IARC Vol.100A / WHO' },
];

const FACTS_KO: ScanFact[] = [
  { id: 1, category: 'plastic', text: '햇빛에 방치된 플라스틱 물병은 BPA와 프탈레이트를 물속으로 방출합니다. 이 내분비 교란 물질은 에스트로겐을 모방하며 유방암 및 난소암과 관련이 있습니다.', source: 'Slate.fr / ANSES 2025' },
  { id: 2, category: 'plastic', text: 'PNAS 연구(2024)에 따르면 생수에는 리터당 평균 24만 개의 나노플라스틱 조각이 들어 있으며, 이는 이전 추정치보다 100배 많습니다.', source: 'PNAS, 2024년 1월' },
  { id: 3, category: 'plastic', text: 'NEJM 연구(2024)는 동맥 속 미세플라스틱과 심장마비·뇌졸중 위험이 4.5배 높아지는 것 사이의 직접적 연관성을 밝혔습니다.', source: 'NEJM / Nature Medicine 2024' },
  { id: 4, category: 'plastic', text: '2025년 2월: Nature Medicine는 인간의 뇌에 평균 찻숟가락 하나 분량의 미세플라스틱이 들어 있음을 보여줬습니다. 2016~2024년 사이 뇌 농도가 50% 증가했습니다.', source: 'Nature Medicine, 2025년 2월' },
  { id: 5, category: 'plastic', text: '햇볕이 드는 차 안에 방치된 물병의 물을 마시는 것은 위험합니다. 자외선과 열이 프탈레이트 방출을 가속하고 물속 미세플라스틱을 늘립니다.', source: 'Slate.fr / EPA 2024' },
  { id: 6, category: 'plastic', text: '미세플라스틱은 태반, 모유, 탯줄 혈액, 신생아 장기에서 검출되었습니다. 임신 중에는 유리 젖병을 사용하세요.', source: 'INSERM / CNRS 2024' },
  { id: 7, category: 'plastic', text: '역설: CNRS 툴루즈(2025년 1월)에 따르면 생수 브랜드 10개 중 8개가 수돗물보다 미세플라스틱이 더 많습니다. 해결책은 정수 필터입니다.', source: 'CNRS Toulouse, 2025년 1월' },
  { id: 8, category: 'plastic', text: '미세플라스틱은 폐, 혈액, 간, 신장, 심장, 태반, 사람의 골수에서 발견되었습니다.', source: 'Nature, 2025년 2월' },
  { id: 9, category: 'food', text: '가공육(베이컨, 햄, 소시지)은 2015년부터 WHO가 1군 발암물질로 분류했으며, 이는 담배와 같은 등급입니다. 하루 50g = 대장암 위험 18% 증가.', source: 'IARC Vol.114, WHO 2015' },
  { id: 10, category: 'food', text: '아크릴아마이드는 전분을 고온에서 조리할 때 생성됩니다: 감자튀김, 칩, 토스트, 커피, 쿠키. IARC가 2A군(발암 추정)으로 분류했습니다.', source: 'IARC Vol.60 / EFSA 2015' },
  { id: 11, category: 'food', text: '세계에서 가장 많이 쓰이는 제초제인 글리포세이트는 2015년부터 IARC가 발암 추정(2A군)으로 분류했습니다. 곡물과 GMO 제품에 잔류물로 발견됩니다.', source: 'IARC Vol.112, 2015' },
  { id: 12, category: 'food', text: '코코아는 1군 중금속인 카드뮴에 오염될 수 있습니다. 위험한 것은 코코아 자체가 아니라 토양입니다. 카드뮴이 적은 유기농 인증 초콜릿을 선택하세요.', source: 'EFSA / ANSES / IARC Vol.58' },
  { id: 13, category: 'food', text: '알코올은 WHO가 1군 발암물질로 분류합니다. 7가지 암과 관련이 있습니다. 안전한 양은 없으며, 하루 한 잔도 유방암 위험을 높입니다.', source: 'IARC Vol.100E / WHO 2024' },
  { id: 14, category: 'food', text: '아주 뜨거운 음료(65°C 이상) — 차, 커피, 마테 — 는 2018년부터 IARC가 2A군으로 분류했습니다. 간단한 해결책: 마시기 전 5분 기다리세요.', source: 'IARC Vol.116, 2018' },
  { id: 15, category: 'food', text: '곰팡이 독소는 잘못 보관된 곡물, 옥수수, 땅콩, 커피에 생기는 보이지 않는 발암성 곰팡이입니다. 아플라톡신(1군)은 알려진 천연 물질 중 가장 발암성이 강합니다.', source: 'IARC Vol.56, 82, 100F' },
  { id: 16, category: 'food', text: '붉은 고기를 정기적으로 먹는 것은 WHO가 발암 추정(2A군)으로 분류합니다. 주당 500g을 넘기지 마세요. 바비큐는 헤테로사이클릭아민을 생성합니다.', source: 'IARC Vol.114, WHO 2015' },
  { id: 17, category: 'food', text: '아스파탐(E951)은 2023년 7월 IARC가 발암 가능 물질(2B군)로 분류했습니다. 다이어트 탄산음료, 무지방 요거트, 무설탕 사탕, 다이어트 제품에 들어 있습니다.', source: 'IARC Vol.134, 2023년 7월' },
  { id: 18, category: 'food', text: 'FD&C 인공 색소(Red 40, Yellow 5, Yellow 6, Blue 1)에는 1군 발암물질인 벤지딘 같은 오염물질이 들어 있습니다. FDA는 2025년 단계적 퇴출을 발표했습니다.', source: 'FDA/HHS, 2025년 4월 / EWG' },
  { id: 19, category: 'food', text: '통조림은 종종 BPA가 든 수지로 코팅되며, BPA는 호르몬 의존성 암과 관련된 내분비 교란 물질입니다.', source: 'INRAE/CNRS 2025' },
  { id: 20, category: 'food', text: '참치, 황새치, 상어는 2B군 신경독인 메틸수은을 농축합니다. 임산부와 어린이는 섭취를 제한해야 합니다.', source: 'IARC Vol.58 / EFSA' },
  { id: 21, category: 'endocrine', text: '파라벤(메틸·프로필·부틸파라벤)은 화장품의 80%에 들어 있습니다. 에스트로겐을 모방하며 유방 종양에서 검출되었습니다.', source: 'ANSES / Darbre 2004' },
  { id: 22, category: 'endocrine', text: '프탈레이트와 파라벤은 임신과 영유아기에 가장 큰 위험을 줍니다. 2024년 메타분석은 프탈레이트를 유산 위험 증가와 연결했습니다.', source: 'Systematic Review 2024 / EWG' },
  { id: 23, category: 'endocrine', text: '치약, 데오도란트, 비누의 항균제 트리클로산은 2017년부터 미국 비누에서 금지되었습니다. 갑상선 기능에 영향을 주는 내분비 교란 물질입니다.', source: 'FDA USA 2017 / ANSES' },
  { id: 24, category: 'endocrine', text: '화학적 자외선 차단 성분(옥시벤존, 옥티노세이트, 호모살레이트)은 혈액과 모유에서 검출된 내분비 교란 물질입니다. 미네랄 차단제(산화아연)를 선택하세요.', source: 'FDA 2019 / EWG Skin Deep' },
  { id: 25, category: 'endocrine', text: '포름알데히드(1군)는 보존제 DMDM 하이단토인, 쿼터늄-15, 디아졸리디닐 우레아에서 방출됩니다. 2020년부터 캐나다와 여러 미국 주에서 금지되었습니다.', source: 'IARC / Campaign for Safe Cosmetics 2025' },
  { id: 26, category: 'endocrine', text: '2024년 FDA 보고서에 따르면 PFAS는 1,700개 이상의 화장품에서 검출되었습니다. PTFE나 perfluoro-가 들어간 제품은 피하세요.', source: 'FDA 2024 / EWG' },
  { id: 27, category: 'endocrine', text: '비스페놀 BPS와 BPF(BPA 대체물)도 똑같이 우려됩니다: 생식 문제, 갑상선 기능 장애, 암 위험 증가.', source: 'Environmental Health Perspectives' },
  { id: 28, category: 'endocrine', text: '널리 쓰이는 보존제 페녹시에탄올은 프랑스에서 3세 미만 어린이용 제품에 금지되어 있습니다. 내분비 교란 의심 물질입니다.', source: 'ANSES / EU 화장품 규정' },
  { id: 29, category: 'environment', text: '2025년 1월, UFC-Que Choisir는 파리, 리옹, 보르도를 포함해 검사한 프랑스 지자체의 96%에서 PFAS를 검출했습니다.', source: 'UFC-Que Choisir, 2025년 1월' },
  { id: 30, category: 'environment', text: '미세플라스틱과 PFAS는 물 순환에 침투했습니다: 비, 눈, 강, 지하수. Science(2020)는 미국 국립공원 위로 내리는 빗물에서도 검출했습니다.', source: 'Science 2020 / Slate.fr 2025' },
  { id: 31, category: 'environment', text: 'PTFE(테플론) 논스틱 팬은 과열되거나 긁히면 PFAS를 방출합니다. 스테인리스, 주철, 무코팅 세라믹을 선택하세요.', source: 'ECHA / EPA / EWG' },
  { id: 32, category: 'environment', text: 'PFAS는 방수 섬유, 기름에 강한 식품 포장재(피자 종이, 전자레인지 팝콘), 심지어 화장지에도 들어 있습니다.', source: 'Collège de France 2025 / ECHA' },
  { id: 33, category: 'environment', text: 'Nature Medicine 2025: 죽상경화 플라크 속 미세플라스틱이 심혈관 위험을 4.5배 높입니다. 심혈관 영향에 대한 최초의 직접 증거입니다.', source: 'Nature Medicine 2024-2025' },
  { id: 34, category: 'environment', text: '우리는 물, 음식, 공기를 통해 매주 평균 5g의 플라스틱 — 신용카드 한 장 분량 — 을 섭취합니다(뉴캐슬 대학교 / WWF).', source: '뉴캐슬 대학교 / WWF 2019' },
  { id: 35, category: 'general', text: 'WHO에 따르면 암의 40%는 생활습관 변화로 예방할 수 있습니다. ToxiScan은 식품과 화장품 요인에 대해 행동하도록 돕습니다.', source: 'WHO / INCa 2024' },
  { id: 36, category: 'general', text: '칵테일 효과: 개별적으로는 무해한 두 물질이 결합하면 독성을 띨 수 있습니다. 여성은 하루 평균 12~19개의 제품을 사용합니다.', source: 'INSERM / EWG / ANSES' },
  { id: 37, category: 'general', text: '유방암은 여성에게 가장 흔한 암입니다. 연구들은 내분비 교란 물질(파라벤, 프탈레이트, BPA) 노출을 위험 증가와 연결합니다.', source: 'IARC / Darbre 2004 / EWG' },
  { id: 38, category: 'general', text: '니트로사민 — 가공육의 아질산염에서 형성됨 — 은 알려진 가장 발암성이 강한 물질 중 하나입니다(IARC 1군).', source: 'ANSES 2022 / IARC / WHO' },
  { id: 39, category: 'general', text: '2024년 옥스퍼드 연구는 Red 40(E129)이 쥐의 DNA에 손상을 입힌다는 것을 보여줬습니다. 이 색소의 유전독성에 대한 최초의 직접 증거입니다.', source: '옥스퍼드 대학교 2024 / FDA' },
  { id: 40, category: 'general', text: 'ToxiScan은 IARC, WHO, EFSA, ANSES, EWG의 공식 분류에 기반합니다. 모든 배지는 검증된 과학적 근거에 바탕을 둡니다.', source: 'IARC / WHO / EFSA / ANSES / EWG' },
  { id: 41, category: 'general', text: '경구 피임약은 IARC가 1군으로 분류합니다 — 알코올, 담배와 같습니다. 하지만 특정 암의 위험은 낮추기도 합니다. 위험 수준이 동등하지는 않습니다.', source: 'IARC Vol.100A / WHO' },
];

export function getScanFacts(): ScanFact[] {
  const lang = getDeviceLanguage();
  if (lang === 'ko') return FACTS_KO;
  if (lang === 'en') return FACTS_EN;
  return FACTS_FR;
}

export function pickRandomFactIndex(excludeIndex: number, total: number): number {
  if (total <= 1) return 0;
  let next = Math.floor(Math.random() * total);
  if (next === excludeIndex) {
    next = (next + 1) % total;
  }
  return next;
}
