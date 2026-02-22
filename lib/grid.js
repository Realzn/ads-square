// lib/grid.js
// Logique de grille ADS-SQUARE — tiers, prix, structure
// Ce fichier contient les constantes et fonctions de la grille 36x36.

// Prix en centimes par jour
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

// Détermine le tier d'un slot selon sa position dans la grille 36x36
export function getTier(x, y) {
  const cx = 18, cy = 18; // centre
  const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
  const d = Math.max(dx, dy); // distance de Chebyshev

  if (d === 0) return 'one';
  if (d <= 1)  return 'ten';
  // Coins (d<=1 sur le bord d'un carré 3x3)
  if (dx === 1 && dy === 1 && d === 1) return 'corner_ten';
  if (d <= 5)  return 'hundred';
  return 'thousand';
}

// Vérifie si un tier est disponible à la réservation
export function isTierAvailable(tier) {
  // Par défaut tout est disponible — surcharge via config Supabase
  return true;
}

// Construit la grille structurelle (tous les slots vides)
export function buildStructuralGrid() {
  const slots = [];
  for (let y = 1; y <= 36; y++) {
    for (let x = 1; x <= 36; x++) {
      slots.push({
        x, y,
        tier: getTier(x, y),
        occ: false,
        tenant: null,
      });
    }
  }
  return slots;
}

// Grille de démo avec quelques slots occupés (mode hors-ligne)
export function buildDemoGrid() {
  const grid = buildStructuralGrid();
  return grid;
}

// Fusionne la grille structurelle avec les réservations actives depuis Supabase
export function mergeGridWithBookings(structural, bookings) {
  if (!bookings || !bookings.length) return structural;

  const map = new Map();
  bookings.forEach(b => map.set(`${b.x},${b.y}`, b));

  return structural.map(slot => {
    const booking = map.get(`${slot.x},${slot.y}`);
    if (!booking) return slot;
    return {
      ...slot,
      occ: true,
      tenant: {
        name:    booking.display_name,
        slogan:  booking.slogan,
        c:       booking.primary_color || TIER_COLOR[slot.tier],
        bg:      booking.background_color,
        url:     booking.cta_url,
        cta:     booking.cta_text,
        img:     booking.image_url,
        type:    booking.content_type,
        badge:   booking.badge,
        id:      booking.id,
      },
    };
  });
}
