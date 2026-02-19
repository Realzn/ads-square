import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { slotX, slotY, bookingId, event = 'click', referrer } = await req.json();

    if (slotX == null || slotY == null) {
      return NextResponse.json({ error: 'Missing slot coords' }, { status: 400 });
    }

    // Build a privacy-safe session hash: sha256(ip + date + user-agent)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ua = req.headers.get('user-agent') || '';
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD only
    const sessionHash = createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 16);

    await supabase.rpc('record_click', {
      p_slot_x:       slotX,
      p_slot_y:       slotY,
      p_booking_id:   bookingId || null,
      p_event_type:   event,
      p_session_hash: sessionHash,
      p_referrer:     referrer || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never fail visibly — tracking errors are silent
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
