# ToxiScan — Scanner de produits pour détecter les substances cancérigènes


## Concept
Une app épurée et lumineuse, inspirée par la simplicité de Shazam. Fond blanc, design santé/bien-être, badges colorés pour les niveaux de risque. Un bouton, un scan, un résultat clair.

---

## Features

### Scan & Résultats
- Scanner un code-barres en un tap via un grand bouton central
- Identification automatique des additifs potentiellement cancérigènes
- Badge de risque coloré instantané (rouge, orange, jaune, vert) basé sur les classifications CIRC/OMS
- Fiche produit détaillée : photo, nom, marque, badge, substances détectées avec explications
- Suggestions d'alternatives plus sûres
- Partage du résultat

### Historique
- Liste chronologique de tous les produits scannés
- Filtres rapides par niveau de risque
- Réouverture d'une fiche produit en un tap

### Dr. Toxi — Assistant IA
- Chat conversationnel avec un expert virtuel en ingrédients ultra-transformés et cancérigènes
- Personnalité d'ami de confiance et d'allié (jamais un "ChatGPT" neutre) : il comprend les utilisateurs méfiants de l'agroalimentaire, les prend au sérieux et est de leur côté
- Donne toujours un verdict couleur clair dans le chat (rouge / orange / jaune / vert), même sans photo
- Ne contredit JAMAIS un scan ni la base de données officielle (source de vérité unique)
- Propose de vraies alternatives concrètes (marque précise + enseigne du pays), jamais de demi-mesures
- Réponses courtes et lisibles sur mobile, chaleureuses, en FR/EN
- Garde-fou santé : n'attaque jamais médecins/vaccins, ne pose pas de diagnostic, renvoie au médecin
- Suggestions de questions rapides + bannière de transparence IA
- Intégré via le toolkit IA de Rork

### Profil
- Statut d'abonnement
- Statistiques de scans avec répartition par badge
- Pages légales : Politique de confidentialité, FAQ (accordéon), Transparence IA
- Lien de contact et restauration d'achat

### Onboarding
- Onboarding sur un seul écran (plus de "Suivant" répétés) : titre, illustration de scan, aperçu des 4 verdicts avec avatars Dr. Toxi
- Bouton "Commencer à scanner" qui mène directement à l'accueil

### Paywall (maquette visuelle)
- Écran d'abonnement avec options mensuelle et annuelle
- Mise en avant de l'option annuelle avec badge "Économisez 45%"
- Bouton "Passer à ToxiScan Pro" (pas d'essai gratuit)
- AUCUN paywall au démarrage : Consentement IA → Onboarding → Scanner directement
- Paywall obligatoire UNIQUEMENT quand les 3 scans OU 3 messages Dr. Toxi sont épuisés (pas de bouton fermer, pas de skip)
- Paywall accessible volontairement depuis Profil → "Passer à ToxiScan Pro" (avec bouton Fermer)

---

## Design
- **Fond** : blanc pur, espacement généreux, design lumineux et rassurant
- **Couleurs des badges** : rouge (#FF3B30), orange (#FF9500), jaune (#FFCC00), vert broccoli unique (#2E9E34)
- **Texte** : noir (#1A1A1A) principal, gris (#8E8E93) secondaire
- **Style** : premium mobile-first, icônes fines arrondies, typographie grande et lisible
- **Écran d'analyse** : loader léger et rapide (calibré ~1-3s), avatar Dr. Toxi subtil avec halo pulsé + anneau, courte ligne de statut rassurante (« Lecture de l'étiquette… » → « Analyse des ingrédients… » → « Inspection approfondie… » si plus long), barre indéterminée — pas de compteur %, pas de carrousel d'infos
- **Pas d'emojis** dans l'interface (sauf chat Dr. Toxi)

---

## Screens

1. **Onboarding** — un seul écran : titre, illustration de scan, aperçu des 4 verdicts avec avatars Dr. Toxi, accès direct à l'accueil
2. **Paywall** — Choix d'abonnement direct (sans essai gratuit)
3. **Scanner** (onglet principal) — Grand bouton central de scan
4. **Fiche Produit** — Badge de risque, substances, alternatives, partage
5. **Historique** — Liste des scans avec filtres par risque
6. **Dr. Toxi** — Chat IA avec suggestions rapides
7. **Profil** — Compte, stats, pages légales
8. **Pages légales** — Confidentialité, FAQ, Transparence IA

---

## Navigation
Barre d'onglets en bas avec 4 onglets :
1. Scanner (icône code-barres)
2. Historique (icône liste)
3. Dr. Toxi (icône bulle de chat)
4. Profil (icône personne)

---

## Icône de l'app
- Fond beige doré #F5F0E8 avec le logo brocoli + loupe conservé à l'identique
- Style clean et médical, inspirant confiance
