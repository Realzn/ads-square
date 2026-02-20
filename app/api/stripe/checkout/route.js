// app/api/stripe/checkout/route.js
// Creates a Stripe Checkout session for a slot booking

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';
import { TIER_PRICE, TIER_LABEL, getTier } from '../../../../lib/grid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});



export async function POST(request) {
  try {
    const {
      slotX, slotY, tier, days = 30, email,
      // Contenu du bloc (optionnel au checkout, éditable plus tard)
      display_name, slogan, cta_url, cta_text, image_url,
      primary_color, background_color, content_type, badge,
    } = await request.json();

    // Validate input
    if (slotX == null || slotY == null || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: slotX, slotY, email' },
        { status: 400 }
      );
    }

    // Verify tier matches grid position
    const realTier = getTier(slotX, slotY);
    if (realTier !== tier) {
      return NextResponse.json(
        { error: 'Tier mismatch' },
        { status: 400 }
      );
    }

    // Check slot availability in Supabase
    const supabase = createServiceClient();
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_x', slotX)
      .eq('slot_y', slotY)
      .in('status', ['active', 'pending'])
      .lt('start_date', endDate)
      .gt('end_date', startDate);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Ce bloc est déjà réservé pour cette période' },
        { status: 409 }
      );
    }

    // Calculate price
    const pricePerDay = TIER_PRICE[tier]; // in €
    const totalCents = pricePerDay * days * 100; // Stripe uses cents

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: totalCents,
            product_data: {
              name: `Bloc ${TIER_LABEL[tier]} (${slotX},${slotY})`,
              description: `Réservation ${days} jours — ADS-SQUARE`,
              metadata: {
                slot_x: String(slotX),
                slot_y: String(slotY),
                tier,
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        slot_x: String(slotX),
        slot_y: String(slotY),
        tier,
        days: String(days),
        email,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com'}?payment=success&slot=${slotX}-${slotY}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com'}?payment=cancelled`,
    });

    // Create a pending booking in Supabase
    // (will be activated by the webhook on payment success)
    let advertiserId;

    // Find or create advertiser
    const { data: existing } = await supabase
      .from('advertisers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      advertiserId = existing.id;
    } else {
      const { data: newAdv } = await supabase
        .from('advertisers')
        .insert([{ email, display_name: email.split('@')[0], profile_type: 'creator' }])
        .select('id')
        .single();
      advertiserId = newAdv.id;
    }

    // Create pending booking
    const finalName = display_name || email.split('@')[0];
    await supabase.from('bookings').insert([{
      slot_x: slotX,
      slot_y: slotY,
      advertiser_id: advertiserId,
      status: 'pending',
      start_date: startDate,
      end_date: endDate,
      stripe_session_id: session.id,
      amount_cents: totalCents,
      display_name: finalName,
      slogan: slogan || '',
      logo_initials: finalName.substring(0, 2).toUpperCase(),
      cta_url: cta_url || '',
      cta_text: cta_text || 'Visiter',
      image_url: image_url || '',
      primary_color: primary_color || '#00d9f5',
      background_color: background_color || '#0d1828',
      content_type: content_type || 'link',
      badge: badge || 'CRÉATEUR',
    }]);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Checkout] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
