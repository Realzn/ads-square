// app/api/boost/request/route.js
// Enregistre une demande de boost spotlight depuis un compte connecté.
// Pas de bloc requis — ouvert à tout utilisateur authentifié.

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { hours, email, url, name, totalCents } = await request.json();

    // Validations basiques
    if (!email?.includes('@'))        return NextResponse.json({ error: 'Email invalide' },      { status: 400 });
    if (!url?.startsWith('http'))     return NextResponse.json({ error: 'URL invalide' },         { status: 400 });
    if (!name?.trim())                return NextResponse.json({ error: 'Nom requis' },            { status: 400 });
    if (!hours || hours < 1)          return NextResponse.json({ error: 'Durée invalide' },        { status: 400 });

    const supabase = createServiceClient();

    // Insérer la demande de boost (table à créer via migration ci-dessous)
    const { error: insertError } = await supabase
      .from('boost_requests')
      .insert({
        email:        email.toLowerCase().trim(),
        display_name: name.trim(),
        url:          url.trim(),
        hours:        hours,
        amount_cents: totalCents,
        status:       'pending',
      });

    if (insertError) {
      console.error('[Boost] Insert error:', insertError.message);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // TODO: envoyer un email de confirmation à l'utilisateur
    // TODO: notifier l'admin (email ou Slack)

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Boost] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
