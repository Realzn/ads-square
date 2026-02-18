// lib/supabase-server.js — Service role client for API routes (Edge-compatible)
// ⚠️ NEVER import this in client-side code

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      // Force fetch natif — évite toute dépendance à async_hooks/node:net
      fetch: (...args) => fetch(...args),
    },
  });
}
