// app/api/community/route.js
// GET  : récupérer le fil communautaire
// POST : liker une entrée du fil

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

// GET /api/community?page=0&limit=20&action_type=highlight
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '20');
  const actionType = searchParams.get('action_type') || null;
  const rank = searchParams.get('rank') || null;

  const supabase = createServiceClient();

  let query = supabase
    .from('community_feed_enriched')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (actionType) query = query.eq('action_type', actionType);
  if (rank) query = query.eq('rank', rank);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feed: data || [], page, limit });
}

// POST /api/community — liker une entrée
export async function POST(request) {
  try {
    const { feed_id, advertiser_id } = await request.json();
    if (!feed_id || !advertiser_id) {
      return NextResponse.json({ error: 'feed_id et advertiser_id requis' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Vérifier si déjà liké
    const { data: existing } = await supabase
      .from('community_likes')
      .select('advertiser_id')
      .eq('feed_id', feed_id)
      .eq('advertiser_id', advertiser_id)
      .single();

    if (existing) {
      // Unlike
      await supabase.from('community_likes').delete()
        .eq('feed_id', feed_id).eq('advertiser_id', advertiser_id);
      await supabase.from('community_feed')
        .update({ likes_count: supabase.raw('likes_count - 1') })
        .eq('id', feed_id);
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await supabase.from('community_likes').insert([{ feed_id, advertiser_id }]);
      await supabase.from('community_feed')
        .update({ likes_count: supabase.raw('likes_count + 1') })
        .eq('id', feed_id);
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
