export const FOOD_INGREDIENTS_REFERENCE_V4 = `
===========================================
BASE DE DONNÉES ALIMENTAIRE TOXISCAN V4 — RÉFÉRENCE OFFICIELLE
===========================================
Version 2.0 corrigée — Avril 2026
Sources : IARC Vol.1–140, EPA IRIS, NTP RoC 15e, EFSA, ANSES, CalProp 65, CSPI, EWG, JECFA, FDA/HHS
⚠️ Chaque classification ci-dessous est BASÉE SUR LA MONOGRAPHIE OFFICIELLE. Ne jamais inventer de groupe CIRC.

----- LÉGENDE OFFICIELLE DES BADGES ALIMENTAIRES -----
🔴 PRODUIT CANCÉRIGÈNE (badge_global: "danger") → Groupe 1 IARC confirmé chez l'humain.
🟠 ATTENTION (badge_global: "probable") → Groupe 2A IARC OU 2+ substances controversées cumulées.
🟡 AVEC MODÉRATION (badge_global: "possible") → Groupe 2B seul OU 1 substance controversée isolée.
✅ APPROUVÉ (badge_global: "aucun") → Aucun ingrédient des groupes 1, 2A, 2B ou controversé détecté.

Groupe 3 IARC (BHT) = NON CLASSIFIABLE. Badge controversé SEULEMENT si combiné.
FD&C Red 40 (E129) = niveau_risque="possible" (ORANGE) — études dommages ADN Oxford 2024 + phase-out FDA 2025 + interdiction écoles Californie. Yellow 5, Yellow 6, Blue 1, Blue 2, Green 3 = AUCUN groupe IARC officiel = controversé uniquement (jaune si seul, orange si cumulés).

----- RÈGLES ABSOLUES DE COHÉRENCE (à respecter TOUJOURS) -----
1. Cacao / chocolat / poudre de cacao / beurre de cacao = INGRÉDIENT NORMAL. JAMAIS de badge cadmium ou cancérigène. Le cadmium n'est signalé QUE si le mot "cadmium" apparaît littéralement dans la liste d'ingrédients.
2. BHT (E321) = Groupe 3 IARC (non classifiable). JAMAIS de badge cancérigène. Controversé seulement si combiné.
3. Acide citrique (E330) = non cancérigène, non controversé. Aucun badge.
4. Sodium benzoate (E211) SEUL ≠ cancérigène. Le benzène se forme uniquement EN COMBINAISON avec Vitamine C / acide ascorbique.
5. Le mot "probable" / "probablement cancérigène" est RÉSERVÉ au Groupe 2A. Jamais pour 2B (utiliser "possible") ni controversé (utiliser "favorise le cancer" ou "controversé").
6. Colorants FD&C (E102, E110, E129, E132, E133, E143) : classification_circ = "Non classé par le CIRC". Explication standard : "Ce colorant artificiel n'est pas classé cancérogène par le CIRC. Cependant, des études scientifiques ont détecté des contaminants comme la benzidine (cancérigène Groupe 1) dans sa composition. Des liens avec l'hyperactivité chez l'enfant ont été documentés (étude Lancet 2007). La FDA américaine a annoncé son retrait progressif des aliments en 2025." JAMAIS mentionner Groupe 2B pour ces colorants.
7. EAU EMBOUTEILLÉE EN PLASTIQUE (PET) — bouteille d'eau minérale ou de source vendue en plastique (Evian, Cristaline, Volvic, Nestlé Pure Life, Fiji, Dasani, etc.) : l'eau elle-même reste un ingrédient naturel, mais l'emballage PET pose un risque documenté. Badge global : "possible" (jaune — AVEC MODÉRATION). Ajouter systématiquement dans substances_detectees une entrée "Emballage PET (plastique)" avec niveau_risque: "possible", classification_circ: "Non classé par le CIRC — contamination documentée", et description : "Les bouteilles en plastique PET peuvent libérer des microplastiques, des phtalates et de l'antimoine dans l'eau, surtout lorsqu'elles sont stockées à la chaleur (entrepôts, camions, voitures au soleil). Une étude PNAS 2024 a détecté en moyenne 240 000 fragments de nanoplastiques par litre d'eau embouteillée. Recommandation : privilégier l'eau en bouteille de verre ou l'eau du robinet filtrée, et ne jamais laisser une bouteille plastique exposée au soleil ou à la chaleur." Le verdict global ne doit PAS être "danger" ni "probable" pour de l'eau plate en PET seule — rester sur "possible" (prudence). Pour l'eau en bouteille de verre : badge "aucun" (approuvé), aucun avertissement plastique.

===========================================
TABLE COMPLÈTE — 50 SUBSTANCES ALIMENTAIRES VÉRIFIÉES
===========================================

🔴 GROUPE 1 IARC — CANCÉRIGÈNES CONFIRMÉS CHEZ L'HUMAIN (badge_global: "danger")
- Viandes transformées (bacon, jambon, saucisses, hot-dogs, charcuterie) — IARC Vol.114 (2015)
- Nitrite de sodium / Nitrate de sodium (E250, E251, E249, E252) — précurseurs de nitrosamines confirmées Groupe 1
- Alcool éthylique / Boissons alcoolisées — IARC Vol.100E (2012)
- Aflatoxines B1, B2, G1, G2 (arachides, maïs, noix moisis) — IARC Vol.100F
- Poisson salé style chinois traditionnel — IARC Vol.56 (1993)
- Acide aristolochique (contaminant végétal dans certaines herbes) — IARC Vol.100A
- Benzène (solvant résiduel, contaminant emballage, formé par E211 + vitamine C) — IARC Vol.100F
- Benzo[a]pyrène / HAP (viandes fumées ou grillées au charbon) — IARC Vol.100F
- Formaldéhyde (E240 interdit UE — conservateur résiduel / contaminant) — IARC Vol.100F
- Arsenic inorganique (eau de boisson, riz, fruits de mer) — IARC Vol.100C
- Cadmium (contaminant céréales, cacao, fruits de mer, abats — LITTÉRAL uniquement) — IARC Vol.100C
- Plomb et composés du plomb (contaminant aliments, épices, emballages) — IARC Vol.100C

🟠 GROUPE 2A IARC — PROBABLEMENT CANCÉRIGÈNES (badge_global: "probable")
- Viande rouge (bœuf, porc, agneau, veau, cheval) consommée régulièrement — IARC Vol.114
- Acrylamide (frites, chips, pain grillé, café torréfié, biscuits cuits à haute température) — IARC Vol.60
- Glyphosate (résidus d'herbicide sur OGM, légumineuses, céréales) — IARC Vol.112
- Boissons très chaudes >65°C (thé, café, maté) — IARC Vol.116 (2018)
- IQ — 2-Amino-3-méthylimidazo[4,5-f]quinoléine (viandes cuites à haute température) — IARC Vol.56
- PhIP — 2-Amino-1-méthyl-6-phénylimidazo[4,5-b]pyridine (viandes grillées) — IARC Vol.56
- Méthylène chlorure / DCM (solvant décaféination café) — IARC Vol.110

🟡 GROUPE 2B IARC — POSSIBLEMENT CANCÉRIGÈNES (badge_global: "possible" si seul)
- Aspartame (E951) — IARC Vol.134 (juillet 2023) — preuves limitées cancer foie
- BHA / Butylhydroxyanisole (E320) — IARC Vol.40
- FD&C Red 3 / Érythrosine (E127) — IARC Vol.51 — ⚠️ INTERDIT FDA aliments janvier 2025 (Delaney Clause)
- FD&C Red 40 / Allura Red (E129) — niveau_risque="possible" (ORANGE). Études dommages ADN (Oxford 2024), contaminant benzidine résiduel, phase-out FDA avril 2025, interdiction écoles Californie (AB 2316, 2024), liens hyperactivité enfants (étude Southampton 2007). Plus problématique que les autres colorants FD&C — TOUJOURS classer en "possible" (orange), JAMAIS en "controversé" (jaune).
- Potassium bromate (E924) — IARC Vol.73 — Interdit UE, Canada, UK, Brésil, Chine, Inde
- 4-Méthylimidazole / 4-MEI (E150c, E150d — caramel brun) — IARC Vol.101
- Dioxyde de titane (E171) — IARC Vol.93 — ⚠️ Suspendu aliments UE depuis 2022
- Aflatoxine M1 (lait de vaches exposées, produits laitiers) — IARC Vol.56
- Ochratoxine A (mycotoxine : céréales, raisins, café, épices) — IARC Vol.56
- Fumonisines B1 et B2 (mycotoxines : maïs et produits dérivés) — IARC Vol.82
- MeIQ et MeIQx (amines hétérocycliques : viandes cuites, poissons grillés) — IARC Vol.56
- Légumes marinés méthode asiatique traditionnelle — IARC Vol.56
- Acide caféique (naturellement présent : café, fruits, légumes) — IARC Vol.56
- Aloe vera extrait feuille entière (suppléments uniquement, pas le gel cosmétique) — IARC Vol.108
- Mercure méthylé / méthylmercure (poissons gras : thon, espadon, requin) — IARC Vol.58

⚪ GROUPE 3 IARC — NON CLASSIFIABLE (PAS de badge cancérigène)
- BHT / Butylhydroxytoluène (E321) — IARC Vol.40, Suppl.7 (1987) : Groupe 3. NE JAMAIS afficher comme cancérigène. Controversé uniquement si combiné à d'autres substances problématiques.

🟠 SUBSTANCES CONTROVERSÉES (aucun groupe IARC officiel) — classification_circ: "Non classé par le CIRC"
- FD&C Yellow 5 / Tartrazine (E102) — contaminants benzidine + 4-aminobiphényl, hyperactivité (Lancet 2007)
- FD&C Yellow 6 / Sunset Yellow (E110) — contaminant benzidine, tumeurs surrénales animales
- FD&C Blue 1 / Bleu brillant (E133) — données sécurité long terme insuffisantes EFSA
- FD&C Blue 2 / Indigo Carmin (E132) — quelques études animales positives
- FD&C Green 3 / Vert solide (E143) — NON autorisé UE
- Carraghénane (E407) — études inflammation digestive (Dr. Tobacman, NIH). ⚠️ NE PAS confondre avec poligeenan (carraghénane dégradée).
- Sirop de maïs haute teneur en fructose (HFCS) — obésité, syndrome métabolique, inflammation chronique
- Sodium benzoate (E211) — benzène formé SEULEMENT en présence de Vitamine C
- Huile de palme raffinée / hydrogénée — contaminants 3-MCPD et glycidol (esters) à haute T°
- Sucre ajouté en grande quantité (>10% AJR/portion) — obésité, insulinorésistance, inflammation
- TBHQ / Tertiobutylhydroquinone (E319) — immunotoxicité suggérée, tumeurs à hautes doses
- Azodicarbonamide / ADA (E927a) — semicarbazide génotoxique in vitro. Interdit UE/Australie.
- Polysorbate 80 / Tween 80 (E433) — altération microbiome intestinal (étude Georgia State 2015)
- Carboxymethyl cellulose / CMC (E466) — altération microbiome, inflammation intestinale chronique
- Glutamate monosodique / MSG (E621) — excitotoxine, maux de tête
- Disodium inosinate (E631), Disodium guanylate (E627) — exhausteurs synthétiques, toujours avec MSG
- Sucralose (E955) — édulcorant controversé
- Maltodextrine — index glycémique élevé, inflammation intestinale
- Huiles industrielles (tournesol, canola, soja, maïs) — pro-inflammatoires, oméga-6

===========================================
RÈGLES ToxiScan pour DÉTERMINER LE VERDICT FINAL
===========================================
RÈGLE 1 — 🔴 "danger" → UNIQUEMENT si au moins 1 ingrédient Groupe 1 IARC ci-dessus.
RÈGLE 2 — 🟠 "probable" → (a) présence d'1+ ingrédient Groupe 2A, OU (b) 2+ substances controversées cumulées.
RÈGLE 3 — 🟡 "possible" → Groupe 2B seul OU 1 substance controversée isolée OU sucre en grande quantité.
RÈGLE 4 — ✅ "aucun" → aucun ingrédient problématique.

ATTENTION : Sucre, sel, vinaigre, eau, huile d'olive, épices, herbes, légumes, fruits = ingrédients naturels. NE COMPTENT PAS dans le cumul. Un produit 100% naturel reste VERT même avec un peu de sel/sucre.

===========================================
FIN RÉFÉRENCE V4
===========================================
`;
