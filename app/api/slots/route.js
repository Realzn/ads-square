/**
 * /api/slots — Proxy Supabase queries through Next.js to avoid ad-blocker interception.
 * URLs containing "bookings", "advertiser_id", "is_boosted" are blocked by most ad-blockers
 * (uBlock Origin, AdGuard, Ghostery…). Routing through /api/slots hides those parameters.
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// GET /api/slots?type=user_reservations&uid=<uuid>
// GET /api/slots?type=stats&ids=<id1,id2,...>
// GET /api/slots?type=activity&x=<x>&y=<y>&limit=<n>
// GET /api/slots?type=slot_stats&x=<x>&y=<y>
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    const sb = getServiceClient();

    // ── User active reservations (replaces direct bookings fetch) ──────────
    if (type === 'user_reservations') {
      const uid = searchParams.get('uid');
      if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

      const { data, error } = await sb
        .from('bookings')
        .select('id, slot_x, slot_y, status, is_boosted')
        .eq('advertiser_id', uid)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // ── Booking stats (replaces direct booking_stats fetch) ─────────────
    if (type === 'stats') {
      const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
      if (!ids.length) return NextResponse.json([]);

      const { data, error } = await sb
        .from('booking_stats')
        .select('clicks, impressions, ctr_pct, clicks_7d, impressions_7d')
        .in('booking_id', ids);

      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // ── Slot activity log (replaces direct slot_clicks fetch) ────────────
    if (type === 'activity') {
      const x     = parseInt(searchParams.get('x'), 10);
      const y     = parseInt(searchParams.get('y'), 10);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

      if (isNaN(x) || isNaN(y)) return NextResponse.json({ error: 'Missing coords' }, { status: 400 });

      const { data, error } = await sb
        .from('slot_clicks')
        .select('*')
        .eq('slot_x', x)
        .eq('slot_y', y)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // ── Slot stats summary (replaces direct slot_clicks?select=event_type) ─
    if (type === 'slot_stats') {
      const x = parseInt(searchParams.get('x'), 10);
      const y = parseInt(searchParams.get('y'), 10);

      if (isNaN(x) || isNaN(y)) return NextResponse.json({ error: 'Missing coords' }, { status: 400 });

      const { data, error } = await sb
        .from('slot_clicks')
        .select('event_type')
        .eq('slot_x', x)
        .eq('slot_y', y);

      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // ── Heatmap click data (replaces direct slot_clicks fetch in admin) ────
    if (type === 'heatmap') {
      const limit = Math.min(parseInt(searchParams.get('limit') || '100000', 10), 100000);
      const since = searchParams.get('since');

      let query = sb
        .from('slot_clicks')
        .select('slot_x, slot_y')
        .eq('event_type', 'click')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (since) query = query.gte('created_at', since);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // ── Platform-wide stats summary (replaces global slot_clicks?select=event_type) ──
    if (type === 'platform_stats') {
      const { data, error } = await sb
        .from('slot_clicks')
        .select('event_type');

      if (error) throw error;
      const rows = data ?? [];
      return NextResponse.json({
        impressions: rows.filter(r => r.event_type === 'impression').length,
        clicks:      rows.filter(r => r.event_type === 'click').length,
      });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  } catch (err) {
    console.error('[/api/slots]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
