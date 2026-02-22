// lib/supabase.js — Client Supabase côté navigateur
// CORRECTIF : Realtime lazy pour éviter les WebSocket non sollicités au démarrage

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let _client = null;
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;

// ── Helpers de données ─────────────────────────────────────────────────────

export async function fetchActiveSlots() {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: new Error('Supabase non configuré') };
  return c.from('active_slots').select('*');
}

export async function fetchSlotClicks() {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: new Error('Supabase non configuré') };
  return c.from('slot_clicks').select('event_type');
}

export async function fetchSlotStats(x, y) {
  const c = getSupabaseClient();
  if (!c) return { data: null, error: new Error('Supabase non configuré') };
  return c
    .from('slot_clicks')
    .select('event_type, created_at')
    .eq('slot_x', x)
    .eq('slot_y', y);
}

export async function recordClick({ slotX, slotY, bookingId, event = 'click', referrer }) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotX, slotY, bookingId, event, referrer }),
    });
  } catch {
    // Silencieux — le tracking ne doit jamais bloquer l'UX
  }
}

export async function createCheckoutSession(params) {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur lors de la création du paiement');
  }
  return res.json();
}

export async function submitBuyoutOffer(params) {
  const res = await fetch('/api/offers/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur lors de la soumission de l\'offre');
  }
  return res.json();
}

// ── Realtime subscription ──────────────────────────────────────────────────
// Retourne une fonction d'unsubscribe.
// Connexion WebSocket établie uniquement lors du premier appel.
export function subscribeToBookings(onUpdate) {
  const c = getSupabaseClient();
  if (!c) return () => {};

  const channel = c
    .channel('bookings-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_slots' },
      (payload) => onUpdate(payload)
    )
    .subscribe();

  return () => {
    c.removeChannel(channel);
  };
}
