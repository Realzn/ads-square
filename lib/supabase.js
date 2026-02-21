// lib/supabase.js — Supabase client + data fetching + realtime

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create client if env vars exist
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!supabase;
}

/**
 * Expire les bookings actifs dont end_date est passée (lazy, fire-and-forget)
 * Appelée en background à chaque fetchActiveSlots — filet de sécurité
 * sans dépendre d'un cron externe.
 */
async function lazyExpireBookings() {
  if (!supabase) return;
  const today = new Date().toISOString().split('T')[0];
  // On utilise la anon key ici — la RLS bloque l'UPDATE, donc ça échoue silencieusement
  // La vraie expiration se fait via /api/cron/expire (service_role)
  // Ce call sert juste à déclencher le rechargement Realtime si pg_cron tourne
}

/**
 * Fetch all active slots (view that joins slots + active bookings)
 * La vue active_slots filtre déjà par end_date >= CURRENT_DATE côté SQL,
 * donc les blocs expirés disparaissent visuellement même sans mise à jour du status.
 */
export async function fetchActiveSlots() {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('active_slots')
    .select('*');

  if (error) {
    console.error('[Supabase] fetchActiveSlots error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

/**
 * Fetch grid stats by tier
 */
export async function fetchGridStats() {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('grid_stats')
    .select('*');

  return { data: data || [], error };
}

/**
 * Check if a specific slot is available for a date range
 */
export async function checkSlotAvailability(x, y, startDate, endDate) {
  if (!supabase) return false;

  // Vérifier contre expires_at (précis à la seconde) pour les nouveaux bookings
  // et end_date pour les anciens (rétrocompatibilité)
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('bookings')
    .select('id, expires_at, end_date')
    .eq('slot_x', x)
    .eq('slot_y', y)
    .in('status', ['active', 'pending']);

  if (!data || data.length === 0) return true;

  // Filtrage manuel pour gérer les deux colonnes
  const conflicts = data.filter(b => {
    const expiry = b.expires_at || (b.end_date + 'T23:59:59Z');
    return expiry > now;
  });

  return conflicts.length === 0;
}

/**
 * Subscribe to realtime booking changes.
 * Calls onUpdate(payload) whenever a booking is inserted/updated/deleted.
 * Returns an unsubscribe function.
 */
export function subscribeToBookings(onUpdate) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('bookings-realtime')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'bookings',
      },
      (payload) => {
        console.log('[Realtime] Booking change:', payload.eventType);
        onUpdate(payload);
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch click + impression stats for a given slot (public)
 */
export async function fetchSlotStats(slotX, slotY) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('booking_stats')
    .select('impressions,clicks,ctr_pct,clicks_7d,impressions_7d,booking_id')
    .eq('slot_x', slotX)
    .eq('slot_y', slotY)
    .eq('status', 'active')
    .maybeSingle();
  return { data, error };
}

/**
 * Fetch pending buyout offers on a slot
 */
export async function fetchSlotOffers(slotX, slotY) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('slot_offers')
    .select('id,offer_amount_cents,status,expires_at,buyer_name,message,created_at')
    .eq('slot_x', slotX)
    .eq('slot_y', slotY)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('offer_amount_cents', { ascending: false });
  return { data: data || [], error };
}

/**
 * Submit a buyout offer via API
 */
export async function submitBuyoutOffer({ slotX, slotY, bookingId, offerCents, buyerEmail, buyerName, message }) {
  const res = await fetch('/api/offers/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotX, slotY, bookingId, offerCents, buyerEmail, buyerName, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Offer submission failed');
  }
  return res.json();
}

/**
 * Record a click event (fire-and-forget, via API route to avoid RLS)
 */
export function recordClick(slotX, slotY, bookingId) {
  if (typeof window === 'undefined') return;
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotX, slotY, bookingId, event: 'click', referrer: document.referrer }),
  }).catch(() => {});
}

/**
 * Create a Stripe Checkout session via our API route.
 * Returns { url } to redirect the user.
 */
export async function createCheckoutSession({ slotX, slotY, tier, days = 30, email }) {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotX, slotY, tier, days, email }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Checkout failed');
  }

  return res.json();
}
