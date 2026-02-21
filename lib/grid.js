// lib/grid.js — Grid structure, tiers, pricing (source of truth)

export const GRID_COLS = 37;
export const GRID_ROWS = 37;
export const CENTER_X = 18;
export const CENTER_Y = 18;
export const TOTAL_SLOTS = GRID_COLS * GRID_ROWS; // 1369

const CORNER_POSITIONS = new Set(['0-0', '36-0', '0-36', '36-36']);

export function getTier(x, y) {
  if (CORNER_POSITIONS.has(`${x}-${y}`)) return 'corner_ten';
  const dx = Math.abs(x - CENTER_X);
  const dy = Math.abs(y - CENTER_Y);
  const dist = Math.max(dx, dy);
  if (dist === 0) return 'one';
  if (dist <= 3) return 'ten';
  if (dist <= 11) return 'hundred';
  return 'thousand';
}

export function isCorner(x, y) {
  return CORNER_POSITIONS.has(`${x}-${y}`);
}

// Visual size of each tier block in pixels
export const TIER_SIZE = {
  one: 120,
  ten: 52,
  corner_ten: 52,
  hundred: 26,
  thousand: 11,
};

// Color per tier
export const TIER_COLOR = {
  one: '#f0b429',
  ten: '#ff4d8f',
  corner_ten: '#f0b429',
  hundred: '#00d9f5',
  thousand: '#00e8a2',
};

// Display labels
export const TIER_LABEL = {
  one: 'ÉPICENTRE',
  ten: 'PRESTIGE',
  corner_ten: 'CORNER',
  hundred: 'BUSINESS',
  thousand: 'VIRAL',
};

// Price in €/day
export const TIER_PRICE = {
  one: 1000,
  ten: 100,
  corner_ten: 100,
  hundred: 10,
  thousand: 1,
};

// ─── Launch availability — flip to true to unlock each tier ──
// Modifier ici uniquement pour ouvrir un nouveau tier.
export const TIER_AVAILABLE = {
  thousand:   true,   // VIRAL — 1€/j  → OUVERT au lancement
  hundred:    false,  // BUSINESS — 10€/j  → Prochainement
  ten:        false,  // PRESTIGE — 100€/j → Prochainement
  corner_ten: false,  // CORNER — 100€/j  → Prochainement
  one:        false,  // ÉPICENTRE — 1000€/j → Prochainement
};

export function isTierAvailable(tier) {
  return TIER_AVAILABLE[tier] ?? false;
}

// Advertiser profiles
export const PROFILES = [
  { id: 'creator', icon: '🎨', label: 'Créateur', desc: 'TikTok, YouTube, Insta, portfolio…', color: '#00e8a2', blocs: 'VIRAL dès 1€/j' },
  { id: 'freelance', icon: '🧾', label: 'Auto-entrepreneur', desc: 'Freelance, coach, artisan, commerce', color: '#00d9f5', blocs: 'BUSINESS dès 10€/j' },
  { id: 'brand', icon: '🏢', label: 'Marque', desc: 'PME, startup, agence, grande marque', color: '#f0b429', blocs: 'PRESTIGE dès 100€/j' },
];

// Design tokens
export const D = {
  bg: '#020609',
  s1: '#060c16',
  s2: '#0a1222',
  card: '#0d1828',
  bord: 'rgba(255,255,255,0.055)',
  bord2: 'rgba(255,255,255,0.11)',
  txt: '#dde8ff',
  muted: 'rgba(185,205,255,0.48)',
  faint: 'rgba(255,255,255,0.04)',
  cyan: '#00d9f5',
  violet: '#9d7dff',
  gold: '#f0b429',
  rose: '#ff4d8f',
  mint: '#00e8a2',
  red: '#ff4455',
  blue: '#4499ff',
};

export const FF = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans',sans-serif",
};

/**
 * Build the structural grid (positions + tiers).
 * This is deterministic — no DB needed.
 * Returns 1369 slot objects with {x, y, tier, id, corner}
 */
export function buildStructuralGrid() {
  const slots = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      slots.push({
        x,
        y,
        tier: getTier(x, y),
        id: `${x}-${y}`,
        corner: isCorner(x, y),
      });
    }
  }
  return slots;
}

/**
 * Merge Supabase active_slots data onto the structural grid.
 * Each slot gets: occ (boolean), tenant (creative data or null), hot (boolean)
 */
export function mergeGridWithBookings(structuralGrid, activeSlots) {
  // Index bookings by "x-y"
  const bookingMap = new Map();
  for (const row of activeSlots) {
    if (row.is_occupied) {
      bookingMap.set(`${row.x}-${row.y}`, {
        l: row.logo_initials || '??',
        t: row.content_type || 'text',
        c: row.primary_color || '#00d9f5',
        b: row.background_color || '#0d1828',
        name: row.display_name || '',
        slogan: row.slogan || '',
        url: row.cta_url || '#',
        cta: row.cta_text || 'Visiter',
        img: row.image_url || '',
        badge: row.badge || '',
        bookingId: row.booking_id,
        advertiserId: row.advertiser_id,
        social: row.social_network || '',
        music: row.music_platform || '',
        appStore: row.app_store || '',
        boosted: !!row.is_boosted,
        description: row.description || '',
        // Réseaux sociaux du profil annonceur (cliquables dans le popup)
        instagramUrl: row.instagram_url || '',
        tiktokUrl:    row.tiktok_url    || '',
        twitterUrl:   row.twitter_url   || '',
        youtubeUrl:   row.youtube_url   || '',
        linkedinUrl:  row.linkedin_url  || '',
      });
    }
  }

  return structuralGrid.map(slot => {
    const tenant = bookingMap.get(slot.id) || null;
    return {
      ...slot,
      occ: !!tenant,
      tenant,
      hot: false, // Real "hot" logic can be based on recency later
    };
  });
}

/**
 * Legacy: build the demo grid with fake data (seed 42).
 * Used as fallback when Supabase is not configured.
 */
const DEMO_TENANTS = [
  { l: 'NK', t: 'image', c: '#ff6b35', b: '#160800', name: 'NikeKicks Studio', slogan: 'Just Do It — Air Max 2025', url: 'https://nike.com', cta: 'Voir la collection', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', badge: 'MARQUE' },
  { l: 'SV', t: 'link', c: '#c5d3e8', b: '#08121e', name: 'SaaS Vision', slogan: 'Automatisez votre croissance B2B', url: 'https://example.com', cta: 'Essai 14 jours', img: '', badge: 'FREELANCE' },
  { l: 'SP', t: 'video', c: '#1ed760', b: '#001409', name: 'Spotify Ads', slogan: 'Faites entendre votre marque', url: 'https://spotify.com', cta: 'Lancer une campagne', img: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&q=80', badge: 'MARQUE' },
  { l: 'TS', t: 'video', c: '#e31937', b: '#100002', name: 'TechStream TV', slogan: 'Le streaming tech — 24h/24', url: 'https://example.com', cta: 'Regarder', img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80', badge: 'CRÉATEUR' },
  { l: 'AZ', t: 'link', c: '#ff9900', b: '#110800', name: 'Amazon Business', slogan: 'Pro pricing. Free shipping.', url: 'https://amazon.com', cta: 'Créer un compte Pro', img: '', badge: 'MARQUE' },
  { l: 'NF', t: 'video', c: '#e50914', b: '#0e0000', name: 'Netflix Originals', slogan: 'Des histoires qui vous transportent', url: 'https://netflix.com', cta: 'Voir les nouveautés', img: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80', badge: 'MARQUE' },
  { l: 'GG', t: 'brand', c: '#4285f4', b: '#000b1e', name: 'Google Workspace', slogan: 'Travaillez ensemble, partout', url: 'https://workspace.google.com', cta: 'Démarrer', img: '', badge: 'MARQUE' },
  { l: 'AB', t: 'image', c: '#ff5a5f', b: '#110002', name: 'Airbnb', slogan: 'Vivez comme un local', url: 'https://airbnb.com', cta: 'Explorer', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', badge: 'MARQUE' },
  { l: 'MT', t: 'link', c: '#0082fb', b: '#000b1e', name: 'Meta Ads', slogan: 'Votre audience, vos règles', url: 'https://facebook.com/business', cta: 'Créer une annonce', img: '', badge: 'MARQUE' },
  { l: 'SN', t: 'image', c: '#fffc00', b: '#111100', name: 'Snapchat', slogan: 'Stories 360°', url: 'https://snapchat.com', cta: 'Ouvrir Snapchat', img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80', badge: 'CRÉATEUR' },
  { l: 'TW', t: 'text', c: '#1d9bf0', b: '#000e1c', name: 'X Premium+', slogan: 'La conversation évolue', url: 'https://x.com/premium', cta: 'Passer Premium', img: '', badge: 'CRÉATEUR' },
  { l: 'LI', t: 'brand', c: '#0a66c2', b: '#000c1a', name: 'LinkedIn Talent', slogan: 'Recrutez les meilleurs', url: 'https://linkedin.com', cta: 'Publier une offre', img: '', badge: 'FREELANCE' },
];

function rng(s) {
  let v = s;
  return () => {
    v = (v * 1664525 + 1013904223) & 0xffffffff;
    return (v >>> 0) / 0xffffffff;
  };
}

export function buildDemoGrid() {
  const r = rng(42);
  const structural = buildStructuralGrid();
  const canonical = {};

  for (let y = 0; y <= CENTER_Y; y++) {
    for (let x = 0; x <= CENTER_X; x++) {
      const tier = getTier(x, y);
      const occChance = { one: 0.99, ten: 0.80, corner_ten: 0.99, hundred: 0.82, thousand: 0.88 }[tier];
      const occ = r() < occChance;
      canonical[`${x}-${y}`] = {
        occ,
        tenantIdx: occ ? Math.floor(r() * DEMO_TENANTS.length) : -1,
        hot: occ && r() > 0.82,
      };
    }
  }

  const getData = (x, y) =>
    canonical[`${x <= CENTER_X ? x : CENTER_X * 2 - x}-${y <= CENTER_Y ? y : CENTER_Y * 2 - y}`];

  return structural.map(slot => {
    const { occ, tenantIdx, hot } = getData(slot.x, slot.y);
    return {
      ...slot,
      occ,
      tenant: occ && tenantIdx >= 0 ? DEMO_TENANTS[tenantIdx] : null,
      hot,
    };
  });
}
