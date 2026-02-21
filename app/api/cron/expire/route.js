// app/api/cron/expire/route.js
// Expire les bookings dont end_date est dépassée
// Appelé par un cron externe (cron-job.org, Cloudflare Cron, etc.)
// Sécurisé par CRON_SECRET (ou ADMIN_SECRET en fallback)

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

export async function GET(request) {
  const token = request.headers.get('x-cron-token')
    || new URL(request.url).searchParams.get('token');

  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 });
  }
  if (token !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Expirer les bookings actifs dont expires_at (ou end_date) est passée
    //    On utilise expires_at en priorité (précis à la seconde)
    //    Fallback sur end_date pour les anciens bookings
    const nowIso = new Date().toISOString();
    const { data: expiredA, error: errA } = await supabase
      .from('bookings')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lte('expires_at', nowIso)
      .select('id, slot_x, slot_y, display_name, expires_at');

    const { data: expiredB, error: errB } = await supabase
      .from('bookings')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('status', 'active')
      .is('expires_at', null)
      .lte('end_date', today)
      .select('id, slot_x, slot_y, display_name, end_date');

    const expireError = errA || errB;
    const expired = [...(expiredA || []), ...(expiredB || [])];

    if (expireError) throw expireError;

    // 2. Expirer les offres de rachat périmées
    const { data: expiredOffers, error: offersError } = await supabase
      .from('slot_offers')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (offersError) console.error('[Cron] Offers expire error:', offersError.message);

    const result = {
      ok: true,
      ran_at: new Date().toISOString(),
      expired_bookings: expired?.length ?? 0,
      expired_offers: expiredOffers?.length ?? 0,
      details: expired?.map(b => ({
        id: b.id,
        slot: `(${b.slot_x},${b.slot_y})`,
        name: b.display_name,
        expired_at: b.expires_at || b.end_date,
      })) ?? [],
    };

    console.log('[Cron] expire run:', result);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Cron] expire error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = GET;
