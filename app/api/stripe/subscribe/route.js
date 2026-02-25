// app/api/stripe/subscribe/route.js
// Crée un abonnement Stripe récurrent journalier pour un slot
// Remplace le paiement one-shot pour les abonnements Sphère de Dyson

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';
import { TIER_PRICE, TIER_LABEL, getTier } from '../../../../lib/grid';

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const {
      slotX, slotY, email,
      display_name, slogan, cta_url, cta_text,
      image_url, primary_color, background_color,
      content_type, badge,
    } = await request.json();

    if (slotX == null || slotY == null || !email) {
      return NextResponse.json({ error: 'Champs manquants : slotX, slotY, email' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const tier = getTier(slotX, slotY);
    const rank = getRankFromTier(tier);
    const pricePerDay = TIER_PRICE[tier]; // en centimes

    // Vérifier que le slot est libre
    const { data: conflicts } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('slot_x', slotX)
      .eq('slot_y', slotY)
      .eq('status', 'active');

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Ce slot est déjà occupé' }, { status: 409 });
    }

    // Trouver ou créer l'advertiser
    let advertiserId;
    const { data: existing } = await supabase
      .from('advertisers')
      .select('id, stripe_customer_id')
      .eq('email', email)
      .single();

    let stripeCustomerId = existing?.stripe_customer_id;

    if (existing) {
      advertiserId = existing.id;
    } else {
      const { data: newAdv } = await supabase
        .from('advertisers')
        .insert([{ email, display_name: display_name || email.split('@')[0], profile_type: 'creator' }])
        .select('id')
        .single();
      advertiserId = newAdv.id;
    }

    // Créer un customer Stripe si besoin
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        name: display_name || email.split('@')[0],
        metadata: { advertiser_id: advertiserId },
      });
      stripeCustomerId = customer.id;
      await supabase.from('advertisers').update({ stripe_customer_id: stripeCustomerId }).eq('id', advertiserId);
    }

    // Créer un Price Stripe récurrent journalier
    // (dans un vrai prod, on peut pré-créer les prix par tier en dashboard Stripe)
    const stripePrice = await stripe.prices.create({
      currency: 'eur',
      unit_amount: pricePerDay,
      recurring: { interval: 'day', interval_count: 1 },
      product_data: {
        name: `Sphère de Dyson — ${RANK_LABEL[rank]} (${slotX},${slotY})`,
        metadata: { tier, rank, slot_x: String(slotX), slot_y: String(slotY) },
      },
    });

    // Créer la session Stripe Checkout en mode subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      metadata: {
        slot_x: String(slotX),
        slot_y: String(slotY),
        tier,
        rank,
        email,
        advertiser_id: advertiserId,
        display_name: display_name || '',
        slogan: slogan || '',
        cta_url: cta_url || '',
        cta_text: cta_text || 'Visiter',
        image_url: image_url || '',
        primary_color: primary_color || '#00d9f5',
        background_color: background_color || '#0d1828',
        content_type: content_type || 'link',
        badge: badge || RANK_LABEL[rank].toUpperCase(),
      },
      subscription_data: {
        metadata: {
          slot_x: String(slotX),
          slot_y: String(slotY),
          tier,
          rank,
          advertiser_id: advertiserId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}?payment=success&slot=${slotX}-${slotY}&mode=subscription`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Subscribe] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Helpers locaux ───────────────────────────────────────────

export const RANK_LABEL = {
  elu:        "L'Élu",
  architecte: "L'Architecte",
  gardien:    "Le Gardien",
  batisseur:  "Le Bâtisseur",
  signal:     "Le Signal",
};

export function getRankFromTier(tier) {
  const map = {
    epicenter: 'elu',
    prestige:  'architecte',
    elite:     'architecte',
    business:  'batisseur',
    standard:  'batisseur',
    viral:     'signal',
  };
  return map[tier] || 'signal';
}
