// app/api/admin/route.js
// Unified admin API — sécurisé par ADMIN_SECRET en header

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

// ─── Auth middleware ──────────────────────────────────────────
function checkAdminAuth(request) {
  const token = request.headers.get('x-admin-token');
  const secret = process.env.ADMIN_SECRET;
  // ADMIN_SECRET manquant → erreur de config (500), pas d'auth
  if (!secret) {
    console.error('[Admin] ADMIN_SECRET non défini dans les variables d'environnement Cloudflare');
    return { error: 'ADMIN_SECRET manquant — ajoutez-le dans Cloudflare Pages → Settings → Environment variables', status: 500 };
  }
  if (!token || token !== secret) return { error: 'Non autorisé', status: 401 };
  return null;
}

// ─── GET — lecture de données ─────────────────────────────────
export async function GET(request) {
  const authErr = checkAdminAuth(request);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const supabase = createServiceClient();

  try {
    switch (action) {

      // ── KPIs globaux ──────────────────────────────────────
      case 'stats': {
        const { data: stats } = await supabase
          .from('admin_platform_stats')
          .select('*')
          .single();

        // Évolution sur 30 jours
        const { data: recentBookings } = await supabase
          .from('bookings')
          .select('created_at, amount_cents, status')
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .order('created_at', { ascending: true });

        // Répartition par tier
        const { data: tierStats } = await supabase
          .from('grid_stats')
          .select('*');

        return NextResponse.json({ stats, recentBookings, tierStats });
      }

      // ── Tous les bookings ─────────────────────────────────
      case 'bookings': {
        const status = searchParams.get('status') || 'all';
        const tier   = searchParams.get('tier')   || 'all';
        const search = searchParams.get('search') || '';
        const limit  = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = supabase
          .from('admin_bookings_full')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (status !== 'all') query = query.eq('status', status);
        if (tier   !== 'all') query = query.eq('tier', tier);
        if (search) query = query.or(`display_name.ilike.%${search}%,advertiser_email.ilike.%${search}%`);

        const { data, error, count } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ bookings: data || [], count });
      }

      // ── Tous les utilisateurs ─────────────────────────────
      case 'users': {
        const search = searchParams.get('search') || '';
        const filter = searchParams.get('filter') || 'all';

        let query = supabase
          .from('admin_users_full')
          .select('*')
          .order('lifetime_value_cents', { ascending: false });

        if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
        if (filter === 'active') query = query.gt('active_bookings', 0);
        if (filter === 'suspended') query = query.eq('is_suspended', true);

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ users: data || [] });
      }

      // ── Toutes les offres de rachat ────────────────────────
      case 'offers': {
        const { data, error } = await supabase
          .from('slot_offers')
          .select(`
            *,
            bookings(display_name, slot_x, slot_y, advertiser_id,
              advertisers(email, display_name))
          `)
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ offers: data || [] });
      }

      // ── Revenus ────────────────────────────────────────────
      case 'revenue': {
        const { data: monthly } = await supabase
          .from('admin_revenue')
          .select('*')
          .limit(24);

        const { data: topSpenders } = await supabase
          .from('admin_users_full')
          .select('email, display_name, profile_type, lifetime_value_cents, total_bookings')
          .order('lifetime_value_cents', { ascending: false })
          .limit(10);

        return NextResponse.json({ monthly: monthly || [], topSpenders: topSpenders || [] });
      }

      // ── Analytics clics ────────────────────────────────────
      case 'analytics': {
        // Top 20 slots par CTR
        const { data: topSlots } = await supabase
          .from('booking_stats')
          .select('slot_x, slot_y, display_name, clicks, impressions, ctr_pct, clicks_7d')
          .eq('status', 'active')
          .order('ctr_pct', { ascending: false })
          .limit(20);

        // Clics des 14 derniers jours (groupés par jour)
        const { data: clicksByDay } = await supabase
          .from('slot_clicks')
          .select('created_at, event_type')
          .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
          .order('created_at', { ascending: true });

        // Top referrers
        const { data: topReferrers } = await supabase
          .from('slot_clicks')
          .select('referrer')
          .not('referrer', 'is', null)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .limit(500);

        return NextResponse.json({ topSlots: topSlots || [], clicksByDay: clicksByDay || [], topReferrers: topReferrers || [] });
      }

      // ── Config des tiers ────────────────────────────────────
      case 'config': {
        const { data } = await supabase.from('tier_config').select('*').order('price_cents', { ascending: false });
        return NextResponse.json({ tiers: data || [] });
      }

      // ── Actions audit log ───────────────────────────────────
      case 'audit': {
        const { data } = await supabase
          .from('admin_actions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
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

// ─── POST — mutations ─────────────────────────────────────────
export async function POST(request) {
  const authErr = checkAdminAuth(request);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const supabase = createServiceClient();
  const body = await request.json();
  const { action, adminEmail = 'admin' } = body;

  const log = async (targetType, targetId, details) => {
    await supabase.from('admin_actions').insert({
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: String(targetId),
      details,
    });
  };

  try {
    switch (action) {

      // ── Annuler un booking ─────────────────────────────────
      case 'cancel_booking': {
        const { bookingId } = body;
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', bookingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('booking', bookingId, { reason: body.reason });
        return NextResponse.json({ ok: true });
      }

      // ── Forcer activation d'un booking ────────────────────
      case 'activate_booking': {
        const { bookingId } = body;
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', bookingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('booking', bookingId, {});
        return NextResponse.json({ ok: true });
      }

      // ── Prolonger un booking ───────────────────────────────
      case 'extend_booking': {
        const { bookingId, extraDays } = body;
        const { data: booking } = await supabase
          .from('bookings').select('end_date').eq('id', bookingId).single();
        const newEnd = new Date(booking.end_date);
        newEnd.setDate(newEnd.getDate() + parseInt(extraDays));
        const { error } = await supabase
          .from('bookings')
          .update({ end_date: newEnd.toISOString().split('T')[0], updated_at: new Date().toISOString() })
          .eq('id', bookingId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('booking', bookingId, { extra_days: extraDays });
        return NextResponse.json({ ok: true });
      }

      // ── Suspendre un utilisateur ───────────────────────────
      case 'suspend_user': {
        const { userId, note } = body;
        const { error } = await supabase
          .from('advertisers')
          .update({ is_suspended: true, suspended_at: new Date().toISOString(), admin_note: note || null })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('user', userId, { note });
        return NextResponse.json({ ok: true });
      }

      // ── Réactiver un utilisateur ───────────────────────────
      case 'unsuspend_user': {
        const { userId } = body;
        const { error } = await supabase
          .from('advertisers')
          .update({ is_suspended: false, suspended_at: null, admin_note: null })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('user', userId, {});
        return NextResponse.json({ ok: true });
      }

      // ── Ouvrir/fermer un tier ──────────────────────────────
      case 'update_tier': {
        const { tier, available } = body;
        const { error } = await supabase
          .from('tier_config')
          .update({ available, updated_at: new Date().toISOString(), updated_by: adminEmail })
          .eq('tier', tier);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('tier', tier, { available });
        return NextResponse.json({ ok: true });
      }

      // ── Accepter/rejeter une offre de rachat ───────────────
      case 'resolve_offer': {
        const { offerId, resolution } = body; // 'accepted' | 'rejected'
        const { error } = await supabase
          .from('slot_offers')
          .update({ status: resolution, updated_at: new Date().toISOString() })
          .eq('id', offerId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await log('offer', offerId, { resolution });
        return NextResponse.json({ ok: true });
      }

      // ── Modifier note admin sur user ───────────────────────
      case 'update_user_note': {
        const { userId, note } = body;
        const { error } = await supabase
          .from('advertisers')
          .update({ admin_note: note })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Admin POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
