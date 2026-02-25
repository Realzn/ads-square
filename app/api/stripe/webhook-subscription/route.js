// app/api/stripe/webhook-subscription/route.js
// Gère les événements Stripe liés aux abonnements journaliers
// (en complément du webhook existant pour les paiements one-shot)

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';
import { sendSubscriptionConfirmation, sendSuspensionWarning, sendSlotReactivated } from '../../../../lib/emails-sphere';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SUB || process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {

    // ─── Abonnement activé (premier paiement réussi) ─────────
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') break; // ignorer les one-shots

      const { slot_x, slot_y, tier, rank, email, advertiser_id, display_name,
              slogan, cta_url, cta_text, image_url, primary_color, background_color,
              content_type, badge } = session.metadata;

      const stripeSubId = session.subscription;
      const now = new Date();

      // 1. Créer le booking associé (pour rétrocompatibilité avec la grille)
      const finalName = display_name || email.split('@')[0];
      const endDate = new Date(now.getTime() + 30 * 86400000); // 30j initiaux

      const { data: booking } = await supabase.from('bookings').insert([{
        slot_x: parseInt(slot_x),
        slot_y: parseInt(slot_y),
        advertiser_id,
        status: 'active',
        start_date: now.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        starts_at: now.toISOString(),
        expires_at: null, // abonnement = pas d'expiration fixe
        stripe_session_id: session.id,
        amount_cents: session.amount_total || 0,
        display_name: finalName,
        slogan: slogan || '',
        logo_initials: finalName.substring(0, 2).toUpperCase(),
        cta_url: cta_url || '',
        cta_text: cta_text || 'Visiter',
        image_url: image_url || '',
        primary_color: primary_color || '#00d9f5',
        background_color: background_color || '#0d1828',
        content_type: content_type || 'link',
        badge: badge || 'MEMBRE',
      }]).select('id').single();

      // 2. Créer l'abonnement dans notre DB
      const pricePerDay = getPricePerDay(tier);
      const { data: sub } = await supabase.from('subscriptions').insert([{
        advertiser_id,
        slot_x: parseInt(slot_x),
        slot_y: parseInt(slot_y),
        tier,
        rank,
        status: 'active',
        stripe_subscription_id: stripeSubId,
        stripe_customer_id: session.customer,
        price_cents_per_day: pricePerDay,
        booking_id: booking?.id,
        next_billing_date: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
      }]).select('id').single();

      // 3. Créer les tâches du jour via RPC
      if (sub?.id) {
        await supabase.rpc('create_daily_tasks_for_subscription', { p_subscription_id: sub.id });
      }

      // 4. Email de bienvenue
      await sendSubscriptionConfirmation({ to: email, displayName: finalName, rank, tier, slotX: slot_x, slotY: slot_y });

      console.log(`[Sub Webhook] Abonnement activé — slot (${slot_x},${slot_y}) rang ${rank}`);
      break;
    }

    // ─── Paiement journalier réussi ───────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const stripeSubId = invoice.subscription;
      if (!stripeSubId) break;

      // Mettre à jour la prochaine date de facturation
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await supabase.from('subscriptions')
        .update({
          next_billing_date: tomorrow.toISOString().split('T')[0],
          status: 'active', // réactiver si était past_due
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSubId);

      // Créer les tâches du lendemain
      const { data: sub } = await supabase.from('subscriptions')
        .select('id').eq('stripe_subscription_id', stripeSubId).single();
      if (sub?.id) {
        await supabase.rpc('create_daily_tasks_for_subscription', { p_subscription_id: sub.id });
      }
      break;
    }

    // ─── Paiement échoué ─────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const stripeSubId = invoice.subscription;
      if (!stripeSubId) break;

      await supabase.from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSubId);

      // Griser le slot
      await supabase.from('bookings')
        .update({ status: 'suspended' })
        .eq('id', supabase.from('subscriptions').select('booking_id').eq('stripe_subscription_id', stripeSubId));
      break;
    }

    // ─── Abonnement annulé (par l'utilisateur ou Stripe) ─────
    case 'customer.subscription.deleted': {
      const sub = event.data.object;

      const { data: ourSub } = await supabase.from('subscriptions')
        .select('id, booking_id, advertiser_id, rank, slot_x, slot_y')
        .eq('stripe_subscription_id', sub.id).single();

      if (!ourSub) break;

      // Annuler l'abonnement
      await supabase.from('subscriptions').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', ourSub.id);

      // Marquer le booking en void 24h (visible sur la grille)
      await supabase.from('bookings').update({
        status: 'void',
        void_until: new Date(Date.now() + 24 * 3600000).toISOString(),
      }).eq('id', ourSub.booking_id);

      console.log(`[Sub Webhook] Abonnement annulé — slot (${ourSub.slot_x},${ourSub.slot_y})`);
      break;
    }

    default:
      console.log(`[Sub Webhook] Événement non géré : ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// ─── Helpers ─────────────────────────────────────────────────

const PRICE_MAP = {
  epicenter: 100000,
  prestige:   10000,
  elite:       5000,
  business:    1000,
  standard:     300,
  viral:        100,
};

function getPricePerDay(tier) {
  return PRICE_MAP[tier] || 100;
}
