import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
      .select('id, status, end_date')
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

    // TODO: send notification email to current occupant
    // await sendOfferNotificationEmail({ booking, offer, buyerEmail, buyerName, offerCents });

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
