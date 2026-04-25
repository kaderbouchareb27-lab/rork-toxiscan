import * as Localization from 'expo-localization';

type Lang = 'fr' | 'en';

let cachedLang: Lang | null = null;

export function getDeviceLanguage(): Lang {
  if (cachedLang) return cachedLang;
  try {
    const locales = Localization.getLocales();
    const langCode = (locales?.[0]?.languageCode ?? '').toLowerCase();
    console.log('[i18n] Device language code:', langCode);
    cachedLang = langCode === 'en' ? 'en' : 'fr';
  } catch (e) {
    console.log('[i18n] Error detecting language:', e);
    cachedLang = 'fr';
  }
  return cachedLang;
}

const translations = {
  // ===== TABS =====
  tab_scanner: { fr: 'Scanner', en: 'Scanner' },
  tab_history: { fr: 'Historique', en: 'History' },
  tab_drtoxi: { fr: 'Dr. Toxi', en: 'Dr. Toxi' },
  tab_profile: { fr: 'Profil', en: 'Profile' },

  // ===== ROOT LAYOUT =====
  error_occurred: { fr: 'Une erreur est survenue', en: 'An error occurred' },
  unknown_error: { fr: 'Erreur inconnue', en: 'Unknown error' },
  retry: { fr: 'Réessayer', en: 'Retry' },
  back: { fr: 'Retour', en: 'Back' },
  nav_about: { fr: 'À propos', en: 'About' },
  nav_faq: { fr: 'FAQ', en: 'FAQ' },
  nav_privacy: { fr: 'Confidentialité', en: 'Privacy' },
  nav_terms: { fr: 'Conditions', en: 'Terms' },
  nav_transparency: { fr: 'Transparence IA', en: 'AI Transparency' },

  // ===== SCANNER =====
  protect_health: { fr: 'Protégez votre santé au quotidien', en: 'Protect your health every day' },
  photo_product: { fr: 'Photographier un produit', en: 'Photograph a product' },
  scan_hint: { fr: "Photographiez la liste d'ingrédients pour un résultat précis", en: 'Photograph the ingredient list for accurate results' },
  cat_food: { fr: 'Aliments', en: 'Food' },
  cat_cosmetics: { fr: 'Cosmétiques', en: 'Cosmetics' },
  cat_household: { fr: 'Ménagers', en: 'Household' },
  cat_clothing: { fr: 'Vêtements', en: 'Clothing' },
  cat_utensils: { fr: 'Ustensiles', en: 'Utensils' },
  analysis_in_progress: { fr: 'Analyse en cours', en: 'Analysis in progress' },
  drtoxi_examining: { fr: 'Dr. Toxi examine votre produit...', en: 'Dr. Toxi is examining your product...' },
  error_process_photo: { fr: 'Impossible de traiter la photo. Veuillez réessayer.', en: 'Unable to process the photo. Please try again.' },
  error_invalid_photo: { fr: 'La photo est invalide. Veuillez reprendre la photo.', en: 'The photo is invalid. Please retake it.' },
  error_analysis_failed: { fr: "L'analyse a échoué. Vérifiez votre connexion et réessayez.", en: 'Analysis failed. Check your connection and try again.' },
  error_analyze_product: { fr: "Impossible d'analyser ce produit. Veuillez reprendre la photo avec un meilleur éclairage.", en: 'Unable to analyze this product. Please retake the photo with better lighting.' },
  error_analyze_photo: { fr: "Impossible d'analyser la photo. Veuillez reprendre la photo et réessayer.", en: 'Unable to analyze the photo. Please retake it and try again.' },
  error_analysis_title: { fr: "Erreur d'analyse", en: 'Analysis error' },
  error_generic: { fr: 'Erreur', en: 'Error' },
  error_open_camera: { fr: "Impossible d'ouvrir la caméra.", en: 'Unable to open the camera.' },
  camera_disabled_title: { fr: 'Accès à la caméra désactivé', en: 'Camera access disabled' },
  camera_disabled_msg: { fr: 'Pour photographier vos produits, activez la caméra dans les réglages de votre appareil.', en: 'To photograph your products, enable the camera in your device settings.' },
  open_settings: { fr: 'Ouvrir les réglages', en: 'Open settings' },
  ok: { fr: 'OK', en: 'OK' },

  // ===== HISTORY =====
  history_title: { fr: 'Historique', en: 'History' },
  filter_all: { fr: 'Tous', en: 'All' },
  filter_favorites: { fr: 'Favoris', en: 'Favorites' },
  filter_danger: { fr: 'Cancérigène', en: 'Carcinogenic' },
  filter_caution: { fr: 'Attention', en: 'Warning' },
  filter_moderation: { fr: 'Modération', en: 'Moderation' },
  filter_approved: { fr: 'Approuvé', en: 'Approved' },
  clear_history_title: { fr: "Effacer l'historique", en: 'Clear history' },
  clear_history_msg: { fr: "Voulez-vous vraiment supprimer tout l'historique de vos scans ?", en: 'Do you really want to delete all your scan history?' },
  cancel: { fr: 'Annuler', en: 'Cancel' },
  clear: { fr: 'Effacer', en: 'Clear' },
  history_limit_banner: { fr: '3 derniers produits visibles — Illimité avec Pro', en: 'Last 3 products visible — Unlimited with Pro' },
  no_favorites: { fr: 'Aucun favori', en: 'No favorites' },
  no_products: { fr: 'Aucun produit analysé', en: 'No products analyzed' },
  add_favorites_hint: { fr: 'Ajoutez des produits en favoris depuis la fiche résultat', en: 'Add products to favorites from the result page' },
  photo_product_hint: { fr: 'Photographiez un produit pour le voir ici', en: 'Photograph a product to see it here' },
  full_history: { fr: 'Historique complet', en: 'Full history' },
  full_history_desc: { fr: 'Retrouvez tous vos produits scannés avec Dr.Toxi Pro', en: 'Find all your scanned products with Dr.Toxi Pro' },
  see_offers: { fr: 'Voir les offres', en: 'See offers' },

  // ===== DR. TOXI CHAT =====
  your_ingredient_expert: { fr: 'Ton expert en ingrédients', en: 'Your ingredient expert' },
  disclaimer: { fr: 'Informatif uniquement — ne remplace pas un avis médical.', en: 'For information only — does not replace medical advice.' },
  free_messages_counter: { fr: (remaining: number, limit: number) => `${remaining}/${limit} messages gratuits aujourd'hui — Illimité avec Pro`, en: (remaining: number, limit: number) => `${remaining}/${limit} free messages today — Unlimited with Pro` },
  scan_product_chat: { fr: 'Scanne un produit', en: 'Scan a product' },
  scan_product_chat_desc: { fr: "Prends en photo une étiquette pour un verdict instantané", en: 'Take a photo of a label for an instant verdict' },
  previous_discussions: { fr: (count: number) => `${count} discussion${count > 1 ? 's' : ''} précédente${count > 1 ? 's' : ''}`, en: (count: number) => `${count} previous conversation${count > 1 ? 's' : ''}` },
  new_discussion: { fr: 'Nouvelle discussion', en: 'New conversation' },
  no_discussions: { fr: 'Aucune discussion', en: 'No conversations' },
  discussions_title: { fr: 'Discussions', en: 'Conversations' },
  delete_discussion_title: { fr: 'Supprimer cette discussion ?', en: 'Delete this conversation?' },
  delete_discussion_msg: { fr: 'Cette action est irréversible.', en: 'This action is irreversible.' },
  delete: { fr: 'Supprimer', en: 'Delete' },
  share: { fr: 'Partager', en: 'Share' },
  drtoxi_thinking: { fr: 'Dr. Toxi réfléchit...', en: 'Dr. Toxi is thinking...' },
  did_you_know: { fr: 'Le saviez-vous ?', en: 'Did you know?' },
  ask_question_placeholder: { fr: 'Posez votre question...', en: 'Ask your question...' },
  photo_sent: { fr: 'Photo envoyée pour analyse', en: 'Photo sent for analysis' },
  scan_product_alert_title: { fr: 'Scanne un produit', en: 'Scan a product' },
  scan_product_alert_msg: { fr: 'Assure-toi que le texte est net et bien éclairé', en: 'Make sure the text is sharp and well-lit' },
  gallery: { fr: 'Galerie', en: 'Gallery' },
  camera: { fr: 'Caméra', en: 'Camera' },
  error_camera_chat: { fr: "Impossible d'ouvrir la caméra. Essaie de choisir une photo depuis ta galerie.", en: "Unable to open the camera. Try choosing a photo from your gallery." },
  error_image_analysis: { fr: "Je n'ai pas réussi à analyser cette image. Réessaie en prenant la photo un peu plus près, avec une bonne lumière, en visant bien la liste d'ingrédients.", en: "I couldn't analyze this image. Try taking the photo a bit closer, with good lighting, aiming at the ingredient list." },
  error_image_process: { fr: "Je n'ai pas réussi à traiter cette image. Réessaie avec une autre photo.", en: "I couldn't process this image. Try again with another photo." },
  error_chat_generic: { fr: "Désolé, je n'ai pas pu répondre à l'instant. Réessaie dans quelques secondes.", en: "Sorry, I couldn't respond just now. Try again in a few seconds." },
  share_drtoxi_suffix: { fr: "Scannez vos produits avec Dr.Toxi — gratuit sur l'App Store", en: "Scan your products with Dr.Toxi — free on the App Store" },
  just_now: { fr: "À l'instant", en: 'Just now' },
  minutes_ago: { fr: (n: number) => `Il y a ${n}min`, en: (n: number) => `${n}min ago` },
  hours_ago: { fr: (n: number) => `Il y a ${n}h`, en: (n: number) => `${n}h ago` },
  days_ago: { fr: (n: number) => `Il y a ${n}j`, en: (n: number) => `${n}d ago` },
  analyze_photo_prompt: { fr: "Analyse cette photo de produit ou d'étiquette d'ingrédients.", en: 'Analyze this product photo or ingredient label.' },
  analyze_for_me: { fr: 'Analyse ce produit pour moi.', en: 'Analyze this product for me.' },

  // ===== DR. TOXI PROMPTS =====
  quick_suggestion_1: { fr: "Je suis au supermarché, aide-moi !", en: "I'm at the grocery store, help me!" },
  quick_suggestion_2: { fr: 'Quels additifs éviter ?', en: 'Which additives to avoid?' },
  quick_suggestion_3: { fr: "C'est quoi un perturbateur endocrinien ?", en: 'What is an endocrine disruptor?' },
  drtoxi_welcome: { fr: "Salut ! Pose-moi ta question ou scanne un produit.", en: "Hi! Ask me a question or scan a product." },

  // ===== VISION LOADING =====
  vision_loading_1: { fr: 'Je lis les petits caractères pour toi...', en: "I'm reading the fine print for you..." },
  vision_loading_2: { fr: 'Je vérifie chaque ingrédient...', en: "I'm checking each ingredient..." },
  vision_loading_3: { fr: 'Je compare avec ma base de données...', en: "I'm comparing with my database..." },
  vision_loading_4: { fr: 'Deux secondes, je mets mes lunettes...', en: 'Two seconds, putting on my glasses...' },
  vision_loading_5: { fr: 'Je scanne tout ça...', en: "I'm scanning all of this..." },

  // ===== LOADING TIPS =====
  loading_tip_1: { fr: "Le brocoli est l'aliment anti-cancer #1 selon les chercheurs.", en: 'Broccoli is the #1 anti-cancer food according to researchers.' },
  loading_tip_2: { fr: 'Un contenant en verre est toujours plus sûr que le plastique.', en: 'A glass container is always safer than plastic.' },
  loading_tip_3: { fr: 'Les nitrites (E250) sont classés cancérogènes avérés par le CIRC.', en: 'Nitrites (E250) are classified as proven carcinogens by the IARC.' },
  loading_tip_4: { fr: "L'huile d'olive extra vierge est anti-inflammatoire naturelle.", en: 'Extra virgin olive oil is a natural anti-inflammatory.' },
  loading_tip_5: { fr: 'Ne chauffez jamais un contenant plastique au micro-ondes.', en: 'Never heat a plastic container in the microwave.' },
  loading_tip_6: { fr: 'Les poêles en fonte ou inox sont les plus sûres pour cuisiner.', en: 'Cast iron or stainless steel pans are the safest for cooking.' },
  loading_tip_7: { fr: "Lisez toujours la liste d'ingrédients, pas juste le devant du produit.", en: "Always read the ingredient list, not just the front of the product." },
  loading_tip_8: { fr: 'Le curcuma est un puissant anti-inflammatoire naturel.', en: 'Turmeric is a powerful natural anti-inflammatory.' },
  loading_tip_9: { fr: 'Privilégiez les produits avec moins de 5 ingrédients.', en: 'Choose products with fewer than 5 ingredients.' },
  loading_tip_10: { fr: "Le MSG (E621) est caché sous de nombreux noms : extrait de levure, arôme naturel...", en: 'MSG (E621) hides under many names: yeast extract, natural flavoring...' },
  loading_tip_11: { fr: 'Les bocaux en verre ne libèrent aucune substance dans vos aliments.', en: 'Glass jars release no substances into your food.' },
  loading_tip_12: { fr: 'Le thé vert contient des antioxydants puissants.', en: 'Green tea contains powerful antioxidants.' },

  // ===== PRODUCT DETAIL =====
  product_not_found: { fr: 'Produit non trouvé', en: 'Product not found' },
  result: { fr: 'Résultat', en: 'Result' },
  material_label: { fr: 'Matériau', en: 'Material' },
  analyzed_by_photo: { fr: 'Analysé par photo', en: 'Analyzed by photo' },
  enriched_off: { fr: 'Enrichi par Open Food Facts', en: 'Enriched by Open Food Facts' },
  photo_tip: { fr: "Pour un résultat plus précis, photographiez la liste d'ingrédients au dos du produit", en: 'For a more accurate result, photograph the ingredient list on the back of the product' },
  badge_danger: { fr: 'PRODUIT CANCÉRIGÈNE', en: 'CARCINOGENIC PRODUCT' },
  badge_caution: { fr: 'ATTENTION', en: 'WARNING' },
  badge_moderation: { fr: 'AVEC MODÉRATION', en: 'IN MODERATION' },
  badge_approved: { fr: 'APPROUVÉ', en: 'APPROVED' },
  substances_detected: { fr: 'Substances détectées', en: 'Substances detected' },
  level_confirmed_carcinogen: { fr: 'CANCÉRIGÈNE CONFIRMÉ', en: 'CONFIRMED CARCINOGEN' },
  level_probable_carcinogen: { fr: 'PROBABLEMENT CANCÉRIGÈNE', en: 'PROBABLY CARCINOGENIC' },
  level_possible_carcinogen: { fr: 'POSSIBLEMENT CANCÉRIGÈNE', en: 'POSSIBLY CARCINOGENIC' },
  level_controversial: { fr: 'SUBSTANCE CONTROVERSÉE', en: 'CONTROVERSIAL SUBSTANCE' },
  level_low_risk: { fr: 'FAIBLE RISQUE', en: 'LOW RISK' },
  classification_iarc: { fr: 'Classification : CIRC/OMS', en: 'Classification: IARC/WHO' },
  not_classified_iarc: { fr: 'Non classé cancérogène par le CIRC', en: 'Not classified as carcinogenic by the IARC' },
  recommendations: { fr: 'Recommandations', en: 'Recommendations' },
  healthier_alternatives: { fr: 'Alternatives plus saines', en: 'Healthier alternatives' },
  safer_alternatives: { fr: 'Alternatives plus sûres', en: 'Safer alternatives' },
  where_find_alternatives: { fr: 'Où trouver des alternatives saines ?', en: 'Where to find healthy alternatives?' },
  bio_stores_intro: { fr: 'Privilégiez les produits biologiques certifiés sans additifs ni substances controversées.', en: 'Choose certified organic products without additives or controversial substances.' },
  specialty_stores: { fr: 'Magasins spécialisés', en: 'Specialty stores' },
  organic_sections: { fr: 'Sections bio en épicerie', en: 'Organic sections in grocery stores' },
  local_markets: { fr: 'Marchés locaux', en: 'Local markets' },
  clean_brands: { fr: 'Marques propres recommandées', en: 'Recommended clean brands' },
  organic_brands: { fr: 'Marques bio recommandées', en: 'Recommended organic brands' },
  recommended_bio_alternatives: { fr: 'Alternatives bio recommandées pour ce produit', en: 'Recommended organic alternatives for this product' },
  preparing: { fr: 'Préparation...', en: 'Preparing...' },
  share_result: { fr: 'Partager ce résultat', en: 'Share this result' },
  ask_dr_toxi: { fr: 'Demander à Dr. Toxi', en: 'Ask Dr. Toxi' },
  share_dialog_title: { fr: 'Partager le résultat Dr.Toxi', en: 'Share Dr.Toxi result' },
  share_suffix: { fr: "Scannez vos produits gratuitement avec Dr.Toxi — disponible sur l'App Store", en: "Scan your products for free with Dr.Toxi — available on the App Store" },

  // ===== RISK BADGE INFO (additives.ts) =====
  risk_danger_label: { fr: 'PRODUIT CANCÉRIGÈNE', en: 'CARCINOGENIC PRODUCT' },
  risk_danger_sub_g1: { fr: 'Cancérigène confirmé (Groupe 1 CIRC)', en: 'Confirmed carcinogen (IARC Group 1)' },
  risk_danger_sub_g2a: { fr: 'Probablement cancérigène (Groupe 2A CIRC)', en: 'Probably carcinogenic (IARC Group 2A)' },
  risk_caution_label: { fr: 'ATTENTION', en: 'WARNING' },
  risk_caution_sub: { fr: 'Substance controversée ou possiblement cancérigène', en: 'Controversial or possibly carcinogenic substance' },
  risk_moderation_label: { fr: 'AVEC MODÉRATION', en: 'IN MODERATION' },
  risk_moderation_sub: { fr: 'Substance controversée isolée ou Groupe 2B', en: 'Isolated controversial substance or Group 2B' },
  risk_approved_label: { fr: 'APPROUVÉ', en: 'APPROVED' },
  risk_approved_sub: { fr: 'Aucune substance cancérigène détectée', en: 'No carcinogenic substances detected' },

  // ===== PROFILE =====
  profile_title: { fr: 'Profil', en: 'Profile' },
  drtoxi_pro: { fr: 'Dr.Toxi Pro', en: 'Dr.Toxi Pro' },
  drtoxi_free: { fr: 'Dr.Toxi Gratuit', en: 'Dr.Toxi Free' },
  pro_active_desc: { fr: 'Actif — Dr. Toxi illimité, historique complet', en: 'Active — Unlimited Dr. Toxi, full history' },
  free_desc: { fr: 'Dr. Toxi illimité, historique illimité, favoris', en: 'Unlimited Dr. Toxi, unlimited history, favorites' },
  active: { fr: 'Actif', en: 'Active' },
  my_badges: { fr: 'Mes badges', en: 'My badges' },
  unlocked: { fr: 'débloqués', en: 'unlocked' },
  statistics: { fr: 'Statistiques', en: 'Statistics' },
  products_analyzed: { fr: (n: number) => `${n} produit${n !== 1 ? 's' : ''} analysé${n !== 1 ? 's' : ''}`, en: (n: number) => `${n} product${n !== 1 ? 's' : ''} analyzed` },
  stat_danger: { fr: 'Danger', en: 'Danger' },
  stat_probable: { fr: 'Probable', en: 'Probable' },
  stat_possible: { fr: 'Possible', en: 'Possible' },
  health_quiz: { fr: 'Quiz Santé', en: 'Health Quiz' },
  quiz_score: { fr: (correct: number, total: number, pct: number) => `${correct}/${total} bonnes réponses (${pct}%)`, en: (correct: number, total: number, pct: number) => `${correct}/${total} correct answers (${pct}%)` },
  quiz_invite: { fr: '10 questions pour tester vos connaissances', en: '10 questions to test your knowledge' },
  detects_risks_in: { fr: 'Dr.Toxi détecte les risques dans :', en: 'Dr.Toxi detects risks in:' },
  cat_food_drinks: { fr: 'Aliments et boissons', en: 'Food and drinks' },
  cat_cosmetics_care: { fr: 'Cosmétiques et soins', en: 'Cosmetics and care' },
  cat_household_products: { fr: 'Produits ménagers', en: 'Household products' },
  cat_kitchen_utensils: { fr: 'Ustensiles de cuisine', en: 'Kitchen utensils' },
  cat_clothing_textiles: { fr: 'Vêtements et textiles', en: 'Clothing and textiles' },
  cat_containers: { fr: 'Contenants et emballages', en: 'Containers and packaging' },
  info_title: { fr: 'Informations', en: 'Information' },
  privacy_policy: { fr: 'Politique de confidentialité', en: 'Privacy policy' },
  terms_of_use: { fr: "Conditions d'utilisation", en: 'Terms of use' },
  faq_label: { fr: 'FAQ', en: 'FAQ' },
  ai_transparency: { fr: 'Transparence IA', en: 'AI Transparency' },
  contact_us: { fr: 'Nous contacter', en: 'Contact us' },
  about_label: { fr: 'À propos', en: 'About' },
  rate_app: { fr: "Noter l'app", en: 'Rate the app' },
  contact_email_title: { fr: 'Nous contacter', en: 'Contact us' },
  contact_email_body: { fr: 'Envoyez-nous un courriel à :\ncontact@toxiscan.com', en: 'Send us an email at:\ncontact@toxiscan.com' },
  rate_thanks: { fr: 'Merci !', en: 'Thank you!' },
  rate_unavailable: { fr: "La notation sera disponible une fois l'app publiée sur l'App Store. Merci pour votre soutien !", en: "Rating will be available once the app is published on the App Store. Thank you for your support!" },

  // ===== ONBOARDING =====
  onboarding_title_1: { fr: "Photographiez n'importe quoi", en: 'Photograph anything' },
  onboarding_sub_1: { fr: 'Aliment, cosmétique, ustensile de cuisine, vêtement, produit ménager…', en: 'Food, cosmetics, kitchen utensils, clothing, household products...' },
  onboarding_photo_tip_1: { fr: "Photographie uniquement la liste d'ingrédients, pas le produit entier", en: 'Only photograph the ingredient list, not the whole product' },
  onboarding_photo_tip_2: { fr: 'Assure-toi que le texte est bien lisible et bien éclairé', en: 'Make sure the text is clearly readable and well lit' },
  onboarding_photo_tip_3: { fr: 'Plus la photo est nette, plus l\'analyse est précise', en: 'The sharper the photo, the more accurate the analysis' },
  onboarding_title_2: { fr: 'Comprenez le risque en 1 seconde', en: 'Understand the risk in 1 second' },
  onboarding_sub_2: { fr: "Basé sur les classifications officielles de l'OMS", en: 'Based on official WHO classifications' },
  onboarding_detected: { fr: 'Détecté', en: 'Detected' },
  onboarding_title_3: { fr: 'Protégez votre famille', en: 'Protect your family' },
  onboarding_sub_3: { fr: 'Faites les bons choix au quotidien pour ceux que vous aimez', en: 'Make the right choices every day for the ones you love' },
  start: { fr: 'Commencer', en: 'Start' },
  next: { fr: 'Suivant', en: 'Next' },
  skip: { fr: 'Passer', en: 'Skip' },

  // ===== AI CONSENT =====
  ai_consent_title: { fr: "Dr.Toxi utilise l'intelligence artificielle", en: 'Dr.Toxi uses artificial intelligence' },
  ai_consent_openai_label: { fr: 'OpenAI GPT-4o (texte et vision)', en: 'OpenAI GPT-4o (text and vision)' },
  ai_consent_openfoodfacts_label: { fr: 'Open Food Facts (données produits)', en: 'Open Food Facts (product data)' },
  ai_consent_desc: { fr: "Dr. Toxi, ton expert en ingrédients, est propulsé par une IA spécialement entraînée pour détecter les substances toxiques dans tes produits du quotidien. Il analyse les étiquettes, te conseille en temps réel et t'accompagne à chaque achat pour t'aider à faire les meilleurs choix.", en: "Dr. Toxi, your ingredient expert, is powered by an AI specially trained to detect toxic substances in your everyday products. It analyzes labels, advises you in real time, and accompanies you with every purchase to help you make the best choices." },
  tech_used: { fr: 'Technologies utilisées :', en: 'Technologies used:' },
  ai_disclaimer_1: { fr: "Les analyses sont basées sur des données publiques et des classifications d'organismes reconnus (OMS, EFSA, Santé Canada), mais ne remplacent pas un avis médical.", en: 'Analyses are based on public data and classifications from recognized organizations (WHO, EFSA, Health Canada), but do not replace medical advice.' },
  ai_disclaimer_2: { fr: "Dr.Toxi fournit des informations à titre informatif uniquement.", en: 'Dr.Toxi provides information for informational purposes only.' },
  understood: { fr: 'Compris', en: 'Understood' },
  ai_privacy_note: { fr: "Vos photos et messages sont traités de manière sécurisée. Aucune donnée personnelle n'est conservée.", en: 'Your photos and messages are processed securely. No personal data is retained.' },

  // ===== PAYWALL =====
  paywall_drtoxi: { fr: 'Discutez avec Dr. Toxi en illimité', en: 'Chat with Dr. Toxi unlimited' },
  paywall_history: { fr: 'Sauvegardez tout votre historique', en: 'Save all your history' },
  paywall_favorite: { fr: 'Sauvegardez vos produits favoris', en: 'Save your favorite products' },
  paywall_alerts: { fr: 'Alertes en temps réel', en: 'Real-time alerts' },
  paywall_default: { fr: 'Passez à Dr.Toxi Pro', en: 'Upgrade to Dr.Toxi Pro' },
  paywall_sub_drtoxi: { fr: 'Vous avez utilisé vos 3 messages gratuits du jour', en: "You've used your 3 free messages today" },
  paywall_sub_history: { fr: 'Sans abonnement, seuls les 3 derniers produits sont visibles', en: 'Without a subscription, only the last 3 products are visible' },
  paywall_sub_favorite: { fr: 'Les favoris sont une fonctionnalité exclusive Dr.Toxi Pro', en: 'Favorites are an exclusive Dr.Toxi Pro feature' },
  paywall_sub_alerts: { fr: 'Soyez alerté des nouveaux produits interdits, toxiques ou cancérigènes', en: 'Be alerted about new banned, toxic, or carcinogenic products' },
  paywall_sub_default: { fr: 'Débloquez toutes les fonctionnalités premium', en: 'Unlock all premium features' },
  benefit_unlimited_drtoxi: { fr: 'Dr. Toxi illimité', en: 'Unlimited Dr. Toxi' },
  benefit_unlimited_history: { fr: 'Historique illimité', en: 'Unlimited history' },
  benefit_favorites: { fr: 'Favoris produits', en: 'Product favorites' },
  benefit_notifications: { fr: 'Notifications rappel produits', en: 'Product reminder notifications' },
  save_45: { fr: 'Économisez 45%', en: 'Save 45%' },
  annual_plan: { fr: (price: string) => `Annuel — ${price}/an`, en: (price: string) => `Annual — ${price}/year` },
  monthly_equivalent: { fr: (price: string) => `soit ${price}/mois`, en: (price: string) => `≈ ${price}/month` },
  monthly_plan: { fr: (price: string) => `Mensuel — ${price}/mois`, en: (price: string) => `Monthly — ${price}/month` },
  upgrade_pro: { fr: 'Passer à Dr.Toxi Pro', en: 'Upgrade to Dr.Toxi Pro' },
  donation_text: { fr: "Une partie des revenus est destinée à aider les patients atteints de cancer à payer leurs traitements et médicaments.", en: 'A portion of the revenue is dedicated to helping cancer patients pay for their treatments and medications.' },
  legal_text: { fr: "Le paiement sera débité de votre compte iTunes à la confirmation de l'achat. L'abonnement se renouvelle automatiquement sauf annulation au moins 24h avant la fin de la période en cours.\nAnnulez à tout moment dans les réglages de votre appareil.", en: "Payment will be charged to your iTunes account upon confirmation of purchase. The subscription automatically renews unless canceled at least 24 hours before the end of the current period.\nCancel at any time in your device settings." },
  restore_purchases: { fr: 'Restaurer les achats', en: 'Restore purchases' },
  purchase_ready: { fr: 'Tout est prêt', en: 'All set' },
  purchase_success: { fr: 'Votre achat a été effectué avec succès.', en: 'Your purchase was completed successfully.' },
  purchase_error: { fr: 'Erreur', en: 'Error' },
  purchase_load_error: { fr: 'Impossible de charger les offres. Veuillez réessayer.', en: 'Unable to load offers. Please try again.' },
  loading_offers: { fr: 'Chargement des offres...', en: 'Loading offers...' },
  purchase_failed: { fr: "L'achat n'a pas pu être complété. Si vous avez été débité, appuyez sur 'Restaurer les achats'.", en: "The purchase could not be completed. If you were charged, tap 'Restore purchases'." },
  subscription_restored: { fr: 'Abonnement restauré !', en: 'Subscription restored!' },
  subscription_restored_desc: { fr: 'Vos fonctionnalités premium sont de nouveau actives.', en: 'Your premium features are active again.' },
  great: { fr: 'Super !', en: 'Great!' },
  no_subscription: { fr: 'Aucun abonnement trouvé.', en: 'No subscription found.' },
  no_subscription_desc: { fr: "Aucun abonnement actif n'a été trouvé pour ce compte.", en: 'No active subscription was found for this account.' },
  restore_error: { fr: 'Impossible de restaurer les achats. Veuillez réessayer.', en: 'Unable to restore purchases. Please try again.' },

  // ===== BADGES =====
  badges_unlocked: { fr: 'badges débloqués', en: 'badges unlocked' },
  shares_count: { fr: (n: number) => `${n} partage${n !== 1 ? 's' : ''}`, en: (n: number) => `${n} share${n !== 1 ? 's' : ''}` },
  scan_badges: { fr: 'Badges de scan', en: 'Scan badges' },
  green_products: { fr: 'Produits verts', en: 'Green products' },
  sharing: { fr: 'Partage', en: 'Sharing' },
  badge_unlocked: { fr: 'Badge débloqué !', en: 'Badge unlocked!' },
  reward_unlocked: { fr: 'Récompense débloquée !', en: 'Reward unlocked!' },
  thanks: { fr: 'Merci !', en: 'Thanks!' },
  share_badge_msg: { fr: (name: string, desc: string) => `J'ai débloqué le badge "${name}" sur Dr.Toxi ! ${desc}\n\nScannez vos produits gratuitement avec Dr.Toxi — disponible sur l'App Store`, en: (name: string, desc: string) => `I unlocked the "${name}" badge on Dr.Toxi! ${desc}\n\nScan your products for free with Dr.Toxi — available on the App Store` },
  share_reward_25: { fr: 'Bravo ! Tu as partagé 25 fois. Merci de faire connaître Dr.Toxi !', en: 'Congrats! You shared 25 times. Thanks for spreading the word about Dr.Toxi!' },
  share_reward_100: { fr: 'Incroyable ! 100 partages ! Tu es un vrai ambassadeur Dr.Toxi. Merci pour ton soutien !', en: 'Incredible! 100 shares! You are a true Dr.Toxi ambassador. Thanks for your support!' },

  // ===== QUIZ =====
  quiz_perfect: { fr: 'Parfait ! Vous êtes un expert en santé !', en: 'Perfect! You are a health expert!' },
  quiz_excellent: { fr: 'Excellent ! Vous en savez beaucoup !', en: 'Excellent! You know a lot!' },
  quiz_good: { fr: 'Bien joué ! Continuez à apprendre.', en: 'Well done! Keep learning.' },
  quiz_ok: { fr: 'Pas mal ! Il y a encore à découvrir.', en: 'Not bad! There is still more to discover.' },
  quiz_improve: { fr: 'Continuez à vous informer avec Dr.Toxi !', en: 'Keep learning with Dr.Toxi!' },
  replay: { fr: 'Rejouer', en: 'Replay' },
  see_result: { fr: 'Voir le résultat', en: 'See the result' },
  next_question: { fr: 'Question suivante', en: 'Next question' },
  correct_answer: { fr: 'Bonne réponse', en: 'Correct answer' },
  wrong_answer: { fr: 'Mauvaise réponse', en: 'Wrong answer' },

  // ===== DR TOXI VERDICT =====
  verdict_danger_title: { fr: 'Dr. Toxi déconseille ce produit', en: 'Dr. Toxi does not recommend this product' },
  verdict_danger_msg: { fr: "Ce produit contient au moins un ingrédient classé cancérigène (Groupe 1 CIRC). Je te le déconseille — tu trouveras des alternatives plus saines, naturelles et bio du même type de produit tout en bas de la page.", en: "This product contains at least one ingredient classified as carcinogenic (IARC Group 1). I advise against it — you'll find healthier, natural and organic alternatives of the same type of product at the very bottom of the page." },
  verdict_caution_title: { fr: 'Dr. Toxi ne te recommande pas ce produit', en: 'Dr. Toxi advises caution with this product' },
  verdict_caution_msg: { fr: "Ce produit contient plusieurs substances controversées ou ultra-transformées. À éviter si possible — des alternatives plus saines, naturelles et bio du même type de produit sont proposées tout en bas de la page.", en: "This product contains several controversial or ultra-processed substances. Avoid if possible — healthier, natural and organic alternatives of the same type of product are listed at the very bottom of the page." },
  verdict_moderation_title: { fr: 'Dr. Toxi conseille la modération', en: 'Dr. Toxi recommends moderation' },
  verdict_moderation_msg: { fr: "Ce produit contient une substance controversée isolée ou classée Groupe 2B. Consomme avec modération — ce n'est pas dangereux ponctuellement, mais privilégie mieux au quotidien. Tu trouveras des alternatives plus saines, naturelles et bio du même type de produit tout en bas de la page.", en: "This product contains an isolated controversial substance or a Group 2B classification. Consume in moderation — not dangerous occasionally, but choose better for daily use. You'll find healthier, natural and organic alternatives of the same type of product at the very bottom of the page." },
  verdict_approved_title: { fr: 'Dr. Toxi approuve ce produit', en: 'Dr. Toxi approves this product' },
  verdict_approved_msg: { fr: "Bonne nouvelle ! Ce produit ne contient aucun ingrédient cancérigène ni controversé. C'est un excellent choix pour toi et ta famille !", en: "Great news! This product contains no carcinogenic or controversial ingredients. It's an excellent choice for you and your family!" },

  // ===== SHARE IMAGE CARD =====
  share_approved_label: { fr: 'APPROUVE', en: 'APPROVED' },
  share_approved_sub: { fr: 'Aucune substance cancérigène', en: 'No carcinogenic substances' },
  share_approved_explanation: { fr: 'Dr.Toxi confirme : ce produit ne contient aucune substance cancérigène connue. Vous pouvez le consommer en toute tranquillité.', en: 'Dr.Toxi confirms: this product contains no known carcinogenic substances. You can consume it safely.' },
  share_caution_label: { fr: 'PRUDENCE', en: 'WARNING' },
  share_caution_sub: { fr: 'Substance controversée détectée', en: 'Controversial substance detected' },
  share_caution_explanation: { fr: 'Dr.Toxi alerte : ce produit contient des substances controversées dont les effets sur la santé font débat. Consommation à limiter.', en: 'Dr.Toxi warns: this product contains controversial substances whose health effects are debated. Limit consumption.' },
  share_danger_label: { fr: 'DANGER', en: 'DANGER' },
  share_danger_sub: { fr: 'Cancérigène classé par le CIRC', en: 'Carcinogen classified by the IARC' },
  share_danger_explanation: { fr: 'Dr.Toxi déconseille ce produit : il contient des substances classées cancérigènes par le CIRC. Évitez sa consommation régulière.', en: 'Dr.Toxi advises against this product: it contains substances classified as carcinogenic by the IARC. Avoid regular consumption.' },
  no_dangerous_substance: { fr: 'Aucune substance dangereuse détectée', en: 'No dangerous substances detected' },
  available_app_store: { fr: "Disponible sur l'App Store", en: 'Available on the App Store' },

  // ===== DAILY FACT =====
  daily_fact_title: { fr: 'Le saviez-vous ?', en: 'Did you know?' },

  // ===== RISK SCORE BAR =====
  risk_score_title: { fr: 'Score de risque Dr.Toxi', en: 'Dr.Toxi risk score' },
  risk_low: { fr: 'Risque faible — Bon choix', en: 'Low risk — Good choice' },
  risk_limited: { fr: 'Risque limité — Acceptable', en: 'Limited risk — Acceptable' },
  risk_moderate: { fr: 'Risque modéré — À limiter', en: 'Moderate risk — To be limited' },
  risk_high: { fr: 'Risque élevé — À éviter si possible', en: 'High risk — Avoid if possible' },
  risk_very_high: { fr: 'Risque très élevé — Déconseillé', en: 'Very high risk — Not recommended' },

  // ===== CATEGORY LABELS (api.ts) =====
  cat_label_food: { fr: 'Aliment', en: 'Food' },
  cat_label_beverage: { fr: 'Boisson', en: 'Beverage' },
  cat_label_kitchen: { fr: 'Ustensile de cuisine', en: 'Kitchen utensil' },
  cat_label_clothing: { fr: 'Vêtement / Textile', en: 'Clothing / Textile' },
  cat_label_cosmetic: { fr: 'Cosmétique / Hygiène', en: 'Cosmetic / Hygiene' },
  cat_label_household: { fr: 'Produit ménager', en: 'Household product' },
  cat_label_electronics: { fr: 'Électronique', en: 'Electronics' },
  cat_label_furniture: { fr: 'Meuble', en: 'Furniture' },
  cat_label_toy: { fr: 'Jouet', en: 'Toy' },
  cat_label_other: { fr: 'Autre', en: 'Other' },

  // ===== CONVERSATION =====
  conv_new: { fr: 'Nouvelle discussion', en: 'New conversation' },
  conv_previous: { fr: 'Discussion précédente', en: 'Previous conversation' },
  conv_scanned: { fr: (name: string, brand: string, verdict: string) => `Tu as scanné ${name}${brand ? ` de ${brand}` : ''}. Ce produit est classé "${verdict}".\n\nQu'est-ce que tu veux savoir sur ce produit ?`, en: (name: string, brand: string, verdict: string) => `You scanned ${name}${brand ? ` by ${brand}` : ''}. This product is classified as "${verdict}".\n\nWhat would you like to know about this product?` },
  verdict_label_danger: { fr: 'cancérigène', en: 'carcinogenic' },
  verdict_label_caution: { fr: 'à éviter', en: 'to avoid' },
  verdict_label_moderation: { fr: 'à consommer avec modération', en: 'to consume in moderation' },
  verdict_label_approved: { fr: 'approuvé', en: 'approved' },

  // ===== PRODUCT CONTEXT PROMPT =====
  product_context_prompt: { fr: (name: string, brand: string, barcode: string, verdict: string, summary: string) => `\n\n--- CONTEXTE PRODUIT ---\nL'utilisateur a scanné le produit "${name}" (marque: ${brand || 'inconnue'}, code-barres: ${barcode}). Le verdict est: ${verdict}.${summary ? ` Résumé: ${summary}` : ''}\nRéponds en tenant compte de ce produit spécifique.\n`, en: (name: string, brand: string, barcode: string, verdict: string, summary: string) => `\n\n--- PRODUCT CONTEXT ---\nThe user scanned the product "${name}" (brand: ${brand || 'unknown'}, barcode: ${barcode}). The verdict is: ${verdict}.${summary ? ` Summary: ${summary}` : ''}\nRespond considering this specific product.\n` },

  // ===== VOICE CHAT =====
  speak_now: { fr: 'Parlez maintenant…', en: 'Speak now…' },
  release_to_send: { fr: 'Relâchez pour envoyer', en: 'Release to send' },
  transcribing: { fr: 'Transcription en cours…', en: 'Transcribing…' },
  listen: { fr: 'Écouter', en: 'Listen' },
  listening: { fr: 'Lecture…', en: 'Playing…' },
  mic_error_title: { fr: 'Message vocal', en: 'Voice message' },
  mic_permission_msg: { fr: "Active l'accès au micro dans les réglages pour utiliser les messages vocaux.", en: 'Enable microphone access in settings to use voice messages.' },
  mic_start_error: { fr: "Impossible de démarrer l'enregistrement. Réessaie.", en: 'Unable to start recording. Try again.' },
  mic_empty_transcription: { fr: "Je n'ai rien entendu. Maintiens le bouton plus longtemps et parle clairement.", en: "I didn't hear anything. Hold the button longer and speak clearly." },
  mic_transcription_error: { fr: "Impossible de transcrire l'audio. Vérifie ta connexion et réessaie.", en: 'Unable to transcribe the audio. Check your connection and try again.' },
  tts_error: { fr: "Impossible de lire la réponse à voix haute pour le moment.", en: 'Unable to read the response aloud right now.' },

  // ===== DR TOXI SYSTEM PROMPT ACKNOWLEDGMENT =====
  drtoxi_ack: { fr: "Compris ! Je suis Dr. Toxi, ton expert en ingrédients du quotidien. Je suis prêt à t'aider.", en: "Got it! I'm Dr. Toxi, your everyday ingredient expert. I'm ready to help you." },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey): string {
  const lang = getDeviceLanguage();
  const entry = translations[key];
  if (!entry) {
    console.warn('[i18n] Missing key:', key);
    return key;
  }
  const val = entry[lang];
  if (typeof val === 'function') {
    return key;
  }
  return val as string;
}

export function tf<A extends unknown[]>(key: TranslationKey, ...args: A): string {
  const lang = getDeviceLanguage();
  const entry = translations[key];
  if (!entry) {
    console.warn('[i18n] Missing key:', key);
    return key;
  }
  const val = entry[lang];
  if (typeof val === 'function') {
    return (val as (...a: A) => string)(...args);
  }
  return val as string;
}

export function isEnglish(): boolean {
  return getDeviceLanguage() === 'en';
}

export function getDateLocale(): string {
  return getDeviceLanguage() === 'en' ? 'en-US' : 'fr-FR';
}
