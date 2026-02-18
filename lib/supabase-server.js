// lib/supabase-server.js — Service role client for API routes
// ⚠️ NEVER import this in client-side code

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
