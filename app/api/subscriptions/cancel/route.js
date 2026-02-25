// app/api/subscriptions/cancel/route.js
// Annulation d'abonnement à la demande de l'utilisateur

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const { subscription_id, advertiser_id } = await request.json();
    if (!subscription_id || !advertiser_id) {
      return NextResponse.json({ error: 'subscription_id et advertiser_id requis' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Vérifier que l'abonnement appartient bien à cet advertiser
    const { data: sub } = await supabase.from('subscriptions')
      .select('id, stripe_subscription_id, booking_id, slot_x, slot_y, rank')
      .eq('id', subscription_id)
      .eq('advertiser_id', advertiser_id)
      .single();

    if (!sub) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 });

    // Annuler sur Stripe (à la fin de la période courante)
    if (sub.stripe_subscription_id) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Marquer l'abonnement comme annulé dans notre DB
    await supabase.from('subscriptions').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', subscription_id);

    // Mettre le slot en "void" 24h (visible publiquement sur la grille)
    if (sub.booking_id) {
      await supabase.from('bookings').update({
        status: 'void',
        void_until: new Date(Date.now() + 24 * 3600000).toISOString(),
      }).eq('id', sub.booking_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Abonnement annulé. Votre slot sera visible en "void" pendant 24h.',
    });
  } catch (err) {
    console.error('[Cancel Subscription] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
