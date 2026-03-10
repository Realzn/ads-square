// app/api/admin/route.js
// Unified admin API — sécurisé par ADMIN_SECRET en header

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

// ─── Auth middleware ──────────────────────────────────────────
function checkAdminAuth(request) {
  const token = request.headers.get('x-admin-token');
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error("[Admin] ADMIN_SECRET non défini dans les variables d'environnement Cloudflare");
    return { error: "ADMIN_SECRET manquant — ajoutez-le dans Cloudflare Pages → Settings → Environment variables", status: 500 };
  }
  if (!token || token !== secret) return { error: 'Non autorisé', status: 401 };
  return null;
}

const VALID_TIERS = ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral'];
const TIER_PRICE_CENTS = { epicenter: 100000, prestige: 10000, elite: 5000, business: 1000, standard: 300, viral: 100 };
const TIER_LABELS = { epicenter: 'ÉPICENTRE', prestige: 'PRESTIGE', elite: 'ELITE', business: 'BUSINESS', standard: 'STANDARD', viral: 'VIRAL' };

// ─── GET ──────────────────────────────────────────────────────
export async function GET(request) {
  const authErr = checkAdminAuth(request);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const supabase = createServiceClient();

  try {
    switch (action) {

      case 'stats': {
        const { data: stats } = await supabase.from('admin_platform_stats').select('*').single();
        const { data: recentBookings } = await supabase
          .from('bookings').select('created_at, amount_cents, status')
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .order('created_at', { ascending: true });
        const { data: tierStats } = await supabase.from('grid_stats').select('*');
        const { data: waitlistStats } = await supabase.from('waitlist_stats').select('*').single();
        return NextResponse.json({ stats, recentBookings, tierStats, waitlistStats });
      }

      case 'waitlist': {
        const limit  = parseInt(searchParams.get('limit') || '200');
        const { data, error } = await supabase
          .from('waitlist')
          .select('id, email, profile, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ waitlist: data || [] });
      }

      case 'bookings': {
        const status = searchParams.get('status') || 'all';
        const tier   = searchParams.get('tier')   || 'all';
        const search = searchParams.get('search') || '';
        const limit  = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');
        let query = supabase.from('admin_bookings_full').select('*')
          .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (status !== 'all') query = query.eq('status', status);
        if (tier   !== 'all') query = query.eq('tier', tier);
        if (search) query = query.or(`display_name.ilike.%${search}%,advertiser_email.ilike.%${search}%`);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ bookings: data || [] });
      }

      case 'users': {
        const search = searchParams.get('search') || '';
        const filter = searchParams.get('filter') || 'all';
        let query = supabase.from('admin_users_full').select('*').order('lifetime_value_cents', { ascending: false });
        if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
        if (filter === 'active')    query = query.gt('active_bookings', 0);
        if (filter === 'suspended') query = query.eq('is_suspended', true);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ users: data || [] });
      }

      case 'offers': {
        const { data, error } = await supabase
          .from('slot_offers')
          .select('*, bookings(display_name, slot_x, slot_y, advertiser_id, advertisers(email, display_name))')
          .order('created_at', { ascending: false }).limit(200);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ offers: data || [] });
      }

      case 'revenue': {
        const { data: monthly } = await supabase.from('admin_revenue').select('*').limit(24);
        const { data: topSpenders } = await supabase
          .from('admin_users_full').select('email, display_name, profile_type, lifetime_value_cents, total_bookings')
          .order('lifetime_value_cents', { ascending: false }).limit(10);
        return NextResponse.json({ monthly: monthly || [], topSpenders: topSpenders || [] });
      }

      case 'analytics': {
        const { data: topSlots } = await supabase
          .from('booking_stats').select('slot_x, slot_y, display_name, clicks, impressions, ctr_pct, clicks_7d')
          .eq('status', 'active').order('ctr_pct', { ascending: false }).limit(20);
        const { data: clicksByDay } = await supabase
          .from('slot_clicks').select('created_at, event_type')
          .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
          .order('created_at', { ascending: true });
        const { data: topReferrers } = await supabase
          .from('slot_clicks').select('referrer')
          .not('referrer', 'is', null)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).limit(500);
        return NextResponse.json({ topSlots: topSlots || [], clicksByDay: clicksByDay || [], topReferrers: topReferrers || [] });
      }

      case 'config': {
        // Tier config + slot-level overrides
        const { data: tiers, error: tierErr } = await supabase
          .from('tier_config').select('*').order('price_cents', { ascending: false });
        if (tierErr) return NextResponse.json({ error: tierErr.message }, { status: 500 });

        const { data: overrides } = await supabase
          .from('slot_overrides').select('*').eq('disabled', true)
          .order('updated_at', { ascending: false });

        return NextResponse.json({ tiers: tiers || [], overrides: overrides || [] });
      }

      case 'audit': {
        const { data } = await supabase
          .from('admin_actions').select('*').order('created_at', { ascending: false }).limit(100);
        return NextResponse.json({ actions: data || [] });
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Admin API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────
export async function POST(request) {
  const authErr = checkAdminAuth(request);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const supabase = createServiceClient();
  const body = await request.json();
  const { action, adminEmail = 'admin' } = body;

  const log = async (targetType, targetId, details) => {
    await supabase.from('admin_actions').insert({
      admin_email: adminEmail, action,
      target_type: targetType, target_id: String(targetId), details,
    });
  };

  try {
    switch (action) {

      case 'cancel_booking': {
        const { bookingId } = body;
        const { error } = await supabase.from('bookings')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('booking', bookingId, { reason: body.reason });
        return NextResponse.json({ ok: true });
      }

      case 'activate_booking': {
        const { bookingId } = body;
        const { error } = await supabase.from('bookings')
          .update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', bookingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('booking', bookingId, {});
        return NextResponse.json({ ok: true });
      }

      case 'extend_booking': {
        const { bookingId, extraDays } = body;
        const { data: booking } = await supabase
          .from('bookings').select('end_date, expires_at').eq('id', bookingId).single();
        const extraMs = parseInt(extraDays) * 86400 * 1000;
        let up = { updated_at: new Date().toISOString() };
        if (booking.expires_at) {
          const newExp = new Date(new Date(booking.expires_at).getTime() + extraMs);
          up.expires_at = newExp.toISOString();
          up.end_date   = newExp.toISOString().split('T')[0];
        } else {
          const newEnd = new Date(booking.end_date);
          newEnd.setDate(newEnd.getDate() + parseInt(extraDays));
          up.end_date = newEnd.toISOString().split('T')[0];
        }
        const { error } = await supabase.from('bookings').update(up).eq('id', bookingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('booking', bookingId, { extra_days: extraDays });
        return NextResponse.json({ ok: true });
      }

      case 'suspend_user': {
        const { userId, note } = body;
        const { error } = await supabase.from('advertisers')
          .update({ is_suspended: true, suspended_at: new Date().toISOString(), admin_note: note || null })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('user', userId, { note });
        return NextResponse.json({ ok: true });
      }

      case 'unsuspend_user': {
        const { userId } = body;
        const { error } = await supabase.from('advertisers')
          .update({ is_suspended: false, suspended_at: null, admin_note: null }).eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('user', userId, {});
        return NextResponse.json({ ok: true });
      }

      // ── Ouvrir/fermer un tier — UPSERT garanti ─────────────
      case 'update_tier': {
        const { tier, available } = body;
        if (!VALID_TIERS.includes(tier))
          return NextResponse.json({ error: `Tier inconnu: ${tier}` }, { status: 400 });

        const { error } = await supabase.from('tier_config').upsert({
          tier,
          available,
          label:       TIER_LABELS[tier],
          price_cents: TIER_PRICE_CENTS[tier],
          updated_at:  new Date().toISOString(),
          updated_by:  adminEmail,
        }, { onConflict: 'tier' });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('tier', tier, { available });
        return NextResponse.json({ ok: true });
      }

      // ── Désactiver un slot individuel ──────────────────────
      case 'disable_slot': {
        const { slotX, slotY, reason } = body;
        if (!slotX || !slotY) return NextResponse.json({ error: 'slotX et slotY requis' }, { status: 400 });
        const { error } = await supabase.from('slot_overrides').upsert({
          slot_x: parseInt(slotX), slot_y: parseInt(slotY),
          disabled: true, reason: reason || null,
          updated_at: new Date().toISOString(), updated_by: adminEmail,
        }, { onConflict: 'slot_x,slot_y' });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('slot', `${slotX},${slotY}`, { disabled: true, reason });
        return NextResponse.json({ ok: true });
      }

      // ── Réactiver un slot individuel ──────────────────────
      case 'enable_slot': {
        const { slotX, slotY } = body;
        if (!slotX || !slotY) return NextResponse.json({ error: 'slotX et slotY requis' }, { status: 400 });
        const { error } = await supabase.from('slot_overrides')
          .delete().eq('slot_x', parseInt(slotX)).eq('slot_y', parseInt(slotY));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('slot', `${slotX},${slotY}`, { disabled: false });
        return NextResponse.json({ ok: true });
      }

      case 'resolve_offer': {
        const { offerId, resolution } = body;
        const { error } = await supabase.from('slot_offers')
          .update({ status: resolution, updated_at: new Date().toISOString() }).eq('id', offerId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('offer', offerId, { resolution });
        return NextResponse.json({ ok: true });
      }

      case 'update_user_note': {
        const { userId, note } = body;
        const { error } = await supabase.from('advertisers').update({ admin_note: note }).eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      // ── Email blast — annonce lancement à toute la waitlist ──
      case 'launch_waitlist': {
        const { sendLaunchEmail } = await import('../../../lib/emails');

        // Récupérer tous les emails de la waitlist
        const { data: waitlistEntries, error: wErr } = await supabase
          .from('waitlist')
          .select('email')
          .order('created_at', { ascending: true });

        if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });
        if (!waitlistEntries || waitlistEntries.length === 0) {
          return NextResponse.json({ ok: true, sent: 0, message: 'Aucun email dans la waitlist.' });
        }

        let sent = 0;
        let errors = 0;

        // Envoi séquentiel (Resend rate-limit safe) avec délai de 100ms entre chaque
        for (const entry of waitlistEntries) {
          try {
            await sendLaunchEmail({ to: entry.email, lang: 'fr' }); // bilingual template
            sent++;
          } catch (e) {
            console.error(`[Admin] Launch email failed for ${entry.email}:`, e.message);
            errors++;
          }
          // Petite pause pour respecter les limites Resend
          await new Promise(r => setTimeout(r, 120));
        }

        await log('launch', 'waitlist', { sent, errors, total: waitlistEntries.length });
        return NextResponse.json({ ok: true, sent, errors, total: waitlistEntries.length });
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Admin POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}