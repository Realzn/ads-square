// app/api/cron/remind/route.js
// Envoie un email de rappel aux annonceurs dont le bloc expire dans ~3 jours
// Appelé chaque jour par cron-job.org (même token que /api/cron/expire)
//
// Configurer sur cron-job.org :
//   URL      : https://ads-square.pages.dev/api/cron/remind
//   Header   : x-cron-token: <CRON_SECRET>
//   Schedule : 0 9 * * * (chaque matin à 09:00 UTC)

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { sendExpiryReminder, sendExpiryNotification } from '../../../../lib/emails';

const TIER_PRICE = {
  one: 1000, ten: 100, corner_ten: 100, hundred: 10, thousand: 1,
};

export async function GET(request) {
  const token  = request.headers.get('x-cron-token')
    || new URL(request.url).searchParams.get('token');
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 });
  if (token !== secret) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const supabase  = createServiceClient();
    const now       = new Date();

    // ── 1. Rappels J-3 : expire entre 71h et 73h à partir de maintenant ──
    const in71h = new Date(now.getTime() + 71 * 3600 * 1000).toISOString();
    const in73h = new Date(now.getTime() + 73 * 3600 * 1000).toISOString();

    const { data: expiringSoon } = await supabase
      .from('bookings')
      .select('id, tier, slot_x, slot_y, display_name, expires_at, end_date, advertiser_id')
      .eq('status', 'active')
      .gte('expires_at', in71h)
      .lte('expires_at', in73h);

    let remindsSent = 0;
    const remindErrors = [];

    for (const booking of expiringSoon || []) {
      // Récupérer l'email de l'annonceur
      const { data: adv } = await supabase
        .from('advertisers')
        .select('email, display_name')
        .eq('id', booking.advertiser_id)
        .maybeSingle();

      if (!adv?.email) continue;

      // Vérifier qu'on n'a pas déjà envoyé ce rappel (éviter doublons si cron tourne plusieurs fois)
      const remindKey = `remind_sent_${booking.id}`;
      const { data: alreadySent } = await supabase
        .from('bookings')
        .select('remind_sent_at')
        .eq('id', booking.id)
        .maybeSingle();

      if (alreadySent?.remind_sent_at) continue; // déjà notifié

      const result = await sendExpiryReminder({
        to:          adv.email,
        displayName: adv.display_name || adv.email.split('@')[0],
        tier:        booking.tier,
        slotX:       booking.slot_x,
        slotY:       booking.slot_y,
        expiresAt:   booking.expires_at || booking.end_date,
        pricePerDay: TIER_PRICE[booking.tier] || 1,
      });

      if (result.ok) {
        remindsSent++;
        // Marquer comme notifié (colonne remind_sent_at — ajoutée par migration 013)
        await supabase
          .from('bookings')
          .update({ remind_sent_at: now.toISOString() })
          .eq('id', booking.id);
      } else {
        remindErrors.push({ bookingId: booking.id, error: result.error });
      }
    }

    // ── 2. Notifications d'expiration (bookings qui viennent d'être expirés) ──
    //    On cherche les bookings expirés dans les dernières 2h (pour ne pas re-notifier)
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();

    const { data: recentlyExpired } = await supabase
      .from('bookings')
      .select('id, tier, slot_x, slot_y, display_name, expires_at, end_date, advertiser_id, expiry_notif_sent_at')
      .eq('status', 'expired')
      .gte('updated_at', twoHoursAgo)
      .is('expiry_notif_sent_at', null); // pas encore notifié

    let expiredSent = 0;

    for (const booking of recentlyExpired || []) {
      const { data: adv } = await supabase
        .from('advertisers')
        .select('email, display_name')
        .eq('id', booking.advertiser_id)
        .maybeSingle();

      if (!adv?.email) continue;

      const result = await sendExpiryNotification({
        to:          adv.email,
        displayName: adv.display_name || adv.email.split('@')[0],
        tier:        booking.tier,
        slotX:       booking.slot_x,
        slotY:       booking.slot_y,
        expiredAt:   booking.expires_at || booking.end_date,
      });

      if (result.ok) {
        expiredSent++;
        await supabase
          .from('bookings')
          .update({ expiry_notif_sent_at: now.toISOString() })
          .eq('id', booking.id);
      }
    }

    const summary = {
      ok:              true,
      ran_at:          now.toISOString(),
      reminders_sent:  remindsSent,
      expiry_notifs:   expiredSent,
      remind_errors:   remindErrors.length,
    };

    console.log('[Cron/Remind]', summary);
    return NextResponse.json(summary);

  } catch (err) {
    console.error('[Cron/Remind] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = GET;
