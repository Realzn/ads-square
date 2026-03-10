// app/api/slot/route.js
// Données publiques d'un slot pour les pages SEO

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const x = parseInt(searchParams.get('x'));
  const y = parseInt(searchParams.get('y'));

  if (isNaN(x) || isNaN(y) || x < 0 || x > 36 || y < 0 || y > 36) {
    return NextResponse.json({ error: 'Coordonnées invalides' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Booking actif du slot
  const { data: booking } = await supabase
    .from('active_slots')
    .select('*')
    .eq('x', x)
    .eq('y', y)
    .single();

  // Stats du slot
  const { data: stats } = await supabase
    .from('booking_stats')
    .select('clicks, impressions, ctr_pct, clicks_7d, clicks_30d')
    .eq('slot_x', x)
    .eq('slot_y', y)
    .eq('status', 'active')
    .single();

  // Historique des bookings sur ce slot
  const { data: history } = await supabase
    .from('bookings')
    .select('display_name, badge, start_date, end_date, status, slogan, tier')
    .eq('slot_x', x)
    .eq('slot_y', y)
    .in('status', ['active', 'expired'])
    .order('created_at', { ascending: false })
    .limit(10);

  // Voisins actifs (pour la section "Découvrir")
  const { data: neighbors } = await supabase
    .from('active_slots')
    .select('x, y, display_name, primary_color, badge, cta_url, is_occupied')
    .gte('x', Math.max(0, x - 2))
    .lte('x', Math.min(36, x + 2))
    .gte('y', Math.max(0, y - 2))
    .lte('y', Math.min(36, y + 2))
    .eq('is_occupied', true)
    .neq('x', x);

  return NextResponse.json({
    slot: { x, y, tier: booking?.tier || getTier(x, y) },
    booking: booking?.is_occupied ? booking : null,
    stats: stats || null,
    history: history || [],
    neighbors: (neighbors || []).slice(0, 6),
  });
}

function getTier(x, y) {
  const cx = 18, cy = 18;
  const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
  if (d === 0) return 'epicenter';
  if (d <= 2) return 'prestige';
  if (d <= 5) return 'elite';
  if (d <= 10) return 'business';
  if (d <= 15) return 'standard';
  return 'viral';
}
