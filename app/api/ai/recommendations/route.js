import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function isAdmin(request) {
  const token = request.headers.get('x-admin-token');
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return token === secret;
}

async function resolveAdvertiserIdFromToken(token) {
  if (!token) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return null;

  const supabase = createServiceClient();
  let { data: advertiser } = await supabase
    .from('advertisers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!advertiser) {
    ({ data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle());
  }

  if (!advertiser && user.email) {
    ({ data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('email', user.email)
      .maybeSingle());
  }

  return advertiser?.id || null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'advertiser';
    const status = searchParams.get('status') || 'proposed';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const supabase = createServiceClient();

    if (scope === 'admin') {
      if (!isAdmin(request)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*, ai_actions(*)')
        .eq('status', status)
        .order('priority', { ascending: true })
        .order('recommended_at', { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ scope, recommendations: data || [] });
    }

    if (scope === 'public') {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('id, agent_type, priority, score, title, description, recommended_at')
        .is('advertiser_id', null)
        .eq('status', status)
        .order('priority', { ascending: true })
        .order('recommended_at', { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ scope, recommendations: data || [] });
    }

    const token = searchParams.get('token');
    const advertiserId = await resolveAdvertiserIdFromToken(token);
    if (!advertiserId) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*, ai_actions(*)')
      .eq('advertiser_id', advertiserId)
      .in('status', ['proposed', 'approved'])
      .order('priority', { ascending: true })
      .order('recommended_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      scope: 'advertiser',
      advertiser_id: advertiserId,
      recommendations: data || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
