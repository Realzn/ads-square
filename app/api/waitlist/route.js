// app/api/waitlist/route.js
// Inscription en waitlist + email de bienvenue

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';
import { sendEmail } from '../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, profile } = await request.json();

    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Insérer (ou ignorer si déjà inscrit)
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email: email.toLowerCase().trim(), profile: profile || null }, { onConflict: 'email' });

    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Email de bienvenue séquencé
    await sendEmail({
      to: email,
      subject: '🟦 Bienvenue sur ADS-SQUARE — votre place est réservée',
      type: 'waitlist_welcome',
      data: { profile: profile || 'creator' },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
