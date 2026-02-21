// app/api/waitlist/route.js
// Inscrit un email en waitlist + envoie un email de confirmation

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';
import { sendWaitlistConfirmation } from '../../../lib/emails';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, profile } = await request.json();

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Insert — ON CONFLICT DO NOTHING pour éviter les erreurs sur doublon
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), profile: profile || null })
      .select()
      .single();

    if (error) {
      // Doublon (UNIQUE constraint) → pas une erreur pour l'utilisateur
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, already: true });
      }
      console.error('[Waitlist] Insert error:', error.message);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Email de confirmation (non bloquant)
    await sendWaitlistConfirmation({ to: email }).catch(e =>
      console.error('[Waitlist] Email error:', e.message)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Waitlist] Unexpected:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
