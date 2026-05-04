import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function checkAdminAuth(request) {
  const token = request.headers.get('x-admin-token');
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return token === secret;
}

export async function GET(request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 90);
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const supabase = createServiceClient();

    const [metricsRes, runsRes, recoRes, actionRes] = await Promise.all([
      supabase
        .from('ai_business_metrics_daily')
        .select('*')
        .gte('metric_date', from)
        .order('metric_date', { ascending: true }),
      supabase
        .from('ai_agent_runs')
        .select('id, agent_type, status, started_at')
        .gte('started_at', new Date(Date.now() - days * 86400000).toISOString())
        .order('started_at', { ascending: false })
        .limit(200),
      supabase
        .from('ai_recommendations')
        .select('id, status, agent_type, recommended_at')
        .gte('recommended_at', new Date(Date.now() - days * 86400000).toISOString()),
      supabase
        .from('ai_action_executions')
        .select('id, execution_status, executed_at')
        .gte('executed_at', new Date(Date.now() - days * 86400000).toISOString()),
    ]);

    const runs = runsRes.data || [];
    const recommendations = recoRes.data || [];
    const executions = actionRes.data || [];

    const summary = {
      runs_total: runs.length,
      runs_failed: runs.filter((r) => r.status === 'failed').length,
      recommendations_total: recommendations.length,
      recommendations_open: recommendations.filter((r) => ['proposed', 'approved'].includes(r.status)).length,
      executions_total: executions.length,
      executions_success: executions.filter((e) => e.execution_status === 'success').length,
      executions_failed: executions.filter((e) => e.execution_status === 'failed').length,
    };

    return NextResponse.json({
      ok: true,
      days,
      summary,
      metrics: metricsRes.data || [],
      recent_runs: runs.slice(0, 40),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
