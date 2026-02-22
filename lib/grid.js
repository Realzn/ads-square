// lib/grid.js — Architecture grille ADS-SQUARE
// 6 tiers concentriques, symétrie Chebyshev parfaite, fill rectangulaire

export const GRID_COLS = 36;
export const GRID_ROWS = 36;
export const CENTER_X  = 18; // 1-indexed
export const CENTER_Y  = 18;

// ── Tailles de base (k=1, desktop full) ─────────────────────────────────────
export const TIER_SIZE = {
  epicenter: 120,
  prestige:   54,
  elite:      34,
  business:   20,
  standard:   12,
  viral:       7,
};

// ── Prix en centimes d'euro / jour ───────────────────────────────────────────
export const TIER_PRICE = {
  epicenter: 100_000, // €1 000/j
  prestige:   10_000, // €100/j
  elite:       5_000, // €50/j
  business:    1_000, // €10/j
  standard:      300, // €3/j
  viral:         100, // €1/j
};

// ── Labels visuels ───────────────────────────────────────────────────────────
export const TIER_LABEL = {
  epicenter: 'ÉPICENTRE',
  prestige:  'PRESTIGE',
  elite:     'ELITE',
  business:  'BUSINESS',
  standard:  'STANDARD',
  viral:     'VIRAL',
};

// ── Couleurs néon par tier ────────────────────────────────────────────────────
export const TIER_COLOR = {
  epicenter: '#f0b429',  // or chaud
  prestige:  '#ff4d8f',  // rose vif
  elite:     '#a855f7',  // violet
  business:  '#00d9f5',  // cyan
  standard:  '#38bdf8',  // sky
  viral:     '#00e8a2',  // vert menthe
};

// ── Polices (référence globale) ───────────────────────────────────────────────
export const FF = {
  h: "'Clash Display','Clash Display Fallback','Syne',sans-serif",
  b: "'DM Sans','DM Sans Fallback','Inter',system-ui,sans-serif",
  m: "'Courier New',monospace",
};

// ── Distance de Chebyshev → tier ─────────────────────────────────────────────
export function getTier(x, y) {
  const d = Math.max(Math.abs(x - CENTER_X), Math.abs(y - CENTER_Y));
  if (d === 0)  return 'epicenter';
  if (d <= 1)   return 'prestige';
  if (d <= 3)   return 'elite';
  if (d <= 7)   return 'business';
  if (d <= 12)  return 'standard';
  return 'viral';
}

// ── Disponibilité par tier (contrôle ouverture progressive) ──────────────────
export function isTierAvailable(tier) {
  // Sera overridé par tier_config en DB — fallback statique
  return tier === 'viral' || tier === 'standard' || tier === 'business';
}

// ── Grille structurelle (1 slot par cellule, 1296 slots total) ───────────────
export function buildStructuralGrid() {
  const slots = [];
  for (let y = 1; y <= GRID_ROWS; y++) {
    for (let x = 1; x <= GRID_COLS; x++) {
      slots.push({ id: `${x},${y}`, x, y, tier: getTier(x, y), occ: false, tenant: null });
    }
  }
  return slots;
}

export function buildDemoGrid() {
  return buildStructuralGrid();
}

// ── Merge grille structurelle + bookings Supabase ────────────────────────────
export function mergeGridWithBookings(structural, bookings) {
  if (!bookings?.length) return structural;
  // active_slots retourne TOUS les slots (LEFT JOIN) — on n'indexe que les occupés
  const map = new Map(
    bookings
      .filter(b => b.is_occupied === true)
      .map(b => [`${b.x},${b.y}`, b])
  );
  return structural.map(slot => {
    const b = map.get(`${slot.x},${slot.y}`);
    if (!b) return { ...slot, occ: false, tenant: null };
    return {
      ...slot,
      occ: true,
      tenant: {
        name:         b.display_name,
        slogan:       b.slogan,
        c:            b.primary_color    || TIER_COLOR[slot.tier],
        b:            b.background_color,
        url:          b.cta_url,
        cta:          b.cta_text,
        img:          b.image_url,
        t:            b.content_type,        // frontend lit tenant.t
        badge:        b.badge,
        bookingId:    b.booking_id,           // vue expose booking_id, pas id
        advertiserId: b.advertiser_id,
        l:            b.logo_initials,        // initiale du logo dans AnonBlock
      },
    };
  });
}

// ── Profils de contenu (inchangés) ───────────────────────────────────────────
export const PROFILES = {
  video:    { label: 'Vidéo',       icon: '▶', ctaDefault: 'Regarder',  showImg: true,  showSocial: true,  showMusic: false, showApp: false },
  image:    { label: 'Image',       icon: '◻', ctaDefault: 'Découvrir', showImg: true,  showSocial: false, showMusic: false, showApp: false },
  link:     { label: 'Lien',        icon: '⊞', ctaDefault: 'Visiter',   showImg: false, showSocial: false, showMusic: false, showApp: false },
  social:   { label: 'Réseaux',     icon: '◈', ctaDefault: 'Suivre',    showImg: false, showSocial: true,  showMusic: false, showApp: false },
  music:    { label: 'Musique',     icon: '♪', ctaDefault: 'Écouter',   showImg: true,  showSocial: false, showMusic: true,  showApp: false },
  app:      { label: 'App',         icon: '◉', ctaDefault: 'Installer', showImg: true,  showSocial: false, showMusic: false, showApp: true  },
  brand:    { label: 'Marque',      icon: '◈', ctaDefault: 'Découvrir', showImg: true,  showSocial: false, showMusic: false, showApp: false },
  fashion:  { label: 'Vêtements',   icon: '◇', ctaDefault: 'Découvrir', showImg: true,  showSocial: false, showMusic: false, showApp: false },
  lifestyle:{ label: 'Lifestyle',   icon: '○', ctaDefault: 'Découvrir', showImg: true,  showSocial: false, showMusic: false, showApp: false },
  text:     { label: 'Publications',icon: '=', ctaDefault: 'Lire',      showImg: false, showSocial: false, showMusic: false, showApp: false },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function filterTier(slots, tier) {
  if (!tier || tier === 'all') return slots;
  return slots.filter(s => s.tier === tier);
}

export function filterOccupied(slots, occupied) {
  if (occupied === null || occupied === undefined) return slots;
  return slots.filter(s => s.occ === occupied);
}

export function getSlotsByTier(slots, tier) {
  return slots.filter(s => s.tier === tier);
}
