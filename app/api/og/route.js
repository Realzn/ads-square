// app/api/og/route.js
// Génère une image OG dynamique (SVG 1200×630) pour chaque slot
// URL : /api/og?x=18&y=18
// Compatible Cloudflare Pages / Edge sans dépendance WASM

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ─── Design tokens (miroir du DA) ─────────────────────────────────────────────
const TIER = {
  epicenter: { color: '#f0b429', label: 'ÉPICENTRE',  price: '1 000€/j', glow: 'rgba(240,180,41,0.35)'  },
  prestige:  { color: '#ff4d8f', label: 'PRESTIGE',   price: '100€/j',   glow: 'rgba(255,77,143,0.30)'  },
  elite:     { color: '#a855f7', label: 'ELITE',       price: '50€/j',    glow: 'rgba(168,85,247,0.30)'  },
  business:  { color: '#00d9f5', label: 'BUSINESS',   price: '10€/j',    glow: 'rgba(0,217,245,0.28)'   },
  standard:  { color: '#38bdf8', label: 'STANDARD',   price: '3€/j',     glow: 'rgba(56,189,248,0.25)'  },
  viral:     { color: '#00e8a2', label: 'VIRAL',       price: '1€/j',     glow: 'rgba(0,232,162,0.25)'   },
};

function getTier(x, y) {
  const d = Math.max(Math.abs(x - 18), Math.abs(y - 18));
  if (d === 0) return 'epicenter';
  if (d <= 2)  return 'prestige';
  if (d <= 5)  return 'elite';
  if (d <= 10) return 'business';
  if (d <= 15) return 'standard';
  return 'viral';
}

// Tronque un texte pour l'affichage SVG
function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// Détermine la taille de police selon la longueur du nom
function nameFontSize(name) {
  const l = (name || '').length;
  if (l <= 12) return 72;
  if (l <= 18) return 56;
  if (l <= 26) return 44;
  return 36;
}

// Encode une couleur hex en couleur SVG safe
function hex(c) { return c || '#00C8E4'; }

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const x = parseInt(searchParams.get('x') || '18');
  const y = parseInt(searchParams.get('y') || '18');

  if (isNaN(x) || isNaN(y) || x < 0 || x > 36 || y < 0 || y > 36) {
    return new NextResponse('Invalid coordinates', { status: 400 });
  }

  // Fetch slot data
  let booking = null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('active_slots')
      .select('display_name, slogan, cta_text, primary_color, badge, tier, logo_initials, is_occupied')
      .eq('x', x)
      .eq('y', y)
      .single();
    if (data?.is_occupied) booking = data;
  } catch (_) { /* graceful degradation */ }

  const tierKey  = booking?.tier || getTier(x, y);
  const tier     = TIER[tierKey] || TIER.viral;
  const tc       = hex(tier.color);
  const tg       = tier.glow;
  const pc       = booking?.primary_color || tc;

  const isOccupied = !!booking;
  const name      = trunc(isOccupied ? (booking.display_name || '???') : 'DISPONIBLE', 30);
  const slogan    = trunc(isOccupied ? (booking.slogan || booking.cta_text || '') : `Réservez ce slot ${tier.label} · ${tier.price}`, 68);
  const initials  = booking?.logo_initials || booking?.badge || tier.label.slice(0, 2);
  const namePx    = nameFontSize(name);

  // ─── Orbital ring radii (Dyson sphere deco) ──────────────────────────────
  // Centré sur le coin droit de l'image
  const ox = 1060, oy = 315;
  const rings = [220, 290, 360].map((r, i) => ({
    r,
    opacity: 0.06 - i * 0.015,
    dash: `${Math.PI * 2 * r * 0.35} ${Math.PI * 2 * r * 0.65}`,
    rot: 30 + i * 22,
  }));

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#01020A"/>
      <stop offset="100%" stop-color="#000610"/>
    </linearGradient>

    <!-- Tier accent glow (left beam) -->
    <radialGradient id="glow-left" cx="0" cy="0.5" r="0.7" fx="0" fy="0.5">
      <stop offset="0%"   stop-color="${tc}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${tc}" stop-opacity="0"/>
    </radialGradient>

    <!-- Name color glow -->
    <radialGradient id="glow-name" cx="0.35" cy="0.5" r="0.5">
      <stop offset="0%"   stop-color="${pc}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${pc}" stop-opacity="0"/>
    </radialGradient>

    <!-- Avatar gradient -->
    <linearGradient id="avatar-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${pc}30"/>
      <stop offset="100%" stop-color="${pc}08"/>
    </linearGradient>

    <!-- Star grid filter -->
    <filter id="blur-sm">
      <feGaussianBlur stdDeviation="1.5"/>
    </filter>

    <!-- Glow filter for tier accent line -->
    <filter id="glow-line" x="-50%" y="-200%" width="200%" height="500%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle dot grid -->
  ${Array.from({ length: 12 }, (_, row) =>
    Array.from({ length: 20 }, (_, col) =>
      `<circle cx="${col * 64 + 8}" cy="${row * 58 + 8}" r="0.8" fill="#ffffff" opacity="0.04"/>`
    ).join('')
  ).join('')}

  <!-- Ambient glow left -->
  <rect x="-100" y="0" width="600" height="630" fill="url(#glow-left)" opacity="0.8"/>

  <!-- Ambient glow name zone -->
  <rect x="0" y="0" width="900" height="630" fill="url(#glow-name)"/>

  <!-- ── Orbital rings (Dyson deco, right side) ──────────────────────── -->
  ${rings.map(rg => `
  <circle
    cx="${ox}" cy="${oy}" r="${rg.r}"
    fill="none"
    stroke="${tc}"
    stroke-width="1"
    opacity="${rg.opacity}"
    stroke-dasharray="${rg.dash}"
    transform="rotate(${rg.rot}, ${ox}, ${oy})"
  />`).join('')}

  <!-- Ring center dot -->
  <circle cx="${ox}" cy="${oy}" r="3" fill="${tc}" opacity="0.15"/>
  <circle cx="${ox}" cy="${oy}" r="8" fill="none" stroke="${tc}" stroke-width="0.5" opacity="0.12"/>

  <!-- ── Left accent line ─────────────────────────────────────────────── -->
  <rect x="0" y="0" width="4" height="630" fill="${tc}" opacity="0.9" filter="url(#glow-line)"/>
  <rect x="0" y="0" width="1" height="630" fill="${tc}"/>

  <!-- ── Top left: coordinates ───────────────────────────────────────── -->
  <text
    x="52" y="68"
    font-family="'Courier New', 'Lucida Console', monospace"
    font-size="13"
    font-weight="400"
    fill="${tc}"
    opacity="0.6"
    letter-spacing="3"
  >[${x.toString().padStart(2,'0')},${y.toString().padStart(2,'0')}]</text>

  <!-- ── Tier badge ───────────────────────────────────────────────────── -->
  <rect x="48" y="82" width="${tier.label.length * 8 + 28}" height="24" rx="12"
    fill="${tc}" fill-opacity="0.12"
    stroke="${tc}" stroke-width="0.8" stroke-opacity="0.5"/>
  <text
    x="${48 + (tier.label.length * 8 + 28) / 2}" y="98"
    font-family="'Arial', 'Helvetica', sans-serif"
    font-size="10"
    font-weight="700"
    fill="${tc}"
    text-anchor="middle"
    letter-spacing="2.5"
  >${tier.label}</text>

  <!-- ── Avatar circle (occupied: initials, free: tier icon) ─────────── -->
  ${isOccupied ? `
  <circle cx="81" cy="220" r="40" fill="url(#avatar-grad)" stroke="${pc}" stroke-width="1.5" stroke-opacity="0.4"/>
  <text x="81" y="228"
    font-family="'Arial Black', 'Arial', sans-serif"
    font-size="${initials.length > 2 ? 14 : 18}"
    font-weight="900"
    fill="${pc}"
    text-anchor="middle"
    letter-spacing="1"
  >${initials}</text>
  ` : `
  <circle cx="81" cy="220" r="40" fill="${tc}0A" stroke="${tc}" stroke-width="1" stroke-opacity="0.25" stroke-dasharray="4 3"/>
  <text x="81" y="228"
    font-family="'Arial', sans-serif"
    font-size="24"
    fill="${tc}"
    text-anchor="middle"
    opacity="0.5"
  >+</text>
  `}

  <!-- ── Main name ────────────────────────────────────────────────────── -->
  <text
    x="52" y="${isOccupied ? 318 : 300}"
    font-family="'Arial Black', 'Arial Bold', 'Helvetica', sans-serif"
    font-size="${namePx}"
    font-weight="900"
    fill="#E8F0F8"
    letter-spacing="${name.length > 20 ? '-0.5' : '0'}"
  >${name}</text>

  <!-- ── Slogan ───────────────────────────────────────────────────────── -->
  ${slogan ? `
  <text
    x="52" y="${isOccupied ? 370 : 355}"
    font-family="'Arial', 'Helvetica', sans-serif"
    font-size="18"
    font-weight="400"
    fill="#7BA8C8"
    letter-spacing="0.3"
  >${slogan}</text>
  ` : ''}

  <!-- ── Status pill ─────────────────────────────────────────────────── -->
  ${isOccupied ? `
  <rect x="52" y="410" width="80" height="22" rx="11"
    fill="#00D88015"
    stroke="#00D880" stroke-width="0.8" stroke-opacity="0.4"/>
  <circle cx="66" cy="421" r="3.5" fill="#00D880"/>
  <text x="80" y="425.5"
    font-family="'Arial', sans-serif"
    font-size="10" font-weight="600"
    fill="#00D880"
    letter-spacing="1.5"
  >ACTIF</text>
  ` : `
  <rect x="52" y="396" width="108" height="22" rx="11"
    fill="${tc}12"
    stroke="${tc}" stroke-width="0.8" stroke-opacity="0.4"/>
  <text x="106" y="411"
    font-family="'Arial', sans-serif"
    font-size="10" font-weight="700"
    fill="${tc}"
    text-anchor="middle"
    letter-spacing="1.5"
  >DISPONIBLE</text>
  `}

  <!-- ── Bottom bar ───────────────────────────────────────────────────── -->
  <rect x="0" y="580" width="1200" height="1" fill="${tc}" opacity="0.12"/>
  <rect x="0" y="580" width="1200" height="50" fill="#00000040"/>

  <!-- Brand name -->
  <text
    x="52" y="612"
    font-family="'Arial', 'Helvetica', sans-serif"
    font-size="13"
    font-weight="700"
    fill="${tc}"
    letter-spacing="4"
  >AdsMostFair</text>

  <!-- Separator dot -->
  <circle cx="196" cy="608" r="2" fill="#7BA8C8" opacity="0.4"/>

  <!-- Tagline -->
  <text
    x="208" y="612"
    font-family="'Arial', 'Helvetica', sans-serif"
    font-size="12"
    font-weight="400"
    fill="#7BA8C8"
    letter-spacing="1"
    opacity="0.6"
  >La grille publicitaire ouverte à tous</text>

  <!-- Price tag (right) -->
  <text
    x="1148" y="612"
    font-family="'Arial', 'Helvetica', sans-serif"
    font-size="13"
    font-weight="700"
    fill="${tc}"
    text-anchor="end"
    letter-spacing="1"
    opacity="0.7"
  >${tier.price}</text>

  <!-- ── Subtle horizontal scan line ─────────────────────────────────── -->
  <rect x="0" y="315" width="1200" height="0.5" fill="${tc}" opacity="0.03"/>
</svg>`.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Vary': 'Accept',
    },
  });
}