import * as Localization from 'expo-localization';

type Lang = 'fr' | 'en' | 'ko';

let cachedLang: Lang | null = null;

export function getDeviceLanguage(): Lang {
  if (cachedLang) return cachedLang;
  try {
    const locales = Localization.getLocales();
    const langCode = (locales?.[0]?.languageCode ?? '').toLowerCase();
    console.log('[i18n] Device language code:', langCode);
    if (langCode === 'ko') {
      cachedLang = 'ko';
    } else if (langCode === 'en') {
      cachedLang = 'en';
    } else {
      cachedLang = 'fr';
    }
  } catch (e) {
    console.log('[i18n] Error detecting language:', e);
    cachedLang = 'fr';
  }
  return cachedLang;
}

const translations = {
  // ===== TABS =====
  tab_scanner: { fr: 'Scanner', en: 'Scanner', ko: '스캔' },
  tab_history: { fr: 'Historique', en: 'History', ko: '기록' },
  tab_drtoxi: { fr: 'Dr. Toxi', en: 'Dr. Toxi', ko: 'Dr. Toxi' },
  tab_profile: { fr: 'Profil', en: 'Profile', ko: '프로필' },

  // ===== ROOT LAYOUT =====
  error_occurred: { fr: 'Une erreur est survenue', en: 'An error occurred', ko: '오류가 발생했습니다' },
  unknown_error: { fr: 'Erreur inconnue', en: 'Unknown error', ko: '알 수 없는 오류' },
  retry: { fr: 'Réessayer', en: 'Retry', ko: '다시 시도' },
  back: { fr: 'Retour', en: 'Back', ko: '뒤로' },
  nav_about: { fr: 'À propos', en: 'About', ko: '소개' },
  nav_faq: { fr: 'FAQ', en: 'FAQ', ko: '자주 묻는 질문' },
  nav_privacy: { fr: 'Confidentialité', en: 'Privacy', ko: '개인정보' },
  nav_terms: { fr: 'Conditions', en: 'Terms', ko: '약관' },
  nav_transparency: { fr: 'Transparence IA', en: 'AI Transparency', ko: 'AI 투명성' },

  // ===== SCANNER =====
  protect_health: { fr: 'Protégez votre santé au quotidien', en: 'Protect your health every day', ko: '매일 건강을 지키세요' },
  home_premium_label: { fr: 'Scanner intelligent', en: 'Smart scanner', ko: '스마트 스캐너' },
  home_authority_label: { fr: 'CIRC/OMS', en: 'IARC/WHO', ko: 'IARC/WHO' },
  home_database_label: { fr: 'Base clean', en: 'Clean database', ko: '클린 데이터베이스' },
  home_instant_label: { fr: 'Instantané', en: 'Instant', ko: '즉시' },
  photo_product: { fr: "Photographier l'étiquette", en: 'Photograph the label', ko: '라벨 촬영하기' },
  scan_barcode: { fr: 'Scanner un code-barres', en: 'Scan a barcode', ko: '바코드 스캔' },
  scan_barcode_hint: { fr: 'Pointez la caméra vers le code-barres du produit', en: 'Point the camera at the product barcode', ko: '카메라를 제품 바코드에 맞추세요' },
  barcode_not_found_title: { fr: 'Produit introuvable', en: 'Product not found', ko: '제품을 찾을 수 없음' },
  barcode_not_found_msg: { fr: "Ce code-barres n'est pas dans la base. Photographie la liste d'ingrédients à la place.", en: 'This barcode is not in the database. Photograph the ingredient list instead.', ko: '이 바코드는 데이터베이스에 없습니다. 대신 성분표를 촬영해 주세요.' },
  barcode_scanning: { fr: 'Recherche du produit...', en: 'Looking up product...', ko: '제품 검색 중...' },
  scan_hint: { fr: "Photographiez la liste d'ingrédients pour un résultat précis", en: 'Photograph the ingredient list for accurate results', ko: '정확한 결과를 위해 성분표를 촬영하세요' },
  cat_food: { fr: 'Aliments', en: 'Food', ko: '식품' },
  cat_cosmetics: { fr: 'Cosmétiques', en: 'Cosmetics', ko: '화장품' },
  cat_household: { fr: 'Ménagers', en: 'Household', ko: '생활용품' },
  cat_clothing: { fr: 'Vêtements', en: 'Clothing', ko: '의류' },
  cat_utensils: { fr: 'Ustensiles', en: 'Utensils', ko: '주방용품' },
  analysis_in_progress: { fr: 'Analyse en cours', en: 'Analysis in progress', ko: '분석 중' },
  drtoxi_examining: { fr: 'Dr. Toxi examine votre produit...', en: 'Dr. Toxi is examining your product...', ko: 'Dr. Toxi가 제품을 검사하고 있습니다...' },
  analysis_ai_badge: { fr: 'Analyse IA premium', en: 'Premium AI analysis', ko: '프리미엄 AI 분석' },
  analysis_step_photo: { fr: 'Photo', en: 'Photo', ko: '사진' },
  analysis_step_database: { fr: 'Base', en: 'Database', ko: '데이터베이스' },
  analysis_step_verdict: { fr: 'Verdict', en: 'Verdict', ko: '판정' },
  analysis_progress_label: { fr: 'Inspection du produit', en: 'Product inspection', ko: '제품 검사' },
  analysis_fact_subtitle: { fr: "Pendant l'analyse", en: 'While analyzing', ko: '분석하는 동안' },
  analysis_tip_cta: { fr: 'En savoir plus', en: 'Learn more', ko: '더 알아보기' },
  analysis_reading_label: { fr: "Lecture de l'étiquette…", en: 'Reading the label…', ko: '라벨을 읽는 중…' },
  analysis_checking_ingredients: { fr: 'Analyse des ingrédients…', en: 'Checking ingredients…', ko: '성분을 확인하는 중…' },
  analysis_looking_closer: { fr: 'Inspection approfondie…', en: 'Looking closer…', ko: '자세히 살펴보는 중…' },
  error_process_photo: { fr: 'Impossible de traiter la photo. Veuillez réessayer.', en: 'Unable to process the photo. Please try again.', ko: '사진을 처리할 수 없습니다. 다시 시도해 주세요.' },
  error_invalid_photo: { fr: 'La photo est invalide. Veuillez reprendre la photo.', en: 'The photo is invalid. Please retake it.', ko: '사진이 올바르지 않습니다. 다시 촬영해 주세요.' },
  error_analysis_failed: { fr: "L'analyse a échoué. Vérifiez votre connexion et réessayez.", en: 'Analysis failed. Check your connection and try again.', ko: '분석에 실패했습니다. 연결을 확인하고 다시 시도해 주세요.' },
  error_analyze_product: { fr: "Impossible d'analyser ce produit. Veuillez reprendre la photo avec un meilleur éclairage.", en: 'Unable to analyze this product. Please retake the photo with better lighting.', ko: '이 제품을 분석할 수 없습니다. 조명을 밝게 하여 다시 촬영해 주세요.' },
  error_analyze_photo: { fr: "Impossible d'analyser la photo. Veuillez reprendre la photo et réessayer.", en: 'Unable to analyze the photo. Please retake it and try again.', ko: '사진을 분석할 수 없습니다. 다시 촬영하여 시도해 주세요.' },
  error_analysis_title: { fr: "Erreur d'analyse", en: 'Analysis error', ko: '분석 오류' },
  error_generic: { fr: 'Erreur', en: 'Error', ko: '오류' },
  error_open_camera: { fr: "Impossible d'ouvrir la caméra.", en: 'Unable to open the camera.', ko: '카메라를 열 수 없습니다.' },
  camera_disabled_title: { fr: 'Accès à la caméra désactivé', en: 'Camera access disabled', ko: '카메라 접근이 비활성화됨' },
  camera_disabled_msg: { fr: 'Pour photographier vos produits, activez la caméra dans les réglages de votre appareil.', en: 'To photograph your products, enable the camera in your device settings.', ko: '제품을 촬영하려면 기기 설정에서 카메라를 활성화하세요.' },
  open_settings: { fr: 'Ouvrir les réglages', en: 'Open settings', ko: '설정 열기' },
  ok: { fr: 'OK', en: 'OK', ko: '확인' },

  // ===== HISTORY =====
  history_title: { fr: 'Historique', en: 'History', ko: '기록' },
  history_health_log: { fr: 'Carnet santé', en: 'Health log', ko: '건강 일지' },
  history_insight_title: { fr: 'Vos choix passés au scanner', en: 'Your choices under review', ko: '당신의 선택을 점검합니다' },
  history_insight_subtitle: { fr: 'Retrouvez vos analyses, repérez les produits à éviter et gardez vos meilleures alternatives sous la main.', en: 'Review your scans, spot products to avoid, and keep safer alternatives close.', ko: '스캔 기록을 확인하고, 피해야 할 제품을 찾고, 더 안전한 대안을 가까이 두세요.' },
  history_clean_found: { fr: 'clean', en: 'clean', ko: '클린' },
  history_watchlist: { fr: 'à surveiller', en: 'watchlist', ko: '주의 목록' },
  history_favorites_short: { fr: 'favoris', en: 'favorites', ko: '즐겨찾기' },
  history_last_scan: { fr: 'Dernier scan', en: 'Last scan', ko: '최근 스캔' },
  history_no_scan_yet: { fr: 'Aucun scan pour le moment', en: 'No scan yet', ko: '아직 스캔 없음' },
  history_analysis_cta: { fr: 'Voir analyse', en: 'View analysis', ko: '분석 보기' },
  history_risk_signal: { fr: 'Signal risque', en: 'Risk signal', ko: '위험 신호' },
  filter_all: { fr: 'Tous', en: 'All', ko: '전체' },
  filter_favorites: { fr: 'Favoris', en: 'Favorites', ko: '즐겨찾기' },
  filter_danger: { fr: 'Cancérigène', en: 'Carcinogenic', ko: '발암성' },
  filter_warning: { fr: 'Ultra-transformé', en: 'Ultra-processed', ko: '초가공' },
  filter_caution: { fr: 'Modération', en: 'Moderation', ko: '주의' },
  filter_moderation: { fr: 'Modération', en: 'Moderation', ko: '주의' },
  filter_approved: { fr: 'Approuvé', en: 'Approved', ko: '승인됨' },
  clear_history_title: { fr: "Effacer l'historique", en: 'Clear history', ko: '기록 삭제' },
  clear_history_msg: { fr: "Voulez-vous vraiment supprimer tout l'historique de vos scans ?", en: 'Do you really want to delete all your scan history?', ko: '모든 스캔 기록을 정말 삭제하시겠습니까?' },
  cancel: { fr: 'Annuler', en: 'Cancel', ko: '취소' },
  clear: { fr: 'Effacer', en: 'Clear', ko: '삭제' },
  history_limit_banner: { fr: '3 derniers produits visibles — Illimité avec Pro', en: 'Last 3 products visible — Unlimited with Pro', ko: '최근 3개 제품만 표시 — Pro로 무제한' },
  no_favorites: { fr: 'Aucun favori', en: 'No favorites', ko: '즐겨찾기 없음' },
  no_products: { fr: 'Aucun produit analysé', en: 'No products analyzed', ko: '분석된 제품 없음' },
  add_favorites_hint: { fr: 'Ajoutez des produits en favoris depuis la fiche résultat', en: 'Add products to favorites from the result page', ko: '결과 화면에서 제품을 즐겨찾기에 추가하세요' },
  photo_product_hint: { fr: 'Photographiez un produit pour le voir ici', en: 'Photograph a product to see it here', ko: '제품을 촬영하면 여기에 표시됩니다' },
  full_history: { fr: 'Historique complet', en: 'Full history', ko: '전체 기록' },
  full_history_desc: { fr: 'Retrouvez tous vos produits scannés avec Dr.Toxi Pro', en: 'Find all your scanned products with Dr.Toxi Pro', ko: 'Dr.Toxi Pro로 스캔한 모든 제품을 확인하세요' },
  see_offers: { fr: 'Voir les offres', en: 'See offers', ko: '요금제 보기' },
  history_saved_subtitle: { fr: 'Tous vos scans sauvegardés', en: 'All your saved scans', ko: '저장된 모든 스캔' },
  history_scan_count: { fr: 'scans', en: 'scans', ko: '스캔' },
  history_saved_label: { fr: 'Sauvegardé', en: 'Saved', ko: '저장됨' },
  history_photo_scan: { fr: 'Photo', en: 'Photo', ko: '사진' },
  history_barcode_scan: { fr: 'Code-barres', en: 'Barcode', ko: '바코드' },
  history_unknown_brand: { fr: 'Marque inconnue', en: 'Unknown brand', ko: '알 수 없는 브랜드' },
  history_status_carcinogenic: { fr: 'Cancérigène', en: 'Carcinogenic', ko: '발암성' },
  history_status_carcinogenic_desc: { fr: 'Risque élevé — substance cancérigène détectée', en: 'High risk — carcinogenic substance detected', ko: '높은 위험 — 발암물질 검출' },
  history_status_ultra_processed: { fr: 'Ultra-transformé', en: 'Ultra-processed', ko: '초가공' },
  history_status_ultra_processed_desc: { fr: 'À limiter — marqueurs industriels détectés', en: 'Limit intake — industrial markers detected', ko: '섭취 제한 — 산업적 지표 검출' },
  history_status_caution: { fr: 'Modération', en: 'Moderation', ko: '주의' },
  history_status_caution_desc: { fr: 'À consommer avec modération', en: 'Consume in moderation', ko: '적당히 섭취하세요' },
  history_status_approved: { fr: 'Approuvé', en: 'Approved', ko: '승인됨' },
  history_status_approved_desc: { fr: 'Aucun signal préoccupant détecté', en: 'No concerning signal detected', ko: '우려되는 신호가 검출되지 않음' },

  // ===== DR. TOXI CHAT =====
  your_ingredient_expert: { fr: 'Ton expert en ingrédients', en: 'Your ingredient expert', ko: '당신의 성분 전문가' },
  disclaimer: { fr: 'Informatif uniquement — ne remplace pas un avis médical.', en: 'For information only — does not replace medical advice.', ko: '정보 제공용입니다 — 의학적 조언을 대체하지 않습니다.' },
  free_messages_counter: { fr: (remaining: number, limit: number) => `${remaining}/${limit} messages Dr. Toxi gratuits — Illimité avec Pro`, en: (remaining: number, limit: number) => `${remaining}/${limit} free Dr. Toxi messages — Unlimited with Pro`, ko: (remaining: number, limit: number) => `무료 Dr. Toxi 메시지 ${remaining}/${limit} — Pro로 무제한` },
  free_scans_counter: { fr: (remaining: number, limit: number) => `${remaining}/${limit} scans gratuits aujourd'hui — Illimité avec Pro`, en: (remaining: number, limit: number) => `${remaining}/${limit} free scans today — Unlimited with Pro`, ko: (remaining: number, limit: number) => `오늘 무료 스캔 ${remaining}/${limit} — Pro로 무제한` },
  scan_limit_reached_title: { fr: 'Limite quotidienne atteinte', en: 'Daily limit reached', ko: '오늘 한도에 도달했습니다' },
  scan_limit_reached_msg: { fr: 'Vous avez utilisé vos 3 scans gratuits du jour. Passez à Pro pour scanner sans limite.', en: "You've used your 3 free scans today. Go Pro to scan without limits.", ko: '오늘 무료 스캔 3회를 모두 사용했습니다. Pro로 업그레이드하면 무제한으로 스캔할 수 있습니다.' },
  scan_product_chat: { fr: 'Scanne un produit', en: 'Scan a product', ko: '제품 스캔하기' },
  scan_product_chat_desc: { fr: "Prends en photo une étiquette pour un verdict instantané", en: 'Take a photo of a label for an instant verdict', ko: '라벨을 촬영하면 즉시 판정해 드립니다' },
  previous_discussions: { fr: (count: number) => `${count} discussion${count > 1 ? 's' : ''} précédente${count > 1 ? 's' : ''}`, en: (count: number) => `${count} previous conversation${count > 1 ? 's' : ''}`, ko: (count: number) => `이전 대화 ${count}개` },
  new_discussion: { fr: 'Nouvelle discussion', en: 'New conversation', ko: '새 대화' },
  no_discussions: { fr: 'Aucune discussion', en: 'No conversations', ko: '대화 없음' },
  discussions_title: { fr: 'Discussions', en: 'Conversations', ko: '대화' },
  delete_discussion_title: { fr: 'Supprimer cette discussion ?', en: 'Delete this conversation?', ko: '이 대화를 삭제하시겠습니까?' },
  delete_discussion_msg: { fr: 'Cette action est irréversible.', en: 'This action is irreversible.', ko: '이 작업은 되돌릴 수 없습니다.' },
  delete: { fr: 'Supprimer', en: 'Delete', ko: '삭제' },
  share: { fr: 'Partager', en: 'Share', ko: '공유' },
  drtoxi_thinking: { fr: 'Dr. Toxi réfléchit...', en: 'Dr. Toxi is thinking...', ko: 'Dr. Toxi가 생각하고 있습니다...' },
  did_you_know: { fr: 'Le saviez-vous ?', en: 'Did you know?', ko: '알고 계셨나요?' },
  ask_question_placeholder: { fr: 'Posez votre question...', en: 'Ask your question...', ko: '질문을 입력하세요...' },
  photo_sent: { fr: 'Photo envoyée pour analyse', en: 'Photo sent for analysis', ko: '분석을 위해 사진을 보냈습니다' },
  scan_product_alert_title: { fr: 'Scanne un produit', en: 'Scan a product', ko: '제품 스캔하기' },
  scan_product_alert_msg: { fr: 'Assure-toi que le texte est net et bien éclairé', en: 'Make sure the text is sharp and well-lit', ko: '글자가 선명하고 조명이 밝은지 확인하세요' },
  gallery: { fr: 'Galerie', en: 'Gallery', ko: '갤러리' },
  camera: { fr: 'Caméra', en: 'Camera', ko: '카메라' },
  error_camera_chat: { fr: "Impossible d'ouvrir la caméra. Essaie de choisir une photo depuis ta galerie.", en: "Unable to open the camera. Try choosing a photo from your gallery.", ko: '카메라를 열 수 없습니다. 갤러리에서 사진을 선택해 보세요.' },
  error_image_analysis: { fr: "Je n'ai pas réussi à analyser cette image. Réessaie en prenant la photo un peu plus près, avec une bonne lumière, en visant bien la liste d'ingrédients.", en: "I couldn't analyze this image. Try taking the photo a bit closer, with good lighting, aiming at the ingredient list.", ko: '이 이미지를 분석하지 못했습니다. 성분표를 향해 조금 더 가까이, 밝은 조명에서 다시 촬영해 보세요.' },
  error_image_process: { fr: "Je n'ai pas réussi à traiter cette image. Réessaie avec une autre photo.", en: "I couldn't process this image. Try again with another photo.", ko: '이 이미지를 처리하지 못했습니다. 다른 사진으로 다시 시도해 보세요.' },
  error_chat_generic: { fr: "Désolé, je n'ai pas pu répondre à l'instant. Réessaie dans quelques secondes.", en: "Sorry, I couldn't respond just now. Try again in a few seconds.", ko: '죄송합니다. 지금은 응답할 수 없습니다. 잠시 후 다시 시도해 주세요.' },
  share_drtoxi_suffix: { fr: "Scannez vos produits avec Dr.Toxi — gratuit sur l'App Store", en: "Scan your products with Dr.Toxi — free on the App Store", ko: 'Dr.Toxi로 제품을 스캔하세요 — App Store에서 무료' },
  just_now: { fr: "À l'instant", en: 'Just now', ko: '방금' },
  minutes_ago: { fr: (n: number) => `Il y a ${n}min`, en: (n: number) => `${n}min ago`, ko: (n: number) => `${n}분 전` },
  hours_ago: { fr: (n: number) => `Il y a ${n}h`, en: (n: number) => `${n}h ago`, ko: (n: number) => `${n}시간 전` },
  days_ago: { fr: (n: number) => `Il y a ${n}j`, en: (n: number) => `${n}d ago`, ko: (n: number) => `${n}일 전` },
  analyze_photo_prompt: { fr: "Analyse cette photo de produit ou d'étiquette d'ingrédients.", en: 'Analyze this product photo or ingredient label.', ko: '이 제품 또는 성분표 사진을 분석해 주세요.' },
  analyze_for_me: { fr: 'Analyse ce produit pour moi.', en: 'Analyze this product for me.', ko: '이 제품을 분석해 주세요.' },

  // ===== DR. TOXI PROMPTS =====
  quick_suggestion_1: { fr: "Aide-moi à faire mes courses", en: 'Help me with my groceries', ko: '장보기를 도와줘' },
  quick_suggestion_2: { fr: "Le pire additif caché ?", en: 'The worst hidden additive?', ko: '가장 나쁜 숨은 첨가물은?' },
  quick_suggestion_3: { fr: "Quel édulcorant choisir ?", en: 'Which sweetener should I pick?', ko: '어떤 감미료를 골라야 할까?' },
  quick_suggestion_4: { fr: "Les nitrites, vraiment dangereux ?", en: 'Nitrites — really that bad?', ko: '아질산염, 정말 위험할까?' },
  drtoxi_try_asking: { fr: 'Essaie de me demander…', en: 'Try asking me…', ko: '이렇게 물어보세요…' },
  drtoxi_welcome: { fr: "Salut ! Pose-moi ta question ou scanne un produit.", en: "Hi! Ask me a question or scan a product.", ko: '안녕하세요! 질문을 하거나 제품을 스캔해 보세요.' },

  // ===== DR. TOXI FOLLOW-UP CHIPS =====
  followup_alternative: { fr: 'Une alternative plus saine ?', en: 'A cleaner alternative?', ko: '더 건강한 대안은?' },
  followup_why_verdict: { fr: 'Pourquoi ce verdict ?', en: 'Why this verdict?', ko: '왜 이런 판정인가요?' },
  followup_worst_ingredient: { fr: "C'est quoi le pire ingrédient ?", en: "What's the worst ingredient?", ko: '가장 나쁜 성분은 무엇인가요?' },
  followup_simpler: { fr: 'Explique plus simplement', en: 'Explain it more simply', ko: '더 쉽게 설명해 줘' },
  followup_is_it_safe: { fr: "C'est risqué pour la santé ?", en: 'Is it risky for my health?', ko: '건강에 위험한가요?' },
  followup_good_news: { fr: "Pourquoi c'est un bon choix ?", en: 'Why is it a good pick?', ko: '왜 좋은 선택인가요?' },

  // ===== VISION LOADING =====
  vision_loading_1: { fr: 'Je lis les petits caractères pour toi...', en: "I'm reading the fine print for you...", ko: '작은 글씨를 읽고 있어요...' },
  vision_loading_2: { fr: 'Je vérifie chaque ingrédient...', en: "I'm checking each ingredient...", ko: '성분을 하나씩 확인하고 있어요...' },
  vision_loading_3: { fr: 'Je compare avec ma base de données...', en: "I'm comparing with my database...", ko: '데이터베이스와 비교하고 있어요...' },
  vision_loading_4: { fr: 'Deux secondes, je mets mes lunettes...', en: 'Two seconds, putting on my glasses...', ko: '잠깐만요, 안경 좀 쓸게요...' },
  vision_loading_5: { fr: 'Je scanne tout ça...', en: "I'm scanning all of this...", ko: '전부 스캔하고 있어요...' },

  // ===== LOADING TIPS =====
  loading_tip_1: { fr: "Le brocoli est l'aliment anti-cancer #1 selon les chercheurs.", en: 'Broccoli is the #1 anti-cancer food according to researchers.', ko: '연구자들에 따르면 브로콜리는 항암 식품 1위입니다.' },
  loading_tip_2: { fr: 'Un contenant en verre est toujours plus sûr que le plastique.', en: 'A glass container is always safer than plastic.', ko: '유리 용기는 항상 플라스틱보다 안전합니다.' },
  loading_tip_3: { fr: 'Les nitrites (E250) sont classés cancérogènes avérés par le CIRC.', en: 'Nitrites (E250) are classified as proven carcinogens by the IARC.', ko: '아질산염(E250)은 IARC가 확인된 발암물질로 분류했습니다.' },
  loading_tip_4: { fr: "L'huile d'olive extra vierge est anti-inflammatoire naturelle.", en: 'Extra virgin olive oil is a natural anti-inflammatory.', ko: '엑스트라 버진 올리브유는 천연 항염 식품입니다.' },
  loading_tip_5: { fr: 'Ne chauffez jamais un contenant plastique au micro-ondes.', en: 'Never heat a plastic container in the microwave.', ko: '플라스틱 용기를 절대 전자레인지에 데우지 마세요.' },
  loading_tip_6: { fr: 'Les poêles en fonte ou inox sont les plus sûres pour cuisiner.', en: 'Cast iron or stainless steel pans are the safest for cooking.', ko: '주철이나 스테인리스 팬이 요리에 가장 안전합니다.' },
  loading_tip_7: { fr: "Lisez toujours la liste d'ingrédients, pas juste le devant du produit.", en: "Always read the ingredient list, not just the front of the product.", ko: '제품 앞면만 보지 말고 항상 성분표를 읽으세요.' },
  loading_tip_8: { fr: 'Le curcuma est un puissant anti-inflammatoire naturel.', en: 'Turmeric is a powerful natural anti-inflammatory.', ko: '강황은 강력한 천연 항염 식품입니다.' },
  loading_tip_9: { fr: 'Privilégiez les produits avec moins de 5 ingrédients.', en: 'Choose products with fewer than 5 ingredients.', ko: '성분이 5가지 미만인 제품을 선택하세요.' },
  loading_tip_10: { fr: "Le MSG (E621) est caché sous de nombreux noms : extrait de levure, arôme naturel...", en: 'MSG (E621) hides under many names: yeast extract, natural flavoring...', ko: 'MSG(E621)는 효모 추출물, 천연 향료 등 여러 이름으로 숨어 있습니다...' },
  loading_tip_11: { fr: 'Les bocaux en verre ne libèrent aucune substance dans vos aliments.', en: 'Glass jars release no substances into your food.', ko: '유리병은 음식에 어떤 물질도 배출하지 않습니다.' },
  loading_tip_12: { fr: 'Le thé vert contient des antioxydants puissants.', en: 'Green tea contains powerful antioxidants.', ko: '녹차에는 강력한 항산화 성분이 들어 있습니다.' },

  // ===== PRODUCT DETAIL =====
  product_not_found: { fr: 'Produit non trouvé', en: 'Product not found', ko: '제품을 찾을 수 없음' },
  result: { fr: 'Résultat', en: 'Result', ko: '결과' },
  material_label: { fr: 'Matériau', en: 'Material', ko: '소재' },
  analyzed_by_photo: { fr: 'Analysé par photo', en: 'Analyzed by photo', ko: '사진으로 분석됨' },
  enriched_off: { fr: 'Enrichi par Open Food Facts', en: 'Enriched by Open Food Facts', ko: 'Open Food Facts로 보강됨' },
  photo_tip: { fr: "Pour un résultat plus précis, photographiez la liste d'ingrédients au dos du produit", en: 'For a more accurate result, photograph the ingredient list on the back of the product', ko: '더 정확한 결과를 위해 제품 뒷면의 성분표를 촬영하세요' },
  badge_danger: { fr: 'CANCÉRIGÈNE', en: 'CARCINOGENIC', ko: '발암성' },
  badge_caution: { fr: 'ULTRA-TRANSFORMÉ', en: 'ULTRA-PROCESSED', ko: '초가공' },
  badge_moderation: { fr: 'MODÉRATION', en: 'MODERATION', ko: '주의' },
  badge_approved: { fr: 'APPROUVÉ', en: 'APPROVED', ko: '승인됨' },
  ingredient_badge_industrial: { fr: 'INDUSTRIEL', en: 'INDUSTRIAL', ko: '산업 가공' },
  ingredient_badge_disputed: { fr: 'CONTESTÉ', en: 'DISPUTED', ko: '논란 있음' },
  cosmetic_badge_toxic: { fr: 'TOXIQUE', en: 'TOXIC', ko: '독성' },
  cosmetic_badge_disputed: { fr: 'CONTESTÉ', en: 'DISPUTED', ko: '논란 있음' },
  cosmetic_badge_approved: { fr: 'APPROUVÉ', en: 'APPROVED', ko: '승인됨' },
  toxic_load_badge: { fr: 'DANGER CUMULÉ', en: 'TOXIC LOAD', ko: '과다 위험' },
  toxic_load_eyebrow: { fr: 'ALERTE CUMULÉE', en: 'CUMULATIVE ALERT', ko: '누적 경고' },
  toxic_load_subtitle: { fr: 'Risque cumulatif — à éviter', en: 'Cumulative risk — avoid this product', ko: '누적 위험 — 피하세요' },
  intro_danger: { fr: 'Ce produit contient des substances cancérigènes.', en: 'This product contains carcinogenic substances.', ko: '이 제품에는 발암물질이 포함되어 있습니다.' },
  intro_warning: { fr: 'Ce produit est transformé. Limite ta consommation.', en: 'This product is processed. Limit your consumption.', ko: '이 제품은 가공식품입니다. 섭취를 제한하세요.' },
  intro_moderation: { fr: 'Ce produit est à consommer avec modération.', en: 'This product should be consumed in moderation.', ko: '이 제품은 적당히 섭취해야 합니다.' },
  intro_approved: { fr: 'Ce produit est sain et approuvé.', en: 'This product is healthy and approved.', ko: '이 제품은 건강하며 승인되었습니다.' },

  // ===== NON-FOOD BADGES (household / textile / kitchen — never food vocabulary) =====
  nf_badge_danger: { fr: 'CANCÉRIGÈNE', en: 'CARCINOGENIC', ko: '발암성' },
  nf_badge_hazardous: { fr: 'DANGEREUX', en: 'HAZARDOUS', ko: '위험' },
  nf_badge_caution: { fr: 'PRÉCAUTION', en: 'CAUTION', ko: '주의' },
  nf_badge_safe: { fr: 'SÛR', en: 'SAFE', ko: '안전' },

  // Household (chemicals / irritants)
  intro_household_danger: { fr: 'Ce produit ménager contient des substances chimiques classées dangereuses.', en: 'This household product contains chemicals classified as hazardous.', ko: '이 생활용품에는 위험으로 분류된 화학 물질이 들어 있습니다.' },
  intro_household_hazardous: { fr: 'Ce produit ménager contient des substances irritantes ou toxiques.', en: 'This household product contains irritant or toxic substances.', ko: '이 생활용품에는 자극성 또는 독성 물질이 들어 있습니다.' },
  intro_household_caution: { fr: 'Ce produit ménager est à manipuler avec précaution.', en: 'Handle this household product with care.', ko: '이 생활용품은 주의해서 다뤄야 합니다.' },
  intro_household_safe: { fr: 'Ce produit ménager ne présente pas de substance préoccupante connue.', en: 'This household product has no known substance of concern.', ko: '이 생활용품에는 알려진 우려 물질이 없습니다.' },

  // Textile (fibres / dyes / treatments)
  intro_textile_danger: { fr: 'Ce textile contient des substances classées dangereuses (teintures, traitements ou PFAS).', en: 'This textile contains substances classified as hazardous (dyes, treatments or PFAS).', ko: '이 섬유에는 위험으로 분류된 물질(염료, 처리제 또는 PFAS)이 들어 있습니다.' },
  intro_textile_hazardous: { fr: 'Ce textile contient des traitements chimiques ou des fibres préoccupantes.', en: 'This textile contains chemical treatments or concerning fibres.', ko: '이 섬유에는 화학 처리제나 우려되는 섬유가 들어 있습니다.' },
  intro_textile_caution: { fr: 'Ce textile contient des substances à surveiller.', en: 'This textile contains substances worth watching.', ko: '이 섬유에는 주의가 필요한 물질이 들어 있습니다.' },
  intro_textile_safe: { fr: 'Ce textile ne présente pas de substance préoccupante connue.', en: 'This textile has no known substance of concern.', ko: '이 섬유에는 알려진 우려 물질이 없습니다.' },

  // Kitchen (materials / coatings)
  intro_kitchen_danger: { fr: 'Cet ustensile contient des matériaux ou revêtements classés dangereux.', en: 'This kitchen item contains materials or coatings classified as hazardous.', ko: '이 주방용품에는 위험으로 분류된 소재나 코팅이 들어 있습니다.' },
  intro_kitchen_hazardous: { fr: 'Cet ustensile contient des matériaux ou revêtements préoccupants.', en: 'This kitchen item contains concerning materials or coatings.', ko: '이 주방용품에는 우려되는 소재나 코팅이 들어 있습니다.' },
  intro_kitchen_caution: { fr: 'Cet ustensile contient des matériaux à surveiller.', en: 'This kitchen item contains materials worth watching.', ko: '이 주방용품에는 주의가 필요한 소재가 들어 있습니다.' },
  intro_kitchen_safe: { fr: 'Cet ustensile est fait de matériaux sans risque connu.', en: 'This kitchen item is made of materials with no known risk.', ko: '이 주방용품은 알려진 위험이 없는 소재로 만들어졌습니다.' },

  // Non-food verdict actions (never "consume")
  nf_action_danger: { fr: 'À éviter', en: 'Avoid', ko: '피하세요' },
  nf_action_hazardous: { fr: 'Manipuler avec précaution', en: 'Handle with care', ko: '주의해서 다루세요' },
  nf_action_caution: { fr: 'Précautions d\'usage', en: 'Use with care', ko: '사용 시 주의' },
  nf_action_safe: { fr: 'Bon choix', en: 'Good choice', ko: '좋은 선택' },
  approved_consume_freely: { fr: 'Vous pouvez consommer ce produit régulièrement sans inquiétude.', en: 'You can consume this product regularly without concern.', ko: '이 제품은 걱정 없이 정기적으로 섭취해도 됩니다.' },
  not_classified_unknown: { fr: 'Non classé', en: 'Not classified', ko: '미분류' },
  all_ingredients: { fr: 'Tous les ingrédients', en: 'All ingredients', ko: '전체 성분' },
  pro_only_listen: { fr: 'Écoute disponible avec Dr.Toxi Pro', en: 'Listen available with Dr.Toxi Pro', ko: '듣기 기능은 Dr.Toxi Pro에서 사용할 수 있습니다' },
  substances_detected: { fr: 'Substances détectées', en: 'Substances detected', ko: '검출된 물질' },
  level_confirmed_carcinogen: { fr: 'CANCÉRIGÈNE', en: 'CARCINOGENIC', ko: '발암성' },
  level_probable_carcinogen: { fr: 'NOCIF', en: 'WARNING', ko: '주의' },
  level_possible_carcinogen: { fr: 'MODÉRATION', en: 'MODERATION', ko: '주의' },
  level_controversial: { fr: 'NOCIF', en: 'WARNING', ko: '주의' },
  level_low_risk: { fr: 'APPROUVÉ', en: 'APPROVED', ko: '승인됨' },
  classification_iarc: { fr: 'Classification : CIRC/OMS', en: 'Classification: IARC/WHO', ko: '분류: IARC/WHO' },
  not_classified_iarc: { fr: 'Non classé cancérogène par le CIRC', en: 'Not classified as carcinogenic by the IARC', ko: 'IARC가 발암물질로 분류하지 않음' },
  recommendations: { fr: 'Recommandations', en: 'Recommendations', ko: '권장 사항' },
  healthier_alternatives: { fr: 'Alternatives plus saines', en: 'Healthier alternatives', ko: '더 건강한 대안' },
  safer_alternatives: { fr: 'Alternatives plus sûres', en: 'Safer alternatives', ko: '더 안전한 대안' },
  where_find_alternatives: { fr: 'Où trouver des alternatives saines ?', en: 'Where to find healthy alternatives?', ko: '건강한 대안은 어디서 찾을까요?' },
  bio_stores_intro: { fr: 'Privilégiez les produits biologiques certifiés sans additifs ni substances controversées.', en: 'Choose certified organic products without additives or controversial substances.', ko: '첨가물이나 논란이 있는 물질이 없는 인증된 유기농 제품을 선택하세요.' },
  specialty_stores: { fr: 'Magasins spécialisés', en: 'Specialty stores', ko: '전문 매장' },
  organic_sections: { fr: 'Sections bio en épicerie', en: 'Organic sections in grocery stores', ko: '마트의 유기농 코너' },
  local_markets: { fr: 'Marchés locaux', en: 'Local markets', ko: '지역 시장' },
  clean_brands: { fr: 'Marques propres recommandées', en: 'Recommended clean brands', ko: '추천 클린 브랜드' },
  organic_brands: { fr: 'Marques bio recommandées', en: 'Recommended organic brands', ko: '추천 유기농 브랜드' },
  recommended_bio_alternatives: { fr: 'Alternatives bio recommandées pour ce produit', en: 'Recommended organic alternatives for this product', ko: '이 제품에 대한 추천 유기농 대안' },
  preparing: { fr: 'Préparation...', en: 'Preparing...', ko: '준비 중...' },
  share_result: { fr: 'Partager ce résultat', en: 'Share this result', ko: '이 결과 공유하기' },
  ask_dr_toxi: { fr: 'Demander à Dr. Toxi', en: 'Ask Dr. Toxi', ko: 'Dr. Toxi에게 물어보기' },
  share_dialog_title: { fr: 'Partager le résultat Dr.Toxi', en: 'Share Dr.Toxi result', ko: 'Dr.Toxi 결과 공유' },
  share_suffix: { fr: "Scannez vos produits gratuitement avec Dr.Toxi — disponible sur l'App Store", en: "Scan your products for free with Dr.Toxi — available on the App Store", ko: 'Dr.Toxi로 제품을 무료로 스캔하세요 — App Store에서 이용 가능' },

  // ===== RISK BADGE INFO (additives.ts) =====
  risk_danger_label: { fr: 'PRODUIT CANCÉRIGÈNE', en: 'CARCINOGENIC PRODUCT', ko: '발암성 제품' },
  risk_danger_sub_g1: { fr: 'Cancérigène confirmé (Groupe 1 CIRC)', en: 'Confirmed carcinogen (IARC Group 1)', ko: '확인된 발암물질 (IARC 1군)' },
  risk_danger_sub_g2a: { fr: 'Probablement cancérigène (Groupe 2A CIRC)', en: 'Probably carcinogenic (IARC Group 2A)', ko: '발암 추정 (IARC 2A군)' },
  risk_caution_label: { fr: 'NOCIF', en: 'WARNING', ko: '주의' },
  risk_caution_sub: { fr: 'Substance controversée ou possiblement cancérigène', en: 'Controversial or possibly carcinogenic substance', ko: '논란이 있거나 발암 가능 물질' },
  risk_warning_label: { fr: 'NOCIF', en: 'WARNING', ko: '주의' },
  risk_warning_sub: { fr: 'Plusieurs substances controversées détectées', en: 'Multiple controversial substances detected', ko: '여러 논란 물질 검출' },
  risk_moderation_label: { fr: 'MODÉRATION', en: 'MODERATION', ko: '주의' },
  risk_moderation_sub: { fr: 'Substance controversée isolée ou Groupe 2B', en: 'Isolated controversial substance or Group 2B', ko: '단독 논란 물질 또는 2B군' },
  risk_approved_label: { fr: 'APPROUVÉ', en: 'APPROVED', ko: '승인됨' },
  risk_approved_sub: { fr: 'Aucune substance cancérigène détectée', en: 'No carcinogenic substances detected', ko: '발암물질이 검출되지 않음' },

  // ===== PROFILE =====
  profile_title: { fr: 'Profil', en: 'Profile', ko: '프로필' },
  drtoxi_pro: { fr: 'Dr.Toxi Pro', en: 'Dr.Toxi Pro', ko: 'Dr.Toxi Pro' },
  drtoxi_free: { fr: 'Dr.Toxi Gratuit', en: 'Dr.Toxi Free', ko: 'Dr.Toxi 무료' },
  pro_active_desc: { fr: 'Actif — Dr. Toxi illimité, historique complet', en: 'Active — Unlimited Dr. Toxi, full history', ko: '활성 — Dr. Toxi 무제한, 전체 기록' },
  free_desc: { fr: 'Dr. Toxi illimité, historique illimité, favoris', en: 'Unlimited Dr. Toxi, unlimited history, favorites', ko: 'Dr. Toxi 무제한, 무제한 기록, 즐겨찾기' },
  active: { fr: 'Actif', en: 'Active', ko: '활성' },
  my_badges: { fr: 'Mes badges', en: 'My badges', ko: '내 배지' },
  unlocked: { fr: 'débloqués', en: 'unlocked', ko: '획득' },
  statistics: { fr: 'Statistiques', en: 'Statistics', ko: '통계' },
  products_analyzed: { fr: (n: number) => `${n} produit${n !== 1 ? 's' : ''} analysé${n !== 1 ? 's' : ''}`, en: (n: number) => `${n} product${n !== 1 ? 's' : ''} analyzed`, ko: (n: number) => `제품 ${n}개 분석됨` },
  stat_danger: { fr: 'Cancérigène', en: 'Carcinogenic', ko: '발암성' },
  stat_probable: { fr: 'Ultra-transformé', en: 'Ultra-processed', ko: '초가공' },
  stat_possible: { fr: 'Modération', en: 'Moderation', ko: '주의' },
  stat_safe: { fr: 'Approuvé', en: 'Approved', ko: '승인됨' },
  health_quiz: { fr: 'Quiz Santé', en: 'Health Quiz', ko: '건강 퀴즈' },
  quiz_score: { fr: (correct: number, total: number, pct: number) => `${correct}/${total} bonnes réponses (${pct}%)`, en: (correct: number, total: number, pct: number) => `${correct}/${total} correct answers (${pct}%)`, ko: (correct: number, total: number, pct: number) => `정답 ${correct}/${total} (${pct}%)` },
  quiz_invite: { fr: '10 questions pour tester vos connaissances', en: '10 questions to test your knowledge', ko: '지식을 시험하는 10가지 질문' },
  detects_risks_in: { fr: 'Dr.Toxi détecte les risques dans :', en: 'Dr.Toxi detects risks in:', ko: 'Dr.Toxi가 위험을 감지하는 분야:' },
  cat_food_drinks: { fr: 'Aliments et boissons', en: 'Food and drinks', ko: '식품 및 음료' },
  cat_cosmetics_care: { fr: 'Cosmétiques et soins', en: 'Cosmetics and care', ko: '화장품 및 케어 제품' },
  cat_household_products: { fr: 'Produits ménagers', en: 'Household products', ko: '생활용품' },
  cat_kitchen_utensils: { fr: 'Ustensiles de cuisine', en: 'Kitchen utensils', ko: '주방용품' },
  cat_clothing_textiles: { fr: 'Vêtements et textiles', en: 'Clothing and textiles', ko: '의류 및 섬유' },
  cat_containers: { fr: 'Contenants et emballages', en: 'Containers and packaging', ko: '용기 및 포장재' },
  info_title: { fr: 'Informations', en: 'Information', ko: '정보' },
  privacy_policy: { fr: 'Politique de confidentialité', en: 'Privacy policy', ko: '개인정보 처리방침' },
  terms_of_use: { fr: "Conditions d'utilisation", en: 'Terms of use', ko: '이용 약관' },
  faq_label: { fr: 'FAQ', en: 'FAQ', ko: '자주 묻는 질문' },
  ai_transparency: { fr: 'Transparence IA', en: 'AI Transparency', ko: 'AI 투명성' },
  contact_us: { fr: 'Nous contacter', en: 'Contact us', ko: '문의하기' },
  about_label: { fr: 'À propos', en: 'About', ko: '소개' },
  rate_app: { fr: "Noter l'app", en: 'Rate the app', ko: '앱 평가하기' },
  contact_email_title: { fr: 'Nous contacter', en: 'Contact us', ko: '문의하기' },
  contact_email_body: { fr: 'Envoyez-nous un courriel à :\ncontact@toxiscan.com', en: 'Send us an email at:\ncontact@toxiscan.com', ko: '이메일로 문의해 주세요:\ncontact@toxiscan.com' },
  rate_thanks: { fr: 'Merci !', en: 'Thank you!', ko: '감사합니다!' },
  rate_unavailable: { fr: "La notation sera disponible une fois l'app publiée sur l'App Store. Merci pour votre soutien !", en: "Rating will be available once the app is published on the App Store. Thank you for your support!", ko: '앱이 App Store에 출시되면 평가가 가능합니다. 응원해 주셔서 감사합니다!' },

  // ===== ONBOARDING =====
  onboarding_title_1: { fr: "Photographiez n'importe quoi", en: 'Photograph anything', ko: '무엇이든 촬영하세요' },
  onboarding_sub_1: { fr: 'Aliment, cosmétique, ustensile de cuisine, vêtement, produit ménager…', en: 'Food, cosmetics, kitchen utensils, clothing, household products...', ko: '식품, 화장품, 주방용품, 의류, 생활용품…' },
  onboarding_photo_tip_1: { fr: "Photographie uniquement la liste d'ingrédients, pas le produit entier", en: 'Only photograph the ingredient list, not the whole product', ko: '제품 전체가 아니라 성분표만 촬영하세요' },
  onboarding_photo_tip_2: { fr: 'Assure-toi que le texte est bien lisible et bien éclairé', en: 'Make sure the text is clearly readable and well lit', ko: '글자가 잘 보이고 조명이 밝은지 확인하세요' },
  onboarding_photo_tip_3: { fr: 'Plus la photo est nette, plus l\'analyse est précise', en: 'The sharper the photo, the more accurate the analysis', ko: '사진이 선명할수록 분석이 정확합니다' },
  onboarding_title_2: { fr: 'Comprenez le risque en 1 seconde', en: 'Understand the risk in 1 second', ko: '1초 만에 위험을 파악하세요' },
  onboarding_sub_2: { fr: "Basé sur les classifications officielles de l'OMS", en: 'Based on official WHO classifications', ko: 'WHO 공식 분류 기준에 기반합니다' },
  onboarding_detected: { fr: 'Détecté', en: 'Detected', ko: '검출됨' },
  onboarding_title_3: { fr: 'Protégez votre famille', en: 'Protect your family', ko: '가족을 지키세요' },
  onboarding_sub_3: { fr: 'Faites les bons choix au quotidien pour ceux que vous aimez', en: 'Make the right choices every day for the ones you love', ko: '사랑하는 사람들을 위해 매일 올바른 선택을 하세요' },
  start: { fr: 'Commencer', en: 'Start', ko: '시작하기' },
  next: { fr: 'Suivant', en: 'Next', ko: '다음' },
  skip: { fr: 'Passer', en: 'Skip', ko: '건너뛰기' },

  // ===== ONBOARDING (single screen) =====
  onboarding_hero_title: { fr: 'Scannez les ingrédients.\nConnaissez le risque.', en: 'Scan ingredients.\nKnow the risk.', ko: '성분을 스캔하세요.\n위험을 확인하세요.' },
  onboarding_hero_sub: { fr: "Photographiez uniquement la liste d'ingrédients au dos du produit.", en: 'Photograph only the ingredient list on the back of the product.', ko: '제품 뒷면의 성분표만 촬영하세요.' },
  onboarding_mock_ingredients_label: { fr: 'INGRÉDIENTS :', en: 'INGREDIENTS:', ko: '성분:' },
  onboarding_mock_ingredients_body: { fr: 'Eau, Sucre, Huile de palme, Émulsifiant (E471), Sel, Arôme naturel, Acide citrique, Conservateur (E202).', en: 'Water, Sugar, Palm Oil, Emulsifier (E471), Salt, Natural Flavour, Citric Acid, Preservative (E202).', ko: '물, 설탕, 팜유, 유화제(E471), 소금, 천연 향료, 구연산, 보존료(E202).' },
  onboarding_results_heading: { fr: 'Résultats possibles', en: 'Possible results', ko: '가능한 결과' },
  onboarding_risk_avoid: { fr: 'Risque élevé · À éviter', en: 'High risk · Avoid', ko: '높은 위험 · 피하세요' },
  onboarding_risk_limit: { fr: 'Risque élevé · À limiter', en: 'High risk · Limit', ko: '높은 위험 · 제한하세요' },
  onboarding_risk_moderate: { fr: 'Risque moyen · Modération', en: 'Medium risk · Moderate', ko: '중간 위험 · 적당히' },
  onboarding_risk_enjoy: { fr: 'Faible risque · Sans souci', en: 'Low risk · Enjoy', ko: '낮은 위험 · 안심' },
  onboarding_cta_start: { fr: 'Commencer à scanner', en: 'Start scanning', ko: '스캔 시작하기' },
  onboarding_science_footer: { fr: "Scientifiquement fondé · Aligné sur l'OMS", en: 'Science-backed · WHO-aligned', ko: '과학적 근거 · WHO 기준' },

  // ===== AI CONSENT =====
  ai_consent_title: { fr: "Dr.Toxi utilise l'intelligence artificielle", en: 'Dr.Toxi uses artificial intelligence', ko: 'Dr.Toxi는 인공지능을 사용합니다' },
  ai_consent_desc: { fr: "Dr. Toxi est une IA entraînée pour repérer les substances cancérigènes dans tes produits. Il analyse, t'alerte et te guide vers les meilleurs choix.", en: "Dr. Toxi is an AI trained to spot carcinogenic substances in your products. It analyzes, alerts you, and guides you toward the best choices.", ko: 'Dr. Toxi는 제품 속 발암물질을 찾아내도록 학습된 AI입니다. 분석하고, 경고하고, 최선의 선택으로 안내합니다.' },
  tech_used: { fr: 'Technologies utilisées :', en: 'Technologies used:', ko: '사용된 기술:' },
  ai_disclaimer_1: { fr: "Basé sur les classifications d'organismes reconnus (OMS, EFSA). Ne remplace pas un avis médical.", en: 'Based on classifications from recognized organizations (WHO, EFSA). Not a substitute for medical advice.', ko: '공인 기관(WHO, EFSA)의 분류에 기반합니다. 의학적 조언을 대체하지 않습니다.' },
  ai_disclaimer_2: { fr: "Informations à titre informatif uniquement.", en: 'For informational purposes only.', ko: '정보 제공 목적으로만 제공됩니다.' },
  understood: { fr: 'Compris', en: 'Understood', ko: '확인했습니다' },
  ai_privacy_note: { fr: "Vos photos et messages sont traités de manière sécurisée. Aucune donnée personnelle n'est conservée.", en: 'Your photos and messages are processed securely. No personal data is retained.', ko: '사진과 메시지는 안전하게 처리됩니다. 개인 데이터는 저장되지 않습니다.' },

  // ===== PAYWALL =====
  paywall_drtoxi: { fr: 'Discutez avec Dr. Toxi en illimité', en: 'Chat with Dr. Toxi unlimited', ko: 'Dr. Toxi와 무제한 대화' },
  paywall_history: { fr: 'Sauvegardez tout votre historique', en: 'Save all your history', ko: '모든 기록 저장' },
  paywall_favorite: { fr: 'Sauvegardez vos produits favoris', en: 'Save your favorite products', ko: '즐겨찾는 제품 저장' },
  paywall_alerts: { fr: 'Alertes en temps réel', en: 'Real-time alerts', ko: '실시간 알림' },
  paywall_scan: { fr: 'Scannez vos produits sans limite', en: 'Scan your products without limits', ko: '제품 무제한 스캔' },
  paywall_default: { fr: 'Passez à Dr.Toxi Pro', en: 'Upgrade to Dr.Toxi Pro', ko: 'Dr.Toxi Pro로 업그레이드' },
  paywall_sub_drtoxi: { fr: 'Vous avez utilisé vos 3 messages gratuits du jour', en: "You've used your 3 free messages today", ko: '오늘 무료 메시지 3개를 모두 사용했습니다' },
  paywall_sub_history: { fr: 'Sans abonnement, seuls les 3 derniers produits sont visibles', en: 'Without a subscription, only the last 3 products are visible', ko: '구독하지 않으면 최근 3개 제품만 표시됩니다' },
  paywall_sub_favorite: { fr: 'Les favoris sont une fonctionnalité exclusive Dr.Toxi Pro', en: 'Favorites are an exclusive Dr.Toxi Pro feature', ko: '즐겨찾기는 Dr.Toxi Pro 전용 기능입니다' },
  paywall_sub_alerts: { fr: 'Soyez alerté des nouveaux produits interdits, toxiques ou cancérigènes', en: 'Be alerted about new banned, toxic, or carcinogenic products', ko: '새로 금지·독성·발암 제품이 나오면 알림을 받으세요' },
  paywall_sub_scan: { fr: 'Vous avez utilisé vos 3 scans gratuits du jour', en: "You've used your 3 free scans today", ko: '오늘 무료 스캔 3회를 모두 사용했습니다' },
  paywall_sub_default: { fr: 'Débloquez toutes les fonctionnalités premium', en: 'Unlock all premium features', ko: '모든 프리미엄 기능을 잠금 해제하세요' },
  benefit_unlimited_drtoxi: { fr: 'Dr. Toxi illimité', en: 'Unlimited Dr. Toxi', ko: 'Dr. Toxi 무제한' },
  benefit_unlimited_history: { fr: 'Historique illimité', en: 'Unlimited history', ko: '무제한 기록' },
  benefit_favorites: { fr: 'Favoris produits', en: 'Product favorites', ko: '제품 즐겨찾기' },
  benefit_notifications: { fr: 'Notifications rappel produits', en: 'Product reminder notifications', ko: '제품 알림' },
  save_45: { fr: 'Économisez 45%', en: 'Save 45%', ko: '45% 절약' },
  annual_plan: { fr: (price: string) => `Annuel — ${price}/an`, en: (price: string) => `Annual — ${price}/year`, ko: (price: string) => `연간 — ${price}/년` },
  monthly_equivalent: { fr: (price: string) => `soit ${price}/mois`, en: (price: string) => `i.e. ${price}/month`, ko: (price: string) => `월 ${price} 상당` },
  monthly_plan: { fr: (price: string) => `Mensuel — ${price}/mois`, en: (price: string) => `Monthly — ${price}/month`, ko: (price: string) => `월간 — ${price}/월` },
  upgrade_pro: { fr: 'Passer à Dr.Toxi Pro', en: 'Upgrade to Dr.Toxi Pro', ko: 'Dr.Toxi Pro로 업그레이드' },
  donation_text: { fr: "Une partie des revenus est destinée à aider les patients atteints de cancer à payer leurs traitements et médicaments.", en: 'A portion of the revenue is dedicated to helping cancer patients pay for their treatments and medications.', ko: '수익의 일부는 암 환자가 치료와 약값을 부담하도록 돕는 데 사용됩니다.' },
  legal_text: { fr: "Le paiement sera débité de votre compte iTunes à la confirmation de l'achat. L'abonnement se renouvelle automatiquement sauf annulation au moins 24h avant la fin de la période en cours.\nAnnulez à tout moment dans les réglages de votre appareil.", en: "Payment will be charged to your iTunes account upon confirmation of purchase. The subscription automatically renews unless canceled at least 24 hours before the end of the current period.\nCancel at any time in your device settings.", ko: '결제는 구매 확인 시 iTunes 계정으로 청구됩니다. 현재 기간 종료 최소 24시간 전에 취소하지 않으면 구독이 자동으로 갱신됩니다.\n기기 설정에서 언제든지 취소할 수 있습니다.' },
  restore_purchases: { fr: 'Restaurer les achats', en: 'Restore purchases', ko: '구매 복원' },
  purchase_ready: { fr: 'Tout est prêt', en: 'All set', ko: '준비 완료' },
  purchase_success: { fr: 'Votre achat a été effectué avec succès.', en: 'Your purchase was completed successfully.', ko: '구매가 성공적으로 완료되었습니다.' },
  purchase_error: { fr: 'Erreur', en: 'Error', ko: '오류' },
  purchase_load_error: { fr: 'Impossible de charger les offres. Veuillez réessayer.', en: 'Unable to load offers. Please try again.', ko: '요금제를 불러올 수 없습니다. 다시 시도해 주세요.' },
  loading_offers: { fr: 'Chargement des offres...', en: 'Loading offers...', ko: '요금제를 불러오는 중...' },
  purchase_failed: { fr: "L'achat n'a pas pu être complété. Si vous avez été débité, appuyez sur 'Restaurer les achats'.", en: "The purchase could not be completed. If you were charged, tap 'Restore purchases'.", ko: '구매를 완료할 수 없습니다. 청구되었다면 "구매 복원"을 눌러 주세요.' },
  subscription_restored: { fr: 'Abonnement restauré !', en: 'Subscription restored!', ko: '구독이 복원되었습니다!' },
  subscription_restored_desc: { fr: 'Vos fonctionnalités premium sont de nouveau actives.', en: 'Your premium features are active again.', ko: '프리미엄 기능이 다시 활성화되었습니다.' },
  great: { fr: 'Super !', en: 'Great!', ko: '좋아요!' },
  no_subscription: { fr: 'Aucun abonnement trouvé.', en: 'No subscription found.', ko: '구독을 찾을 수 없습니다.' },
  no_subscription_desc: { fr: "Aucun abonnement actif n'a été trouvé pour ce compte.", en: 'No active subscription was found for this account.', ko: '이 계정에서 활성 구독을 찾을 수 없습니다.' },
  restore_error: { fr: 'Impossible de restaurer les achats. Veuillez réessayer.', en: 'Unable to restore purchases. Please try again.', ko: '구매를 복원할 수 없습니다. 다시 시도해 주세요.' },

  // ===== BADGES =====
  badges_unlocked: { fr: 'badges débloqués', en: 'badges unlocked', ko: '배지 획득' },

  // Badge names
  badge_name_scan_1: { fr: 'Premier pas', en: 'First Step', ko: '첫걸음' },
  badge_name_scan_10: { fr: 'Détective santé', en: 'Health Detective', ko: '건강 탐정' },
  badge_name_scan_50: { fr: 'Expert en étiquettes', en: 'Label Expert', ko: '라벨 전문가' },
  badge_name_scan_100: { fr: 'Chasseur de toxines', en: 'Toxin Hunter', ko: '독소 사냥꾼' },
  badge_name_scan_500: { fr: 'Légende Dr.Toxi', en: 'Dr.Toxi Legend', ko: 'Dr.Toxi 레전드' },
  badge_name_green_1: { fr: 'Bon choix', en: 'Good Choice', ko: '좋은 선택' },
  badge_name_green_10: { fr: 'Panier sain', en: 'Healthy Cart', ko: '건강한 장바구니' },
  badge_name_green_25: { fr: 'Frigo propre', en: 'Clean Fridge', ko: '깨끗한 냉장고' },
  badge_name_green_50: { fr: 'Maison saine', en: 'Healthy Home', ko: '건강한 집' },
  badge_name_green_100: { fr: 'Mode de vie sain', en: 'Healthy Lifestyle', ko: '건강한 라이프스타일' },
  badge_name_share_1: { fr: 'Ambassadeur', en: 'Ambassador', ko: '홍보대사' },
  badge_name_share_10: { fr: 'Influenceur santé', en: 'Health Influencer', ko: '건강 인플루언서' },
  badge_name_share_25: { fr: 'Viral', en: 'Viral', ko: '바이럴' },
  badge_name_share_100: { fr: 'Ambassadeur Légendaire', en: 'Legendary Ambassador', ko: '전설의 홍보대사' },
  badge_name_drtoxi_1: { fr: 'Curieux', en: 'Curious Mind', ko: '호기심쟁이' },
  badge_name_drtoxi_10: { fr: 'Étudiant en santé', en: 'Health Student', ko: '건강 학생' },

  // Badge descriptions
  badge_desc_scan_1: { fr: 'Premier produit scanné', en: 'First product scanned', ko: '첫 제품 스캔' },
  badge_desc_scan_10: { fr: '10 produits scannés', en: '10 products scanned', ko: '제품 10개 스캔' },
  badge_desc_scan_50: { fr: '50 produits scannés', en: '50 products scanned', ko: '제품 50개 스캔' },
  badge_desc_scan_100: { fr: '100 produits scannés', en: '100 products scanned', ko: '제품 100개 스캔' },
  badge_desc_scan_500: { fr: '500 produits scannés', en: '500 products scanned', ko: '제품 500개 스캔' },
  badge_desc_green_1: { fr: 'Premier produit vert trouvé', en: 'First green product found', ko: '첫 그린 제품 발견' },
  badge_desc_green_10: { fr: '10 produits verts trouvés', en: '10 green products found', ko: '그린 제품 10개 발견' },
  badge_desc_green_25: { fr: '25 produits verts trouvés', en: '25 green products found', ko: '그린 제품 25개 발견' },
  badge_desc_green_50: { fr: '50 produits verts trouvés', en: '50 green products found', ko: '그린 제품 50개 발견' },
  badge_desc_green_100: { fr: '100 produits verts trouvés', en: '100 green products found', ko: '그린 제품 100개 발견' },
  badge_desc_share_1: { fr: 'Premier partage sur les réseaux sociaux', en: 'First share on social media', ko: '첫 소셜 미디어 공유' },
  badge_desc_share_10: { fr: '10 partages', en: '10 shares', ko: '공유 10회' },
  badge_desc_share_25: { fr: '25 partages', en: '25 shares', ko: '공유 25회' },
  badge_desc_share_100: { fr: '100 partages — Badge doré exclusif rare', en: '100 shares — Rare exclusive golden badge', ko: '공유 100회 — 희귀 골드 배지' },
  badge_desc_drtoxi_1: { fr: 'Première question à Dr. Toxi', en: 'First question to Dr. Toxi', ko: 'Dr. Toxi에게 첫 질문' },
  badge_desc_drtoxi_10: { fr: '10 questions posées', en: '10 questions asked', ko: '질문 10개' },
  shares_count: { fr: (n: number) => `${n} partage${n !== 1 ? 's' : ''}`, en: (n: number) => `${n} share${n !== 1 ? 's' : ''}`, ko: (n: number) => `공유 ${n}회` },
  scan_badges: { fr: 'Badges de scan', en: 'Scan badges', ko: '스캔 배지' },
  green_products: { fr: 'Produits verts', en: 'Green products', ko: '그린 제품' },
  sharing: { fr: 'Partage', en: 'Sharing', ko: '공유' },
  badge_unlocked: { fr: 'Badge débloqué !', en: 'Badge unlocked!', ko: '배지 획득!' },
  reward_unlocked: { fr: 'Récompense débloquée !', en: 'Reward unlocked!', ko: '보상 획득!' },
  thanks: { fr: 'Merci !', en: 'Thanks!', ko: '감사합니다!' },
  share_badge_msg: { fr: (name: string, desc: string) => `J'ai débloqué le badge "${name}" sur Dr.Toxi ! ${desc}\n\nScannez vos produits gratuitement avec Dr.Toxi — disponible sur l'App Store`, en: (name: string, desc: string) => `I unlocked the "${name}" badge on Dr.Toxi! ${desc}\n\nScan your products for free with Dr.Toxi — available on the App Store`, ko: (name: string, desc: string) => `Dr.Toxi에서 "${name}" 배지를 획득했어요! ${desc}\n\nDr.Toxi로 제품을 무료로 스캔하세요 — App Store에서 이용 가능` },
  share_reward_25: { fr: 'Bravo ! Tu as partagé 25 fois. Merci de faire connaître Dr.Toxi !', en: 'Congrats! You shared 25 times. Thanks for spreading the word about Dr.Toxi!', ko: '축하합니다! 25회 공유했어요. Dr.Toxi를 알려 주셔서 감사합니다!' },
  share_reward_100: { fr: 'Incroyable ! 100 partages ! Tu es un vrai ambassadeur Dr.Toxi. Merci pour ton soutien !', en: 'Incredible! 100 shares! You are a true Dr.Toxi ambassador. Thanks for your support!', ko: '대단해요! 100회 공유! 진정한 Dr.Toxi 홍보대사예요. 응원해 주셔서 감사합니다!' },

  // ===== QUIZ =====
  quiz_perfect: { fr: 'Parfait ! Vous êtes un expert en santé !', en: 'Perfect! You are a health expert!', ko: '완벽해요! 당신은 건강 전문가예요!' },
  quiz_excellent: { fr: 'Excellent ! Vous en savez beaucoup !', en: 'Excellent! You know a lot!', ko: '훌륭해요! 많이 알고 계시네요!' },
  quiz_good: { fr: 'Bien joué ! Continuez à apprendre.', en: 'Well done! Keep learning.', ko: '잘했어요! 계속 배워 보세요.' },
  quiz_ok: { fr: 'Pas mal ! Il y a encore à découvrir.', en: 'Not bad! There is still more to discover.', ko: '나쁘지 않아요! 아직 배울 게 더 있어요.' },
  quiz_improve: { fr: 'Continuez à vous informer avec Dr.Toxi !', en: 'Keep learning with Dr.Toxi!', ko: 'Dr.Toxi와 함께 계속 배워 보세요!' },
  replay: { fr: 'Rejouer', en: 'Replay', ko: '다시 하기' },
  see_result: { fr: 'Voir le résultat', en: 'See the result', ko: '결과 보기' },
  next_question: { fr: 'Question suivante', en: 'Next question', ko: '다음 질문' },
  correct_answer: { fr: 'Bonne réponse', en: 'Correct answer', ko: '정답' },
  wrong_answer: { fr: 'Mauvaise réponse', en: 'Wrong answer', ko: '오답' },

  // ===== DR TOXI VERDICT =====
  verdict_danger_title: { fr: 'Dr. Toxi déconseille ce produit', en: 'Dr. Toxi advises against this product', ko: 'Dr. Toxi가 이 제품을 권하지 않습니다' },
  verdict_danger_msg: { fr: "Ce produit contient un ingrédient classé cancérigène par l'OMS. Je te déconseille fortement de le consommer régulièrement.", en: "This product contains an ingredient classified as carcinogenic by the WHO. I strongly advise against consuming it regularly.", ko: '이 제품에는 WHO가 발암물질로 분류한 성분이 들어 있어요. 정기적으로 섭취하지 않기를 강력히 권합니다.' },
  verdict_caution_title: { fr: 'Dr. Toxi te recommande la prudence', en: 'Dr. Toxi advises caution', ko: 'Dr. Toxi가 주의를 권합니다' },
  verdict_caution_msg: { fr: "Ce produit contient plusieurs substances controversées ou ultra-transformées. Je te recommande de le consommer très rarement et de chercher une alternative plus naturelle.", en: "This product contains several controversial or ultra-processed substances. I recommend consuming it very rarely and looking for a more natural alternative.", ko: '이 제품에는 논란이 있거나 초가공된 물질이 여러 가지 들어 있어요. 아주 가끔만 섭취하고 더 자연스러운 대안을 찾기를 권합니다.' },
  verdict_moderation_title: { fr: 'Dr. Toxi te recommande la modération', en: 'Dr. Toxi recommends moderation', ko: 'Dr. Toxi가 적당한 섭취를 권합니다' },
  verdict_moderation_msg: { fr: "Ce produit contient quelques ingrédients transformés ou controversés. Tu peux en consommer occasionnellement, mais évite d'en faire un aliment du quotidien.", en: "This product contains a few processed or controversial ingredients. You can consume it occasionally, but avoid making it a daily food.", ko: '이 제품에는 가공되거나 논란이 있는 성분이 몇 가지 있어요. 가끔은 괜찮지만 매일 먹는 음식으로는 삼가세요.' },
  verdict_approved_title: { fr: 'Dr. Toxi approuve ce produit', en: 'Dr. Toxi approves this product', ko: 'Dr. Toxi가 이 제품을 승인합니다' },
  verdict_approved_msg: { fr: "Excellent choix ! La grande majorité des ingrédients sont naturels et sains. Tu peux consommer ce produit sans inquiétude.", en: "Excellent choice! The vast majority of ingredients are natural and healthy. You can consume this product without worry.", ko: '훌륭한 선택이에요! 대부분의 성분이 자연스럽고 건강합니다. 걱정 없이 드셔도 됩니다.' },

  // ===== SHARE IMAGE CARD =====
  share_card_kicker: { fr: 'Analyse santé premium', en: 'Premium health scan', ko: '프리미엄 건강 스캔' },
  share_verdict_eyebrow_danger: { fr: 'Verdict Dr. Toxi', en: 'Dr. Toxi verdict', ko: 'Dr. Toxi 판정' },
  share_verdict_eyebrow_warning: { fr: 'Verdict Dr. Toxi', en: 'Dr. Toxi verdict', ko: 'Dr. Toxi 판정' },
  share_verdict_eyebrow_moderation: { fr: 'Verdict Dr. Toxi', en: 'Dr. Toxi verdict', ko: 'Dr. Toxi 판정' },
  share_verdict_eyebrow_approved: { fr: 'Verdict Dr. Toxi', en: 'Dr. Toxi verdict', ko: 'Dr. Toxi 판정' },
  share_approved_label: { fr: 'APPROUVE', en: 'APPROVED', ko: '승인됨' },
  share_approved_sub: { fr: 'Aucune substance cancérigène', en: 'No carcinogenic substances', ko: '발암물질 없음' },
  share_approved_explanation: { fr: 'Dr.Toxi confirme : ce produit ne contient aucune substance cancérigène connue. Vous pouvez le consommer en toute tranquillité.', en: 'Dr.Toxi confirms: this product contains no known carcinogenic substances. You can consume it safely.', ko: 'Dr.Toxi 확인: 이 제품에는 알려진 발암물질이 없습니다. 안심하고 드셔도 됩니다.' },
  share_caution_label: { fr: 'PRUDENCE', en: 'CAUTION', ko: '주의' },
  share_caution_sub: { fr: 'Substance controversée détectée', en: 'Controversial substance detected', ko: '논란 물질 검출' },
  share_caution_explanation: { fr: 'Dr.Toxi alerte : ce produit contient des substances controversées dont les effets sur la santé font débat. Consommation à limiter.', en: 'Dr.Toxi warns: this product contains controversial substances whose health effects are debated. Limit consumption.', ko: 'Dr.Toxi 경고: 이 제품에는 건강 영향이 논쟁 중인 논란 물질이 들어 있습니다. 섭취를 제한하세요.' },
  share_danger_label: { fr: 'DANGER', en: 'DANGER', ko: '위험' },
  share_danger_sub: { fr: 'Cancérigène classé par le CIRC', en: 'Carcinogen classified by the IARC', ko: 'IARC가 분류한 발암물질' },
  share_danger_explanation: { fr: 'Dr.Toxi déconseille ce produit : il contient des substances classées cancérigènes par le CIRC. Évitez sa consommation régulière.', en: 'Dr.Toxi advises against this product: it contains substances classified as carcinogenic by the IARC. Avoid regular consumption.', ko: 'Dr.Toxi가 이 제품을 권하지 않습니다: IARC가 발암물질로 분류한 성분이 들어 있습니다. 정기적인 섭취를 피하세요.' },
  no_dangerous_substance: { fr: 'Aucune substance dangereuse détectée', en: 'No dangerous substances detected', ko: '위험물질이 검출되지 않음' },
  available_app_store: { fr: "Disponible sur l'App Store", en: 'Available on the App Store', ko: 'App Store에서 이용 가능' },
  share_promo_title: { fr: "Scannez vos produits avec Dr.Toxi", en: 'Scan your products with Dr.Toxi', ko: 'Dr.Toxi로 제품을 스캔하세요' },
  share_promo_subtitle: { fr: "ToxiScan disponible sur l'App Store", en: 'ToxiScan available on the App Store', ko: 'ToxiScan App Store에서 이용 가능' },

  // ===== DAILY FACT =====
  daily_fact_title: { fr: 'Le saviez-vous ?', en: 'Did you know?', ko: '알고 계셨나요?' },

  // ===== CATEGORY LABELS (api.ts) =====
  cat_label_food: { fr: 'Aliment', en: 'Food', ko: '식품' },
  cat_label_beverage: { fr: 'Boisson', en: 'Beverage', ko: '음료' },
  cat_label_kitchen: { fr: 'Ustensile de cuisine', en: 'Kitchen utensil', ko: '주방용품' },
  cat_label_clothing: { fr: 'Vêtement / Textile', en: 'Clothing / Textile', ko: '의류 / 섬유' },
  cat_label_cosmetic: { fr: 'Cosmétique / Hygiène', en: 'Cosmetic / Hygiene', ko: '화장품 / 위생용품' },
  cat_label_household: { fr: 'Produit ménager', en: 'Household product', ko: '생활용품' },
  cat_label_electronics: { fr: 'Électronique', en: 'Electronics', ko: '전자제품' },
  cat_label_furniture: { fr: 'Meuble', en: 'Furniture', ko: '가구' },
  cat_label_toy: { fr: 'Jouet', en: 'Toy', ko: '장난감' },
  cat_label_other: { fr: 'Autre', en: 'Other', ko: '기타' },

  // ===== CONVERSATION =====
  conv_new: { fr: 'Nouvelle discussion', en: 'New conversation', ko: '새 대화' },
  conv_previous: { fr: 'Discussion précédente', en: 'Previous conversation', ko: '이전 대화' },
  conv_scanned: { fr: (name: string, brand: string, verdict: string) => `Tu as scanné ${name}${brand ? ` de ${brand}` : ''}. Ce produit est classé "${verdict}".\n\nQu'est-ce que tu veux savoir sur ce produit ?`, en: (name: string, brand: string, verdict: string) => `You scanned ${name}${brand ? ` by ${brand}` : ''}. This product is classified as "${verdict}".\n\nWhat would you like to know about this product?`, ko: (name: string, brand: string, verdict: string) => `${name}${brand ? ` (${brand})` : ''}을(를) 스캔했어요. 이 제품은 "${verdict}"(으)로 분류됩니다.\n\n이 제품에 대해 무엇이 궁금하세요?` },
  verdict_label_danger: { fr: 'cancérigène', en: 'carcinogenic', ko: '발암성' },
  verdict_label_caution: { fr: 'à éviter', en: 'to avoid', ko: '피해야 함' },
  verdict_label_moderation: { fr: 'à consommer avec modération', en: 'to consume in moderation', ko: '적당히 섭취' },
  verdict_label_approved: { fr: 'approuvé', en: 'approved', ko: '승인됨' },

  // ===== PRODUCT CONTEXT PROMPT =====
  product_context_prompt: { fr: (name: string, brand: string, barcode: string, verdict: string, summary: string) => `\n\n--- CONTEXTE PRODUIT ---\nL'utilisateur a scanné le produit "${name}" (marque: ${brand || 'inconnue'}, code-barres: ${barcode}). Le verdict est: ${verdict}.${summary ? ` Résumé: ${summary}` : ''}\nRéponds en tenant compte de ce produit spécifique.\n`, en: (name: string, brand: string, barcode: string, verdict: string, summary: string) => `\n\n--- PRODUCT CONTEXT ---\nThe user scanned the product "${name}" (brand: ${brand || 'unknown'}, barcode: ${barcode}). The verdict is: ${verdict}.${summary ? ` Summary: ${summary}` : ''}\nRespond considering this specific product.\n`, ko: (name: string, brand: string, barcode: string, verdict: string, summary: string) => `\n\n--- 제품 컨텍스트 ---\n사용자가 "${name}" 제품(브랜드: ${brand || '알 수 없음'}, 바코드: ${barcode})을 스캔했습니다. 판정: ${verdict}.${summary ? ` 요약: ${summary}` : ''}\n이 특정 제품을 고려하여 답변하세요.\n` },

  // ===== VOICE CHAT =====
  speak_now: { fr: 'Parlez maintenant…', en: 'Speak now…', ko: '지금 말하세요…' },
  release_to_send: { fr: 'Relâchez pour envoyer', en: 'Release to send', ko: '놓으면 전송됩니다' },
  transcribing: { fr: 'Transcription en cours…', en: 'Transcribing…', ko: '음성을 변환하는 중…' },
  listen: { fr: 'Écouter', en: 'Listen', ko: '듣기' },
  listening: { fr: 'Lecture…', en: 'Playing…', ko: '재생 중…' },
  mic_error_title: { fr: 'Message vocal', en: 'Voice message', ko: '음성 메시지' },
  mic_permission_msg: { fr: "Active l'accès au micro dans les réglages pour utiliser les messages vocaux.", en: 'Enable microphone access in settings to use voice messages.', ko: '음성 메시지를 사용하려면 설정에서 마이크 접근을 허용하세요.' },
  mic_start_error: { fr: "Impossible de démarrer l'enregistrement. Réessaie.", en: 'Unable to start recording. Try again.', ko: '녹음을 시작할 수 없습니다. 다시 시도하세요.' },
  mic_empty_transcription: { fr: "Je n'ai rien entendu. Maintiens le bouton plus longtemps et parle clairement.", en: "I didn't hear anything. Hold the button longer and speak clearly.", ko: '아무 소리도 들리지 않았어요. 버튼을 더 오래 누르고 또렷하게 말해 주세요.' },
  mic_transcription_error: { fr: "Impossible de transcrire l'audio. Vérifie ta connexion et réessaie.", en: 'Unable to transcribe the audio. Check your connection and try again.', ko: '음성을 변환할 수 없습니다. 연결을 확인하고 다시 시도하세요.' },
  tts_error: { fr: "Impossible de lire la réponse à voix haute pour le moment.", en: 'Unable to read the response aloud right now.', ko: '지금은 답변을 소리 내어 읽을 수 없습니다.' },

  // ===== DR TOXI SYSTEM PROMPT ACKNOWLEDGMENT =====
  drtoxi_ack: { fr: "Compris ! Je suis Dr. Toxi, ton expert en ingrédients du quotidien. Je suis prêt à t'aider.", en: "Got it! I'm Dr. Toxi, your everyday ingredient expert. I'm ready to help you.", ko: '알겠어요! 저는 Dr. Toxi, 당신의 일상 성분 전문가예요. 도와드릴 준비가 됐어요.' },

  // ===== HEALTH PROFILE (DR. TOXI MEMORY) =====
  health_profile_card_title: { fr: 'Mon profil santé', en: 'My health profile', ko: '내 건강 프로필' },
  health_profile_card_empty: { fr: 'Dis à Dr. Toxi qui tu es', en: 'Tell Dr. Toxi who you are', ko: 'Dr. Toxi에게 당신을 알려주세요' },
  health_profile_active: { fr: (n: number) => `${n} info${n > 1 ? 's' : ''} mémorisée${n > 1 ? 's' : ''}`, en: (n: number) => `${n} thing${n > 1 ? 's' : ''} remembered`, ko: (n: number) => `기억된 정보 ${n}개` },
  health_profile_title: { fr: 'Profil santé', en: 'Health profile', ko: '건강 프로필' },
  health_profile_intro: { fr: "Dis à Dr. Toxi qui tu es. Il s'en souviendra pour personnaliser chaque analyse et te proposer les bonnes alternatives.", en: "Tell Dr. Toxi who you are. He'll remember it to personalize every analysis and suggest the right alternatives.", ko: 'Dr. Toxi에게 당신에 대해 알려주세요. 모든 분석을 맞춤화하고 알맞은 대안을 제안하기 위해 기억합니다.' },
  health_profile_section_life: { fr: 'Ta situation', en: 'Your situation', ko: '당신의 상황' },
  health_profile_section_diet: { fr: 'Tes priorités', en: 'Your priorities', ko: '당신의 우선순위' },
  health_profile_note_label: { fr: 'Autre chose à savoir ?', en: 'Anything else?', ko: '더 알려줄 것이 있나요?' },
  health_profile_note_placeholder: { fr: "Ex : je surveille mon cholestérol, j'évite l'huile de palme…", en: 'E.g. I watch my cholesterol, I avoid palm oil…', ko: '예: 콜레스테롤을 관리해요, 팜유를 피해요…' },
  health_profile_privacy: { fr: "Ces informations restent sur ton téléphone et servent uniquement à personnaliser tes analyses.", en: 'This info stays on your phone and is only used to personalize your analysis.', ko: '이 정보는 당신의 휴대폰에만 저장되며 분석을 맞춤화하는 데만 사용됩니다.' },
  health_profile_clear: { fr: 'Tout effacer', en: 'Clear all', ko: '모두 지우기' },
  health_profile_saved: { fr: 'Mémorisé par Dr. Toxi', en: 'Remembered by Dr. Toxi', ko: 'Dr. Toxi가 기억함' },

  // ===== MEAL SCAN — ENTRIES =====
  scan_entry_product_title: { fr: 'Scanner un produit', en: 'Scan a product', ko: '제품 스캔하기' },
  scan_entry_product_desc: { fr: "Étiquette d'un produit emballé", en: 'Label of a packaged product', ko: '포장 제품의 라벨' },
  scan_entry_meal_title: { fr: 'Scanner mon assiette', en: 'Scan my meal', ko: '내 식사 스캔하기' },
  scan_entry_meal_desc: { fr: 'Photo de ton repas → score de santé', en: 'Photo of your meal → health score', ko: '식사 사진 → 건강 점수' },
  scan_section_label: { fr: 'Que veux-tu analyser ?', en: 'What do you want to analyze?', ko: '무엇을 분석할까요?' },
  meal_scans_counter: { fr: (remaining: number, limit: number) => `${remaining}/${limit} scans repas gratuits — Illimité avec Pro`, en: (remaining: number, limit: number) => `${remaining}/${limit} free meal scans — Unlimited with Pro`, ko: (remaining: number, limit: number) => `무료 식사 스캔 ${remaining}/${limit} — Pro로 무제한` },
  meal_scan_unlimited: { fr: 'Scans repas illimités', en: 'Unlimited meal scans', ko: '무제한 식사 스캔' },
  product_scan_free_badge: { fr: 'Gratuit et illimité', en: 'Free and unlimited', ko: '무료 무제한' },
  product_scans_counter: { fr: (remaining: number, limit: number) => `${remaining}/${limit} scans gratuits aujourd'hui — Illimité avec Pro`, en: (remaining: number, limit: number) => `${remaining}/${limit} free scans today — Unlimited with Pro`, ko: (remaining: number, limit: number) => `오늘 무료 스캔 ${remaining}/${limit} — Pro로 무제한` },
  product_scan_unlimited: { fr: 'Scans produits illimités', en: 'Unlimited product scans', ko: '무제한 제품 스캔' },
  product_scan_limit_title: { fr: 'Limite quotidienne atteinte', en: 'Daily limit reached', ko: '오늘 한도 도달' },
  product_scan_limit_msg: { fr: 'Tu as utilisé tes 3 scans produits gratuits du jour. Passe à Pro pour scanner sans limite, ou reviens demain.', en: "You've used your 3 free product scans for today. Go Pro to scan without limits, or come back tomorrow.", ko: '오늘 무료 제품 스캔 3회를 모두 사용했어요. 무제한으로 스캔하려면 Pro로 업그레이드하거나 내일 다시 오세요.' },

  // ===== MEAL SCAN — ANALYSIS / CONFIRM =====
  meal_analyzing_title: { fr: 'Analyse de ton assiette', en: 'Analyzing your meal', ko: '식사를 분석하는 중' },
  meal_analyzing_status_1: { fr: 'Je reconnais les aliments…', en: 'Recognizing the food…', ko: '음식을 인식하는 중…' },
  meal_analyzing_status_2: { fr: 'Je croise avec ma base…', en: 'Cross-checking my database…', ko: '데이터베이스와 대조하는 중…' },
  meal_analyzing_status_3: { fr: 'Je calcule le score de santé…', en: 'Calculating health score…', ko: '건강 점수를 계산하는 중…' },
  meal_confirm_title: { fr: 'Vérifie ton assiette', en: 'Check your meal', ko: '식사를 확인하세요' },
  meal_estimate_hint: { fr: "Estimation basée sur les ingrédients habituels de ce plat. Ajuste si besoin.", en: 'Estimate based on the usual ingredients of this dish. Adjust if needed.', ko: '이 음식의 일반적인 재료를 바탕으로 추정했어요. 필요하면 조정하세요.' },
  meal_add_ingredient: { fr: 'Ajouter un ingrédient', en: 'Add an ingredient', ko: '재료 추가' },
  meal_add: { fr: 'Ajouter', en: 'Add', ko: '추가' },
  meal_ingredient_placeholder: { fr: "Ex. 2 sucres, huile d'olive…", en: 'e.g. 2 sugars, olive oil…', ko: '예: 설탕 2개, 올리브유…' },
  meal_see_result: { fr: 'Voir le résultat', en: 'See the result', ko: '결과 보기' },
  meal_empty_hint: { fr: 'Ajoute au moins un ingrédient pour calculer le score.', en: 'Add at least one ingredient to calculate the score.', ko: '점수를 계산하려면 재료를 하나 이상 추가하세요.' },
  meal_detected_count: { fr: (n: number) => `${n} ingrédient${n !== 1 ? 's' : ''} détecté${n !== 1 ? 's' : ''}`, en: (n: number) => `${n} ingredient${n !== 1 ? 's' : ''} detected`, ko: (n: number) => `재료 ${n}개 감지됨` },
  meal_generating_verdict: { fr: 'Dr. Toxi rédige son verdict…', en: 'Dr. Toxi is writing the verdict…', ko: 'Dr. Toxi가 판정을 작성하는 중…' },
  meal_analysis_failed: { fr: "Impossible d'analyser ce repas. Reprends la photo avec une bonne lumière.", en: 'Unable to analyze this meal. Retake the photo with good lighting.', ko: '이 식사를 분석할 수 없어요. 밝은 곳에서 다시 촬영하세요.' },
  meal_remove_ingredient: { fr: 'Retirer', en: 'Remove', ko: '삭제' },
  meal_dish_name_placeholder: { fr: 'Nom du plat', en: 'Dish name', ko: '음식 이름' },
  meal_dish_name_hint: { fr: "Pas le bon plat ? Corrige le nom, puis re-analyse.", en: 'Wrong dish? Fix the name, then re-analyze.', ko: '음식이 틀렸나요? 이름을 고친 뒤 다시 분석하세요.' },
  meal_reanalyze: { fr: 'Ré-analyser ce plat', en: 'Re-analyze this dish', ko: '이 음식 다시 분석' },
  meal_reanalyzing_title: { fr: 'Je ré-analyse ton plat…', en: 'Re-analyzing your dish…', ko: '음식을 다시 분석하는 중…' },
  meal_reanalyzing_status: { fr: 'Je pars de ta correction…', en: 'Starting from your correction…', ko: '수정한 내용을 반영하는 중…' },
  meal_reanalyze_failed: { fr: 'Impossible de ré-analyser ce plat. Réessaie.', en: "Couldn't re-analyze this dish. Try again.", ko: '이 음식을 다시 분석할 수 없어요. 다시 시도하세요.' },
  meal_edit_ingredient: { fr: 'Modifier cet ingrédient', en: 'Edit this ingredient', ko: '이 재료 수정' },
  meal_save: { fr: 'Enregistrer', en: 'Save', ko: '저장' },

  // ===== MEAL SCAN — TIERS & BADGE =====
  meal_toxicity_level: { fr: 'Score ToxiScan', en: 'ToxiScan score', ko: 'ToxiScan 점수' },
  meal_toxicity_word: { fr: 'Toxicité', en: 'Toxicity', ko: '독성' },
  tier_green: { fr: 'Bon repas', en: 'Good meal', ko: '좋은 식사' },
  tier_yellow: { fr: 'Moyen', en: 'Moderate', ko: '보통' },
  tier_orange: { fr: 'Toxique', en: 'Toxic', ko: '유해함' },
  tier_red: { fr: 'Très toxique', en: 'Very toxic', ko: '매우 유해함' },
  tier_green_sub: { fr: 'Continue comme ça', en: 'Keep it up', ko: '이대로 유지하세요' },
  tier_yellow_sub: { fr: "À s'offrir à l'occasion", en: 'Fine once in a while', ko: '가끔은 괜찮아요' },
  tier_orange_sub: { fr: 'Trouve mieux la prochaine fois', en: 'Find better next time', ko: '다음엔 더 나은 선택을' },
  tier_red_sub: { fr: 'À éviter', en: 'Best avoided', ko: '피하는 게 좋아요' },

  // ===== MEAL SCAN — INGREDIENT CATEGORIES =====
  mcat_carcinogen: { fr: 'Cancérigène', en: 'Carcinogenic', ko: '발암성' },
  mcat_processed: { fr: 'Ultra-transformé', en: 'Ultra-processed', ko: '초가공' },
  mcat_added_sugar: { fr: 'Sucre ajouté', en: 'Added sugar', ko: '첨가당' },
  mcat_refined_oil: { fr: 'Huile raffinée', en: 'Refined oil', ko: '정제유' },
  mcat_refined_flour: { fr: 'Farine raffinée', en: 'Refined flour', ko: '정제 밀가루' },
  mcat_excess_salt: { fr: 'Excès de sel', en: 'Excess salt', ko: '나트륨 과다' },
  mcat_additive: { fr: 'Additif', en: 'Additive', ko: '첨가물' },
  mcat_healthy: { fr: 'Sain', en: 'Healthy', ko: '건강함' },
  mcat_neutral: { fr: 'Neutre', en: 'Neutral', ko: '중립' },
  meal_grave_tag: { fr: 'GRAVE', en: 'SERIOUS', ko: '심각' },

  // ===== MEAL SCAN — RESULT =====
  meal_verdict_eyebrow: { fr: 'VERDICT DR. TOXI', en: 'DR. TOXI VERDICT', ko: 'DR. TOXI 판정' },
  meal_ingredients_title: { fr: 'Décortiqué, ingrédient par ingrédient', en: 'Broken down, ingredient by ingredient', ko: '재료별 상세 분석' },
  meal_alt_title: { fr: 'Des alternatives qui font envie', en: 'Alternatives worth craving', ko: '구미 당기는 대안' },
  meal_alt_home: { fr: 'À cuisiner maison', en: 'Cook at home', ko: '집에서 요리하기' },
  meal_alt_restaurant: { fr: 'Au restaurant', en: 'At a restaurant', ko: '식당에서' },
  meal_share_result: { fr: 'Partager ce repas', en: 'Share this meal', ko: '이 식사 공유하기' },
  meal_scanned_at: { fr: 'Repas analysé', en: 'Meal analyzed', ko: '분석한 식사' },
  meal_not_found: { fr: 'Repas introuvable', en: 'Meal not found', ko: '식사를 찾을 수 없음' },

  // ===== MEAL SCAN — DASHBOARD / WEEKLY REPORT =====
  meal_dashboard_title: { fr: 'Mon assiette cette semaine', en: 'My plate this week', ko: '이번 주 내 식사' },
  weekly_report_title: { fr: 'Rapport de la semaine', en: 'Weekly report', ko: '주간 리포트' },
  weekly_score_label: { fr: 'Score ToxiScan moyen', en: 'Average ToxiScan score', ko: '평균 ToxiScan 점수' },
  weekly_meals_scanned: { fr: (n: number) => `${n} repas scanné${n !== 1 ? 's' : ''} cette semaine`, en: (n: number) => `${n} meal${n !== 1 ? 's' : ''} scanned this week`, ko: (n: number) => `이번 주 ${n}개 식사 스캔` },
  weekly_no_meals: { fr: 'Aucun repas scanné cette semaine', en: 'No meals scanned this week', ko: '이번 주 스캔한 식사가 없어요' },
  weekly_no_meals_hint: { fr: 'Scanne ton premier repas pour voir ton bilan apparaître ici, en direct.', en: 'Scan your first meal to watch your report build here, live.', ko: '첫 식사를 스캔하면 이곳에 요약이 실시간으로 채워져요.' },
  weekly_distribution: { fr: 'Répartition des repas', en: 'Meal breakdown', ko: '식사 분포' },
  weekly_trend_up: { fr: (pct: number) => `+${pct}% de repas sains vs la semaine dernière`, en: (pct: number) => `+${pct}% healthy meals vs last week`, ko: (pct: number) => `지난주 대비 건강한 식사 +${pct}%` },
  weekly_trend_down: { fr: (pct: number) => `−${pct}% de repas sains vs la semaine dernière`, en: (pct: number) => `−${pct}% healthy meals vs last week`, ko: (pct: number) => `지난주 대비 건강한 식사 −${pct}%` },
  weekly_trend_flat: { fr: 'Stable par rapport à la semaine dernière', en: 'Steady compared to last week', ko: '지난주와 비슷해요' },
  weekly_trend_first: { fr: 'Ta première semaine — continue de scanner !', en: 'Your first week — keep scanning!', ko: '첫 주예요 — 계속 스캔해 보세요!' },
  weekly_problem_ingredient: { fr: 'Le grand coupable de la semaine', en: 'Problem ingredient of the week', ko: '이번 주 문제 재료' },
  weekly_problem_detected: { fr: (name: string, n: number) => `${name} — détecté ${n} fois`, en: (name: string, n: number) => `${name} — detected ${n} times`, ko: (name: string, n: number) => `${name} — ${n}회 검출` },
  weekly_best_meal: { fr: 'Meilleur repas', en: 'Best meal', ko: '최고의 식사' },
  weekly_worst_meal: { fr: 'Repas le plus toxique', en: 'Most toxic meal', ko: '가장 유해한 식사' },
  weekly_end_good: { fr: "Bravo, continue dans cette lancée — ta santé s'améliore.", en: 'Well done — keep this up and your health keeps improving.', ko: '잘하고 있어요 — 이대로 유지하면 건강이 계속 좋아져요.' },
  weekly_end_improve: { fr: 'La semaine prochaine, vise un repas sain de plus. Petit pas, grand effet.', en: 'Next week, aim for one more healthy meal. Small step, big effect.', ko: '다음 주엔 건강한 식사 한 끼만 더 해봐요. 작은 변화가 큰 차이를 만들어요.' },
  weekly_view_full: { fr: 'Voir le rapport complet', en: 'See the full report', ko: '전체 리포트 보기' },
  weekly_dr_intro_label: { fr: 'Le mot de Dr. Toxi', en: 'A word from Dr. Toxi', ko: 'Dr. Toxi의 한마디' },
  weekly_locked_title: { fr: 'La suite de ton histoire', en: 'The rest of your story', ko: '당신의 이야기, 그 다음' },
  weekly_locked_trend: { fr: 'Ta tendance, semaine après semaine', en: 'Your trend, week after week', ko: '주마다 이어지는 추세' },
  weekly_locked_reco: { fr: 'Les recommandations de Dr. Toxi', en: "Dr. Toxi's recommendations", ko: 'Dr. Toxi의 맞춤 추천' },
  weekly_locked_report: { fr: 'Le bilan complet du vendredi', en: 'The full Friday report', ko: '금요일 전체 리포트' },
  weekly_locked_cta_data: { fr: (name: string, n: number) => `Tu as déjà détecté ${name} ${n} fois cette semaine. Continue à scanner et découvre ton bilan complet du vendredi + comment Dr. Toxi t'aide à t'améliorer.`, en: (name: string, n: number) => `You've already spotted ${name} ${n} times this week. Keep scanning and unlock your full Friday report + how Dr. Toxi helps you improve.`, ko: (name: string, n: number) => `이번 주에 벌써 ${name}을(를) ${n}번 발견했어요. 계속 스캔하면 금요일 전체 리포트와 Dr. Toxi의 개선 코칭을 받을 수 있어요.` },
  weekly_locked_cta_generic: { fr: 'Continue à scanner et découvre ton bilan complet du vendredi + comment Dr. Toxi t\'aide à mieux manger.', en: 'Keep scanning and unlock your full Friday report + how Dr. Toxi helps you eat better.', ko: '계속 스캔하면 금요일 전체 리포트와 Dr. Toxi의 식습관 코칭을 받을 수 있어요.' },
  weekly_free_trial: { fr: 'Essai gratuit 7 jours', en: '7-day free trial', ko: '7일 무료 체험' },
  weekly_meals_label: { fr: 'repas', en: 'meals', ko: '식사' },
  weekly_avg_short: { fr: 'moy.', en: 'avg', ko: '평균' },

  // ===== MEAL SCAN — NOTIFICATIONS =====
  notif_morning_title: { fr: 'Et au petit-déjeuner ?', en: 'How about breakfast?', ko: '아침 식사는 어떤가요?' },
  notif_morning_body: { fr: 'Scanne ton repas du matin et découvre son score de santé.', en: 'Scan your morning meal and discover its health score.', ko: '아침 식사를 스캔하고 건강 점수를 확인해 보세요.' },
  notif_noon_title: { fr: "C'est l'heure du midi", en: 'Lunchtime', ko: '점심 시간이에요' },
  notif_noon_body: { fr: 'Scanne ton assiette et découvre son score de santé.', en: 'Scan your meal and discover its health score.', ko: '식사를 스캔하고 건강 점수를 확인해 보세요.' },
  notif_evening_title: { fr: 'Et ce soir, dans ton assiette ?', en: "What's on your plate tonight?", ko: '오늘 저녁 식사는 어떤가요?' },
  notif_evening_body: { fr: 'Un scan rapide et Dr. Toxi te donne son verdict.', en: 'A quick scan and Dr. Toxi gives you the verdict.', ko: '빠르게 스캔하면 Dr. Toxi가 판정해 드려요.' },
  notif_friday_title: { fr: 'Ton rapport de la semaine est prêt', en: 'Your weekly report is ready', ko: '주간 리포트가 준비됐어요' },
  notif_friday_body: { fr: 'Découvre ton score de santé et le bilan de tes repas.', en: 'See your health score and your meal summary.', ko: '이번 주 건강 점수와 식사 요약을 확인하세요.' },

  // ===== MEAL SCAN — PAYWALL =====
  paywall_meal: { fr: 'Scanne tes repas sans limite', en: 'Scan your meals without limits', ko: '식사를 무제한으로 스캔하세요' },
  paywall_sub_meal: { fr: 'Tu as utilisé tes 3 scans repas gratuits. Passe à Pro pour analyser chaque repas.', en: "You've used your 3 free meal scans. Go Pro to analyze every meal.", ko: '무료 식사 스캔 3회를 모두 사용했어요. Pro로 모든 식사를 분석하세요.' },
  paywall_report: { fr: 'Ton bilan complet t’attend', en: 'Your full report awaits', ko: '전체 리포트가 기다려요' },
  paywall_sub_report: { fr: 'Rapport hebdo complet, tendance et recommandations de Dr. Toxi.', en: 'Full weekly report, trend and Dr. Toxi recommendations.', ko: '주간 전체 리포트, 추세, Dr. Toxi 맞춤 추천.' },
  benefit_unlimited_meal_scans: { fr: 'Scans repas illimités', en: 'Unlimited meal scans', ko: '무제한 식사 스캔' },
  benefit_unlimited_product_scans: { fr: 'Scans de produits illimités', en: 'Unlimited product scans', ko: '무제한 제품 스캔' },
  benefit_weekly_report: { fr: 'Rapport hebdo complet + tendance', en: 'Full weekly report + trend', ko: '주간 전체 리포트 + 추세' },
  benefit_recommendations: { fr: 'Recommandations personnalisées', en: 'Personalized recommendations', ko: '맞춤 추천' },

  // ===== MEAL ONBOARDING — PRESENTATION =====
  mob_continue: { fr: 'Continuer', en: 'Continue', ko: '계속하기' },
  mob_get_started: { fr: 'Commencer', en: 'Get started', ko: '시작하기' },
  mob_1_eyebrow: { fr: 'NOUVEAU', en: 'NEW', ko: '새 기능' },
  mob_1_title: { fr: 'Scanne ton assiette', en: 'Scan your meal', ko: '내 식사를 스캔하세요' },
  mob_1_body: { fr: 'Photographie ton repas. Dr. Toxi reconnaît les ingrédients et donne un score de santé sur 10.', en: 'Photograph your meal. Dr. Toxi recognizes the ingredients and gives a health score out of 10.', ko: '식사를 촬영하면 Dr. Toxi가 재료를 인식해 10점 만점으로 건강 점수를 알려드려요.' },
  mob_1_tiers_label: { fr: "Du vert au rouge, en un coup d'œil", en: 'From green to red, at a glance', ko: '초록부터 빨강까지, 한눈에' },
  mob_2_title: { fr: 'Il décortique ton repas', en: 'It breaks down your meal', ko: '식사를 낱낱이 분석해요' },
  mob_2_body: { fr: "Ingrédient par ingrédient — ce qui est sain, ce qui l'est moins — puis des alternatives plus saines quand c'est utile.", en: "Ingredient by ingredient — what's healthy, what's not — then healthier alternatives when it helps.", ko: '재료 하나하나 무엇이 건강하고 무엇이 아닌지 짚어주고, 필요할 땐 더 건강한 대안도 제안해요.' },
  mob_2_alt_label: { fr: 'Alternative plus saine', en: 'Healthier alternative', ko: '더 건강한 대안' },
  mob_3_title: { fr: 'Ton bilan de la semaine', en: 'Your weekly report', ko: '주간 리포트' },
  mob_3_body: { fr: 'Retrouve la synthèse de tes repas dans ton profil — elle se construit en direct à chaque scan.', en: 'Find your meal summary in your profile — it builds live with every scan.', ko: '프로필에서 식사 요약을 확인하세요. 스캔할 때마다 실시간으로 채워집니다.' },
  mob_3_dashboard_label: { fr: 'Cette semaine', en: 'This week', ko: '이번 주' },

  // ===== MEAL ONBOARDING — NOTIFICATIONS =====
  mob_notif_title: { fr: 'Reste sur la bonne voie', en: 'Stay on track', ko: '꾸준함을 이어가세요' },
  mob_notif_body: { fr: "Active des rappels pour penser à scanner tes repas, et reçois ton bilan santé chaque vendredi. Tu choisis les moments — rien n'est imposé.", en: 'Turn on reminders so you remember to scan your meals, and get your health report every Friday. You pick the moments — nothing is forced.', ko: '식사 스캔을 잊지 않도록 알림을 켜고, 매주 금요일 건강 리포트를 받아보세요. 시간은 직접 정하며 강제되는 것은 없습니다.' },
  mob_notif_reminders_label: { fr: 'RAPPELS DE REPAS', en: 'MEAL REMINDERS', ko: '식사 알림' },
  mob_notif_friday_note: { fr: 'Ton bilan hebdo arrive chaque vendredi à 21h, tant que les notifications sont activées.', en: 'Your weekly report arrives every Friday at 9 PM, as long as notifications are on.', ko: '알림이 켜져 있는 동안 매주 금요일 오후 9시에 주간 리포트가 도착합니다.' },
  mob_notif_enable: { fr: 'Activer les rappels', en: 'Turn on reminders', ko: '알림 켜기' },
  mob_notif_later: { fr: 'Plus tard', en: 'Maybe later', ko: '나중에 하기' },
  mob_notif_settings_hint: { fr: 'Tu pourras tout modifier plus tard dans ton profil.', en: 'You can change all of this later in your profile.', ko: '이 설정은 나중에 프로필에서 언제든 변경할 수 있어요.' },
  mob_notif_denied_title: { fr: 'Notifications désactivées', en: 'Notifications off', ko: '알림이 꺼져 있어요' },
  mob_notif_denied_msg: { fr: "Tu peux les activer quand tu veux depuis les réglages de ton appareil, puis dans ton profil.", en: 'You can enable them anytime from your device settings, then in your profile.', ko: '기기 설정에서 언제든 켤 수 있으며, 이후 프로필에서 조정할 수 있어요.' },

  // ===== MEAL REMINDERS — SLOTS & TIME PICKER =====
  reminder_morning: { fr: 'Repas du matin', en: 'Morning meal', ko: '아침 식사' },
  reminder_noon: { fr: 'Repas du midi', en: 'Midday meal', ko: '점심 식사' },
  reminder_evening: { fr: 'Repas du soir', en: 'Evening meal', ko: '저녁 식사' },
  time_picker_title: { fr: "Choisis l'heure", en: 'Choose the time', ko: '시간 선택' },
  time_hours: { fr: 'Heure', en: 'Hour', ko: '시' },
  time_minutes: { fr: 'Minute', en: 'Minute', ko: '분' },
  confirm: { fr: 'Confirmer', en: 'Confirm', ko: '확인' },

  // ===== MEAL REMINDERS — SETTINGS SCREEN =====
  meal_reminders_title: { fr: 'Rappels de repas', en: 'Meal reminders', ko: '식사 알림' },
  meal_reminders_intro: { fr: 'Choisis quand Dr. Toxi te rappelle de scanner tes repas. Tu peux tout désactiver à tout moment.', en: 'Choose when Dr. Toxi reminds you to scan your meals. You can turn everything off anytime.', ko: 'Dr. Toxi가 식사 스캔을 언제 알려줄지 정하세요. 언제든 모두 끌 수 있어요.' },
  meal_reminders_master: { fr: 'Notifications', en: 'Notifications', ko: '알림' },
  meal_reminders_master_desc: { fr: 'Rappels de repas et bilan du vendredi', en: 'Meal reminders and Friday report', ko: '식사 알림 및 금요일 리포트' },
  meal_reminders_friday_title: { fr: 'Rapport du vendredi', en: 'Friday report', ko: '금요일 리포트' },
  meal_reminders_friday_desc: { fr: 'Ton bilan santé hebdo, chaque vendredi à 21h', en: 'Your weekly health report, every Friday at 9 PM', ko: '매주 금요일 오후 9시, 주간 건강 리포트' },
  meal_reminders_off_note: { fr: 'Active les notifications pour choisir tes rappels de repas.', en: 'Turn on notifications to choose your meal reminders.', ko: '알림을 켜면 식사 알림을 설정할 수 있어요.' },
  profile_reminders_label: { fr: 'Rappels de repas', en: 'Meal reminders', ko: '식사 알림' },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey): string {
  const lang = getDeviceLanguage();
  const entry = translations[key] as Record<Lang, unknown> | undefined;
  if (!entry) {
    console.warn('[i18n] Missing key:', key);
    return key;
  }
  const val = entry[lang] ?? entry.en ?? entry.fr;
  if (typeof val === 'function') {
    return key;
  }
  return val as string;
}

export function tf<A extends unknown[]>(key: TranslationKey, ...args: A): string {
  const lang = getDeviceLanguage();
  const entry = translations[key] as Record<Lang, unknown> | undefined;
  if (!entry) {
    console.warn('[i18n] Missing key:', key);
    return key;
  }
  const val = entry[lang] ?? entry.en ?? entry.fr;
  if (typeof val === 'function') {
    return (val as unknown as (...a: A) => string)(...args);
  }
  return val as string;
}

export function isEnglish(): boolean {
  return getDeviceLanguage() === 'en';
}

export function isKorean(): boolean {
  return getDeviceLanguage() === 'ko';
}

/**
 * Three-way language picker for inline strings outside the translations table.
 * Korean falls back to English, then French, if a value is omitted.
 */
export function pick<T>(opts: { fr: T; en: T; ko?: T }): T {
  const lang = getDeviceLanguage();
  if (lang === 'ko') return (opts.ko ?? opts.en) as T;
  if (lang === 'en') return opts.en;
  return opts.fr;
}

export function getDateLocale(): string {
  const lang = getDeviceLanguage();
  if (lang === 'en') return 'en-US';
  if (lang === 'ko') return 'ko-KR';
  return 'fr-FR';
}
