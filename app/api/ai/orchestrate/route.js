import { NextResponse } from 'next/server';
import { runAIOrchestrator } from '../../../../lib/ai/orchestrator';

export const dynamic = 'force-dynamic';

function checkOrchestrateAuth(request) {
  const bearer = request.headers.get('authorization');
  const cron = request.headers.get('x-cron-token');
  const admin = request.headers.get('x-admin-token');
  const token = cron || admin || bearer?.replace('Bearer ', '');

  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!secret) return true;
  return token === secret;
}

export async function POST(request) {
  if (!checkOrchestrateAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await runAIOrchestrator({
      triggerType: body.triggerType || 'manual',
      inputPayload: body.inputPayload || {},
      autoExecute: Boolean(body.autoExecute),
      actor: body.actor || 'api.ai.orchestrate',
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (err) {
    console.error('[AI/Orchestrate] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  if (!checkOrchestrateAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    endpoint: 'AI orchestrator',
    mode: process.env.AI_AGENTS_MODE || 'recommend_only',
    enabled: (process.env.AI_AGENTS_ENABLED || 'true').toLowerCase() !== 'false',
  });
}
