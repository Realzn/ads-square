import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../../../lib/supabase-server';
import { executeAIAction } from '../../../../../lib/ai/action-executor';

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

export async function POST(request) {
  try {
    const body = await request.json();
    const admin = isAdmin(request);
    const supabase = createServiceClient();

    let actionId = body.actionId || null;

    if (!actionId && body.recommendationId) {
      const { data: action } = await supabase
        .from('ai_actions')
        .select('id')
        .eq('recommendation_id', body.recommendationId)
        .in('status', ['queued', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      actionId = action?.id || null;
    }

    if (!actionId) {
      return NextResponse.json({ error: 'actionId ou recommendationId requis' }, { status: 400 });
    }

    if (!admin) {
      const advertiserId = await resolveAdvertiserIdFromToken(body.token);
      if (!advertiserId) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
      }

      const { data: action } = await supabase
        .from('ai_actions')
        .select('id, recommendation_id, ai_recommendations(advertiser_id)')
        .eq('id', actionId)
        .maybeSingle();

      const ownerId = action?.ai_recommendations?.advertiser_id;
      if (!action || ownerId !== advertiserId) {
        return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 });
      }

      const result = await executeAIAction({
        actionId,
        actor: `advertiser:${advertiserId}`,
        manualApproval: true,
        dryRun: Boolean(body.dryRun),
        idempotencyKey: body.idempotencyKey,
      });

      return NextResponse.json({ ok: true, result });
    }

    const result = await executeAIAction({
      actionId,
      actor: body.actor || 'admin',
      manualApproval: body.approve !== false,
      dryRun: Boolean(body.dryRun),
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
