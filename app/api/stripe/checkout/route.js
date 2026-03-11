// app/api/stripe/checkout/route.js
// Creates a Stripe Checkout session for a slot booking

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '../../../../lib/supabase-server';
import { TIER_PRICE, TIER_LABEL, getTier, isTierAvailable } from '../../../../lib/grid';

// ✅ Lazy init — process.env not available at module load time on CF Workers



export async function POST(request) {
  // ✅ Lazy init inside handler — env vars available here on CF Workers
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const {
      slotX, slotY, tier, days = 30, email,
      // Contenu du bloc (optionnel au checkout, éditable plus tard)
      display_name, slogan, cta_url, cta_text, image_url,
      primary_color, background_color, content_type, badge,
      // Merged block support
      merge_config,  // { x1, y1, x2, y2, slots: [{x,y,tier},...] }
      totalCents: overrideTotalCents, // pre-calculated total for merged blocks
      // Duration discount
      billing_type, discount_pct = 0,
    } = await request.json();

    // Support both single-slot (slotX/slotY) and anchor of merged block
    const anchorX = slotX;
    const anchorY = slotY;

    // Validate input
    if (anchorX == null || anchorY == null || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: slotX, slotY, email' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // For merged blocks, validate all slots in merge_config; for single slots, use normal flow
    const isMerged = !!merge_config;

    // Validate anchor tier
    const realTier = getTier(anchorX, anchorY);

    if (!isMerged && tier && realTier !== tier) {
      return NextResponse.json(
        { error: 'Tier mismatch' },
        { status: 400 }
      );
    }

    // Vérifier la disponibilité depuis la DB (tier_config)
    const { data: tierCfg } = await supabase
      .from('tier_config')
      .select('available')
      .eq('tier', realTier)
      .maybeSingle();

    const tierAvailable = tierCfg ? tierCfg.available : isTierAvailable(realTier);
    if (!tierAvailable) {
      return NextResponse.json(
        { error: `Les blocs ${TIER_LABEL[realTier]} arrivent prochainement. Restez connecté !` },
        { status: 403 }
      );
    }

    const now       = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate   = new Date(now.getTime() + days * 86400000).toISOString().split('T')[0];

    if (isMerged) {
      // For merged blocks, check conflicts for ALL slots in the rectangle
      const slotsToCheck = merge_config.slots || [];
      for (const s of slotsToCheck) {
        const { data: conflicts } = await supabase
          .from('bookings')
          .select('id')
          .eq('slot_x', s.x)
          .eq('slot_y', s.y)
          .in('status', ['active', 'pending'])
          .or(`expires_at.gt.${now.toISOString()},and(expires_at.is.null,end_date.gte.${startDate})`);
        if (conflicts && conflicts.length > 0) {
          return NextResponse.json(
            { error: `Le bloc (${s.x},${s.y}) est déjà réservé` },
            { status: 409 }
          );
        }
      }
    } else {
      // Single-slot conflict check
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('slot_x', anchorX)
        .eq('slot_y', anchorY)
        .in('status', ['active', 'pending'])
        .or(`expires_at.gt.${now.toISOString()},and(expires_at.is.null,end_date.gte.${startDate})`);
      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: 'Ce bloc est déjà réservé pour cette période' },
          { status: 409 }
        );
      }
    }

    // Calculate price
    // For merged blocks, totalCents is pre-calculated by the frontend (sum of all tier prices)
    // For single slots, calculate normally and apply duration discount
    const pricePerDay = TIER_PRICE[realTier];
    const rawCents    = pricePerDay * days;
    const discountedCents = Math.round(rawCents * (1 - Math.min(Math.max(discount_pct, 0), 0.5)));
    const totalCents  = isMerged && overrideTotalCents
      ? overrideTotalCents
      : discountedCents; // in cents — do NOT multiply by 100 again

    // Human-readable billing label for Stripe description
    const billingLabel = billing_type === 'annuel' ? ' · ANNUEL −15%'
      : billing_type === 'mensuel'  ? ' · MENSUEL −10%'
      : billing_type === 'hebdo'    ? ' · HEBDOMADAIRE −5%'
      : '';

    // Create Stripe Checkout Session
    const blockLabel = isMerged
      ? `Bloc fusionné ${merge_config.x2 - merge_config.x1 + 1}×${merge_config.y2 - merge_config.y1 + 1} (${anchorX},${anchorY})`
      : `Bloc ${TIER_LABEL[realTier]} (${anchorX},${anchorY})`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: totalCents,
            product_data: {
              name: blockLabel,
              description: `Réservation ${days} jours${billingLabel} — AdsMostFair`,
              metadata: {
                slot_x: String(anchorX),
                slot_y: String(anchorY),
                tier: realTier,
                is_merged: String(isMerged),
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        slot_x: String(anchorX),
        slot_y: String(anchorY),
        tier: realTier,
        days: String(days),
        email,
        is_merged: String(isMerged),
        billing_type: billing_type || 'comptant',
        discount_pct: String(discount_pct || 0),
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://adsmostfair.com'}/merci?slot=${anchorX}-${anchorY}&email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://adsmostfair.com'}?payment=cancelled`,
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

    // Create pending booking — single anchor row for merged blocks (ghosts derived from merge_config)
    const finalName = display_name || email.split('@')[0];
    await supabase.from('bookings').insert([{
      slot_x: anchorX,
      slot_y: anchorY,
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
      billing_type: billing_type || 'comptant',
      ...(isMerged ? { merge_config } : {}),
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