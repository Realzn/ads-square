// lib/supabase-server.js
// Client Supabase côté serveur (API Routes, Server Components)
// Utilise la SERVICE_ROLE_KEY — ne jamais exposer côté client.

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    // Pas de Realtime côté serveur
    realtime: { enabled: false },
  });
}
