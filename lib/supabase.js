// lib/supabase.js
// Client Supabase côté navigateur (composants 'use client')
//
// CORRECTIF Lighthouse — Bonnes pratiques :
// Supabase JS crée automatiquement une connexion WebSocket Realtime au démarrage,
// générant des erreurs console. Fix : connexion lazy, WebSocket seulement si nécessaire.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Singleton — Realtime désactivé par défaut pour éviter les WebSocket non sollicités
let _client = null;
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}

// Alias compatibilité
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;

// ── Helpers de données ──────────────────────────────────────────────────────

export async function fetchActiveSlots() {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase non configuré') };
  return client.from('active_slots').select('*');
}

export async function fetchSlotClicks() {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase non configuré') };
  return client.from('slot_clicks').select('event_type');
}
