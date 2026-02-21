// app/api/stripe/webhook/route.js
// Handles Stripe webhook events (payment confirmation)

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';

// ✅ No module-level Stripe init — process.env not available at load time in CF Workers

export const dynamic = 'force-dynamic';

export async function POST(request) {
  // ✅ Lazy init inside the handler — env vars are available here
 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!webhookSecret) {
      console.error('[Webhook] Missing STRIPE_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { slot_x, slot_y, tier, days, email } = session.metadata;

      console.log(`[Webhook] Payment success for slot (${slot_x},${slot_y})`);

      // Calculer les timestamps exacts au moment de la confirmation paiement
      const paidAt   = new Date();                                          // maintenant, à la seconde
      const daysNum  = parseInt(days || '30', 10);
      const expiresAt = new Date(paidAt.getTime() + daysNum * 86400 * 1000); // +N×24h exactement

      // Activate the pending booking avec timestamps précis
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status:             'active',
          stripe_payment_id:  session.payment_intent,
          starts_at:          paidAt.toISOString(),        // heure exacte de paiement
          expires_at:         expiresAt.toISOString(),     // heure exacte d'expiration
          // Mettre aussi start_date / end_date pour rétrocompatibilité
          start_date:         paidAt.toISOString().split('T')[0],
          end_date:           expiresAt.toISOString().split('T')[0],
        })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('[Webhook] Failed to activate booking:', error.message);
        const { data: existing } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('stripe_session_id', session.id);
        console.error('[Webhook] Existing bookings for session:', existing);
      } else {
        console.log(`[Webhook] Booking ${data.id} activated for slot (${slot_x},${slot_y})`);
      }

      // Update Stripe customer ID on advertiser
      if (session.customer) {
        await supabase
          .from('advertisers')
          .update({ stripe_customer_id: session.customer })
          .eq('email', email);
      }

      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;

      console.log(`[Webhook] Session expired: ${session.id}`);

      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending');

      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      const paymentIntent = charge.payment_intent;

      console.log(`[Webhook] Refund for payment: ${paymentIntent}`);

      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('stripe_payment_id', paymentIntent)
        .eq('status', 'active');

      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
