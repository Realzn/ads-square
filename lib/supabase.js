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
 * Fetch all active slots (view that joins slots + active bookings)
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

  const { data } = await supabase
    .from('bookings')
    .select('id')
    .eq('slot_x', x)
    .eq('slot_y', y)
    .in('status', ['active', 'pending'])
    .lt('start_date', endDate)
    .gt('end_date', startDate);

  return !data || data.length === 0;
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
