// app/api/stripe/webhook/route.js
// Handles Stripe webhook events (payment confirmation)

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Disable body parsing — Stripe needs the raw body
export const runtime = 'nodejs'; // webhooks need Node.js runtime, not Edge
export const dynamic = 'force-dynamic';

export async function POST(request) {
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

      // Activate the pending booking
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'active',
          stripe_payment_id: session.payment_intent,
        })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('[Webhook] Failed to activate booking:', error.message);
        // Try to find and log the issue
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

      // Cancel the pending booking
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

      // Cancel the booking on refund
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
