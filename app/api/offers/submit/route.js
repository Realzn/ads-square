import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendOfferNotification } from '../../../../lib/emails';

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { slotX, slotY, bookingId, offerCents, buyerEmail, buyerName, message } = await req.json();

    // Validate
    if (!slotX == null || slotY == null) return NextResponse.json({ error: 'Missing slot' }, { status: 400 });
    if (!buyerEmail?.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (!offerCents || offerCents < 100) return NextResponse.json({ error: 'Offer too low' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });

    // Verify the target booking is still active
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, status, end_date, tier, advertiser_id')
      .eq('id', bookingId)
      .eq('status', 'active')
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Slot is no longer occupied or booking not found' }, { status: 409 });
    }

    // Check no existing pending offer from same email
    const { data: existing } = await supabase
      .from('slot_offers')
      .select('id')
      .eq('slot_x', slotX)
      .eq('slot_y', slotY)
      .eq('buyer_email', buyerEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending offer on this slot' }, { status: 409 });
    }

    // Insert the offer
    const { data: offer, error: insertErr } = await supabase
      .from('slot_offers')
      .insert({
        slot_x:            slotX,
        slot_y:            slotY,
        target_booking_id: bookingId,
        buyer_email:       buyerEmail,
        buyer_name:        buyerName || null,
        offer_amount_cents: offerCents,
        message:           message || null,
      })
      .select('id, expires_at')
      .single();

    if (insertErr) {
      console.error('[Offers] Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to submit offer' }, { status: 500 });
    }

    // ── Notifier l'occupant actuel par email ──
    // On récupère son email depuis la table advertisers
    try {
      const { data: advertiser } = await supabase
        .from('advertisers')
        .select('email, display_name')
        .eq('id', booking.advertiser_id)
        .maybeSingle();

      if (advertiser?.email) {
        await sendOfferNotification({
          to:             advertiser.email,
          occupantName:   advertiser.display_name || advertiser.email.split('@')[0],
          tier:           booking.tier,
          slotX:          slotX,
          slotY:          slotY,
          buyerName:      buyerName,
          offerCents:     offerCents,
          message:        message,
          offerExpiresAt: offer.expires_at,
        });
      }
    } catch (emailErr) {
      // Email failure non-bloquant — l'offre est quand même enregistrée
      console.error('[Offers] Email send failed:', emailErr.message);
    }

    return NextResponse.json({
      ok: true,
      offerId: offer.id,
      expiresAt: offer.expires_at,
    });
  } catch (err) {
    console.error('[Offers] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
