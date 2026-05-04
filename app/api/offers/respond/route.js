// app/api/offers/respond/route.js
// Accept or reject a buyout offer (called from advertiser dashboard)

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ingestAIEvent } from '../../../../lib/ai/events';
import { runAIOrchestrator } from '../../../../lib/ai/orchestrator';

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { offerId, action, userId } = await req.json();

    if (!offerId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify the offer exists and belongs to this user's booking
    const { data: offer, error: offerErr } = await supabase
      .from('slot_offers')
      .select('id, status, target_booking_id, offer_amount_cents, buyer_email, buyer_name')
      .eq('id', offerId)
      .eq('status', 'pending')
      .single();

    if (offerErr || !offer) {
      return NextResponse.json({ error: 'Offer not found or already processed' }, { status: 404 });
    }

    // Verify ownership — check that the booking belongs to this advertiser
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, advertiser_id, slot_x, slot_y')
      .eq('id', offer.target_booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify via advertisers table that userId matches
    let { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', userId)
      .eq('id', booking.advertiser_id)
      .maybeSingle();

    if (!advertiser) {
      ({ data: advertiser } = await supabase
        .from('advertisers')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('id', booking.advertiser_id)
        .maybeSingle());
    }

    if (!advertiser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update offer status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { error: updateErr } = await supabase
      .from('slot_offers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', offerId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // If accepted: cancel all other pending offers on the same slot
    if (action === 'accept') {
      await supabase
        .from('slot_offers')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('slot_x', booking.slot_x)
        .eq('slot_y', booking.slot_y)
        .eq('status', 'pending')
        .neq('id', offerId);
    }

    await ingestAIEvent({
      eventType: 'offer_responded',
      eventSource: 'offers.respond',
      entityType: 'offer',
      entityId: offerId,
      advertiserId: booking.advertiser_id,
      bookingId: booking.id,
      payload: {
        action,
        new_status: newStatus,
        offer_amount_cents: offer.offer_amount_cents,
      },
    });

    await runAIOrchestrator({
      triggerType: 'offer_responded',
      inputPayload: { offerId, status: newStatus },
      autoExecute: false,
      actor: 'offers.respond',
    }).catch(() => {});

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('[Offers/Respond] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
