// lib/block-categories.js
// Catégories de blocs + config des champs adaptatifs
// Utilisé dans CheckoutModal (avant paiement) et Dashboard (après)

export const CATEGORIES = [
  {
    id: 'video',
    label: 'Vidéo',
    icon: '▶',
    color: '#e53935',
    desc: 'YouTube, TikTok, Reels, clip…',
    fields: ['title', 'url', 'slogan', 'colors'],
    urlLabel: 'LIEN DE LA VIDÉO',
    urlPlaceholder: 'https://youtube.com/watch?v=…',
    urlHint: 'YouTube, TikTok, Vimeo, Twitch…',
    showImage: false,
  },
  {
    id: 'image',
    label: 'Image',
    icon: '◻',
    color: '#8e24aa',
    desc: 'Photo, illustration, bannière…',
    fields: ['title', 'image_url', 'url', 'slogan', 'colors'],
    urlLabel: 'LIEN DE DESTINATION',
    urlPlaceholder: 'https://votresite.com',
    urlHint: 'Où l\'utilisateur atterrit en cliquant',
    showImage: true,
  },
  {
    id: 'link',
    label: 'Lien',
    icon: '⌖',
    color: '#1e88e5',
    desc: 'Site web, blog, portfolio…',
    fields: ['title', 'url', 'slogan', 'colors'],
    urlLabel: 'URL DE DESTINATION',
    urlPlaceholder: 'https://votresite.com',
    urlHint: 'Lien vers votre site, portfolio, page…',
    showImage: false,
  },
  {
    id: 'social',
    label: 'Réseaux',
    icon: '⊕',
    color: '#00acc1',
    desc: 'Instagram, TikTok, X, LinkedIn…',
    fields: ['title', 'social_network', 'url', 'slogan'],
    urlLabel: 'LIEN DU PROFIL',
    urlPlaceholder: 'https://instagram.com/votrenom',
    urlHint: 'Lien direct vers votre profil',
    showImage: false,
    showSocialPicker: true,
  },
  {
    id: 'music',
    label: 'Musique',
    icon: '♪',
    color: '#1ed760',
    desc: 'Spotify, SoundCloud, Apple Music…',
    fields: ['title', 'music_platform', 'url', 'slogan'],
    urlLabel: 'LIEN D\'ÉCOUTE',
    urlPlaceholder: 'https://open.spotify.com/…',
    urlHint: 'Spotify, Apple Music, SoundCloud, Deezer…',
    showImage: false,
    showMusicPicker: true,
  },
  {
    id: 'app',
    label: 'App',
    icon: '⬡',
    color: '#43a047',
    desc: 'App Store, Google Play, PWA…',
    fields: ['title', 'app_store', 'url', 'slogan', 'colors'],
    urlLabel: 'LIEN DE L\'APP',
    urlPlaceholder: 'https://apps.apple.com/…',
    urlHint: 'App Store, Google Play, ou site web',
    showImage: true,
    showAppPicker: true,
  },
  {
    id: 'brand',
    label: 'Marque',
    icon: '⬟',
    color: '#f0b429',
    desc: 'Logo, identité visuelle, campagne…',
    fields: ['title', 'image_url', 'url', 'slogan', 'colors'],
    urlLabel: 'SITE DE LA MARQUE',
    urlPlaceholder: 'https://votresmarque.com',
    urlHint: 'Page d\'accueil ou page campagne',
    showImage: true,
  },
  {
    id: 'clothing',
    label: 'Vêtements',
    icon: '◎',
    color: '#f4511e',
    desc: 'Mode, streetwear, collection…',
    fields: ['title', 'image_url', 'url', 'slogan', 'colors'],
    urlLabel: 'LIEN DE LA COLLECTION',
    urlPlaceholder: 'https://votreboutique.com',
    urlHint: 'Page produit, collection ou boutique',
    showImage: true,
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    icon: '❋',
    color: '#00bfa5',
    desc: 'Voyage, food, wellness, sport…',
    fields: ['title', 'image_url', 'url', 'slogan', 'colors'],
    urlLabel: 'LIEN DE DESTINATION',
    urlPlaceholder: 'https://votrecontenu.com',
    urlHint: 'Blog, compte, site, réservation…',
    showImage: true,
  },
  {
    id: 'text',
    label: 'Publication',
    icon: '≡',
    color: '#90a4ae',
    desc: 'Article, newsletter, annonce…',
    fields: ['title', 'url', 'slogan', 'colors'],
    urlLabel: 'LIEN DE L\'ARTICLE',
    urlPlaceholder: 'https://medium.com/…',
    urlHint: 'Article, newsletter, post LinkedIn…',
    showImage: false,
  },
];

export const SOCIAL_NETWORKS = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c', emoji: '📸' },
  { id: 'tiktok',    label: 'TikTok',    color: '#69c9d0', emoji: '🎵' },
  { id: 'x',         label: 'X / Twitter', color: '#1d9bf0', emoji: '✕' },
  { id: 'youtube',   label: 'YouTube',   color: '#ff0000', emoji: '▶' },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0a66c2', emoji: '💼' },
  { id: 'snapchat',  label: 'Snapchat',  color: '#fffc00', emoji: '👻' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146ff', emoji: '🎮' },
  { id: 'pinterest', label: 'Pinterest', color: '#e60023', emoji: '📌' },
  { id: 'facebook',  label: 'Facebook',  color: '#0082fb', emoji: '👍' },
  { id: 'discord',   label: 'Discord',   color: '#5865f2', emoji: '💬' },
];

export const MUSIC_PLATFORMS = [
  { id: 'spotify',     label: 'Spotify',      color: '#1ed760', emoji: '🎵' },
  { id: 'apple_music', label: 'Apple Music',  color: '#fc3c44', emoji: '🍎' },
  { id: 'soundcloud',  label: 'SoundCloud',   color: '#ff5500', emoji: '☁' },
  { id: 'deezer',      label: 'Deezer',       color: '#a238ff', emoji: '🎶' },
  { id: 'youtube_music', label: 'YT Music',   color: '#ff0000', emoji: '▶' },
  { id: 'bandcamp',    label: 'Bandcamp',     color: '#1da0c3', emoji: '🎸' },
];

export const APP_STORES = [
  { id: 'app_store',    label: 'App Store',      color: '#007aff', emoji: '🍎' },
  { id: 'google_play',  label: 'Google Play',    color: '#01875f', emoji: '▶' },
  { id: 'web',          label: 'Site web / PWA', color: '#6366f1', emoji: '🌐' },
];

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[2]; // default: lien
}

// Construire un objet booking depuis le form de catégorie
export function buildBookingContent(categoryId, formData) {
  const cat = getCategoryById(categoryId);
  const network = SOCIAL_NETWORKS.find(n => n.id === formData.social_network);
  const platform = MUSIC_PLATFORMS.find(p => p.id === formData.music_platform);
  const appStore = APP_STORES.find(a => a.id === formData.app_store);

  // Couleur principale selon la catégorie ou le réseau sélectionné
  const primaryColor = formData.primary_color
    || network?.color
    || platform?.color
    || appStore?.color
    || cat.color;

  return {
    content_type: categoryId,
    display_name: formData.title || '',
    slogan: formData.slogan || '',
    logo_initials: (formData.title || '??').substring(0, 2).toUpperCase(),
    cta_url: formData.url || '',
    cta_text: formData.cta_text || 'Visiter',
    image_url: formData.image_url || '',
    primary_color: primaryColor,
    background_color: formData.background_color || '#0d1828',
    badge: cat.label.toUpperCase(),
    // Métadonnées extras stockées dans slogan si besoin
    _network: formData.social_network || null,
    _platform: formData.music_platform || null,
    _app_store: formData.app_store || null,
  };
}
