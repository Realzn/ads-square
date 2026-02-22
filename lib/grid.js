// lib/grid.js
// Logique de grille ADS-SQUARE — tiers, prix, structure

// ── Dimensions de la grille ────────────────────────────────────────────────
export const GRID_COLS = 36;
export const GRID_ROWS = 36;
export const CENTER_X  = 18; // centre (1-indexed)
export const CENTER_Y  = 18;

// ── Taille visuelle des blocs par tier (pixels) ────────────────────────────
export const TIER_SIZE = {
  one:        18,
  ten:        14,
  corner_ten: 14,
  hundred:    10,
  thousand:    8,
};

// ── Pile de polices (réexportée depuis ici pour usage dans page.js) ─────────
export const FF = {
  h: "'Clash Display','Clash Display Fallback','Syne',sans-serif",
  b: "'DM Sans','DM Sans Fallback','Inter',system-ui,sans-serif",
  m: "'Courier New',monospace",
};

// ── Profils d'acheteurs (pour le formulaire de réservation) ───────────────
export const PROFILES = [
  { value: 'creator',   label: 'Créateur / Influenceur' },
  { value: 'freelance', label: 'Freelance / Indépendant' },
  { value: 'brand',     label: 'Marque / Entreprise' },
  { value: 'other',     label: 'Autre' },
];

// ── Prix en centimes par jour ──────────────────────────────────────────────
export const TIER_PRICE = {
  one:        100_000, // 1 000€/j
  ten:         10_000, // 100€/j
  corner_ten:  10_000, // 100€/j
  hundred:      1_000, // 10€/j
  thousand:       100, // 1€/j
};

export const TIER_LABEL = {
  one:        'ÉPICENTRE',
  ten:        'PRESTIGE',
  corner_ten: 'CORNER',
  hundred:    'BUSINESS',
  thousand:   'VIRAL',
};

export const TIER_COLOR = {
  one:        '#f0b429',
  ten:        '#ff4d8f',
  corner_ten: '#f0b429',
  hundred:    '#00d9f5',
  thousand:   '#00e8a2',
};

// ── Logique de tier selon position ────────────────────────────────────────
export function getTier(x, y) {
  const dx = Math.abs(x - CENTER_X);
  const dy = Math.abs(y - CENTER_Y);
  const d  = Math.max(dx, dy); // distance de Chebyshev

  if (d === 0) return 'one';
  if (d === 1 && dx === 1 && dy === 1) return 'corner_ten';
  if (d <= 1)  return 'ten';
  if (d <= 5)  return 'hundred';
  return 'thousand';
}

export function isTierAvailable(_tier) {
  return true; // surchargé via config Supabase
}

// ── Construction de la grille ─────────────────────────────────────────────
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
        bg:           b.background_color,
        url:          b.cta_url,
        cta:          b.cta_text,
        img:          b.image_url,
        t:            b.content_type,    // frontend lit tenant.t
        badge:        b.badge,
        bookingId:    b.booking_id,      // vue expose booking_id, pas id
        advertiserId: b.advertiser_id,
        l:            b.logo_initials,   // initiale du logo dans AnonBlock
      },
    };
  });
}

// ── Helpers de filtrage (utilisés dans app/page.js) ───────────────────────

// Filtre les slots par tier
export function filterTier(slots, tier) {
  if (!tier || tier === 'all') return slots;
  return slots.filter(s => s.tier === tier);
}

// Filtre les slots occupés
export function filterOccupied(slots, occupied) {
  if (occupied === null || occupied === undefined) return slots;
  return slots.filter(s => s.occ === occupied);
}

// Retourne les slots d'un tier donné depuis la grille
export function getSlotsByTier(slots, tier) {
  return slots.filter(s => s.tier === tier);
}

// Compte les slots occupés par tier
export function countByTier(slots) {
  const counts = {};
  slots.forEach(s => {
    if (!counts[s.tier]) counts[s.tier] = { total: 0, occupied: 0 };
    counts[s.tier].total++;
    if (s.occ) counts[s.tier].occupied++;
  });
  return counts;
}
