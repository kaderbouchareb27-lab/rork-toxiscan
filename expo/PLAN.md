# ToxiScan — Scanner de produits pour détecter les substances cancérigènes


## Concept
Une app épurée et lumineuse, inspirée par la simplicité de Shazam. Fond blanc, design santé/bien-être, badges colorés pour les niveaux de risque. Un bouton, un scan, un résultat clair.

---

## Modèle économique

### GRATUIT
- [x] Scans/photos de produits illimités
- [x] Résultats avec badges de couleur (rouge, orange, jaune, vert)
- [x] Substances détectées avec explications
- [x] Recommandations et alternatives plus saines
- [x] Magasins bio recommandés
- [x] Le saviez-vous (fait du jour)
- [x] 1 message Dr. Toxi gratuit (historique chat du jour seulement, pas sauvegardé le lendemain)
- [x] Partage des résultats sur les réseaux sociaux
- [x] Quiz santé totalement gratuit
- [x] Pages légales (confidentialité, FAQ, transparence IA)
- [x] Historique des scans du jour uniquement (non persisté le lendemain)

### PREMIUM ToxiScan Pro (2,99$/mois ou 29,99$/an)
- [x] Dr. Toxi illimité
- [x] Historique permanent de tous les scans (sauvegardé)
- [x] Alertes en temps réel des nouveaux produits interdits, toxiques ou cancérigènes
- [x] 5$ reversés à des associations cancer (abonnement annuel)

### Paywall
- [x] Pas de paywall au démarrage
- [x] Paywall quand 2ème message Dr. Toxi tenté (bouton Fermer disponible)
- [x] Paywall accessible depuis Historique pour débloquer l'historique permanent
- [x] Paywall accessible depuis Alertes pour débloquer les alertes en temps réel
- [x] Paywall accessible depuis Profil → "Passer à ToxiScan Pro" (avec bouton Fermer)
- [x] Option annuelle 29,99$/an avec badge "Économisez 17%"
- [x] Option mensuelle 2,99$/mois
- [x] Texte donation cancer toujours visible
- [x] Lien "Restaurer un achat"
- [x] Pas d'essai gratuit

---

## Features

### Scan & Résultats
- [x] Scanner un produit via photo en un tap
- [x] Identification automatique des substances potentiellement cancérigènes
- [x] Badge de risque coloré instantané (rouge, orange, jaune, vert) basé sur les classifications CIRC/OMS
- [x] Fiche produit détaillée : photo, nom, marque, badge, substances détectées avec explications
- [x] Suggestions d'alternatives plus saines
- [x] Gros bouton "Partager ce résultat" sur chaque fiche
- [x] Magasins bio recommandés
- [x] Scans totalement illimités et gratuits

### Historique
- [x] Liste chronologique des produits scannés
- [x] Filtres rapides par niveau de risque
- [x] Réouverture d'une fiche produit en un tap
- [x] Gratuit : historique du jour uniquement (effacé le lendemain)
- [x] Pro : historique permanent sauvegardé

### Dr. Toxi — Assistant IA
- [x] Chat conversationnel avec un expert virtuel en toxicologie
- [x] Suggestions de questions rapides
- [x] Réponses courtes, factuelles, en français
- [x] Bannière de transparence IA
- [x] 1 message gratuit (historique chat non sauvegardé sans abo)
- [x] Paywall quand 2ème message tenté
- [x] Bouton "Partager" après chaque réponse de Dr. Toxi

### Profil
- [x] Statut d'abonnement (Gratuit / Pro)
- [x] Statistiques de scans avec répartition par badge
- [x] Pages légales : Politique de confidentialité, FAQ, Transparence IA
- [x] Lien de contact et restauration d'achat
- [x] Accès paywall depuis Profil

### Onboarding
- [x] Onboarding sur un seul écran (plus de "Suivant" répétés) : titre, illustration de scan, aperçu des 4 verdicts avec avatars Dr. Toxi
- [x] Bouton "Commencer à scanner" qui mène directement à l'accueil

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
2. **Paywall** — Choix d'abonnement (sans essai gratuit), apparaît uniquement pour Dr. Toxi illimité
3. **Scanner** (onglet principal) — Grand bouton central de scan, scans illimités
4. **Fiche Produit** — Badge de risque, substances, alternatives, gros bouton partage
5. **Historique** — Liste des scans avec filtres par risque (complet = Pro)
6. **Dr. Toxi** — Chat IA avec suggestions rapides, 1 msg/jour gratuit, partage des réponses
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
