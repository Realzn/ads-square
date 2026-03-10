// app/api/leaderboard/route.js
// Classement public : top slots par clics, streaks, revenus

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d'; // '7d' | '30d' | 'all'
  const category = searchParams.get('category') || 'clicks'; // 'clicks' | 'streaks' | 'revenue'

  const supabase = createServiceClient();

  try {
    let data = [];

    if (category === 'clicks') {
      const interval = period === '7d' ? '7 days' : period === '30d' ? '30 days' : '999 days';
      const { data: clicks, error } = await supabase.rpc('get_top_slots_by_clicks', {
        p_interval: interval,
        p_limit: 20
      });
      if (error) {
        // Fallback : query directe si la fonction RPC n'existe pas encore
        const { data: raw } = await supabase
          .from('booking_stats')
          .select('booking_id, slot_x, slot_y, display_name, clicks_7d, clicks_30d, impressions_7d, ctr_pct, status')
          .eq('status', 'active')
          .order(period === '7d' ? 'clicks_7d' : 'clicks_30d', { ascending: false })
          .limit(20);
        data = (raw || []).map((r, i) => ({
          rank: i + 1,
          slot_x: r.slot_x,
          slot_y: r.slot_y,
          display_name: r.display_name,
          value: period === '7d' ? r.clicks_7d : r.clicks_30d,
          secondary: `CTR ${r.ctr_pct}%`,
          label: 'clics',
        }));
      } else {
        data = clicks || [];
      }
    }

    if (category === 'streaks') {
      const { data: raw } = await supabase
        .from('subscriptions')
        .select('advertiser_id, slot_x, slot_y, tasks_streak, rank, tier, advertisers(display_name)')
        .eq('status', 'active')
        .order('tasks_streak', { ascending: false })
        .limit(20);
      data = (raw || []).map((r, i) => ({
        rank: i + 1,
        slot_x: r.slot_x,
        slot_y: r.slot_y,
        display_name: r.advertisers?.display_name || 'Anonyme',
        value: r.tasks_streak,
        secondary: r.rank?.toUpperCase() || 'SIGNAL',
        label: 'jours consécutifs',
        tier: r.tier,
      }));
    }

    if (category === 'revenue') {
      const { data: raw } = await supabase
        .from('bookings')
        .select('slot_x, slot_y, display_name, amount_cents, tier, status')
        .eq('status', 'active')
        .order('amount_cents', { ascending: false })
        .limit(20);
      data = (raw || []).map((r, i) => ({
        rank: i + 1,
        slot_x: r.slot_x,
        slot_y: r.slot_y,
        display_name: r.display_name,
        value: r.amount_cents,
        secondary: r.tier?.toUpperCase() || '',
        label: 'investis',
        tier: r.tier,
      }));
    }

    // Stats globales pour l'en-tête
    const { data: globalStats } = await supabase
      .from('grid_stats')
      .select('*');

    const { count: totalClicks } = await supabase
      .from('slot_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click');

    return NextResponse.json({
      entries: data,
      meta: {
        period,
        category,
        total_clicks: totalClicks || 0,
        grid_stats: globalStats || [],
        generated_at: new Date().toISOString(),
      }
    });

  } catch (err) {
    console.error('[Leaderboard]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
