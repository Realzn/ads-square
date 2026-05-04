import { createServiceClient } from '../supabase-server';
import { getAIConfig, getGuardrailPolicy } from './guardrails';
import { runConversionAgent } from './agents/conversion-agent';
import { runRevenueAgent } from './agents/revenue-agent';
import { runRetentionAgent } from './agents/retention-agent';
import { runOpsAgent } from './agents/ops-agent';
import { executeAIAction } from './action-executor';

const AGENTS = [
  { key: 'conversion', runner: runConversionAgent },
  { key: 'revenue', runner: runRevenueAgent },
  { key: 'retention', runner: runRetentionAgent },
  { key: 'ops', runner: runOpsAgent },
];

async function createRun(supabase, { agentType, triggerType, inputPayload }) {
  const { data, error } = await supabase
    .from('ai_agent_runs')
    .insert({
      agent_type: agentType,
      trigger_type: triggerType,
      status: 'running',
      input_payload: inputPayload || {},
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function finishRun(supabase, runId, payload) {
  await supabase
    .from('ai_agent_runs')
    .update({
      status: payload.status,
      output_payload: payload.outputPayload || {},
      error_message: payload.errorMessage || null,
      finished_at: new Date().toISOString(),
      duration_ms: payload.durationMs || null,
    })
    .eq('id', runId);
}

async function persistRecommendationAndAction({ supabase, recommendation, agentRunId, configMode }) {
  const { data: rec, error: recError } = await supabase
    .from('ai_recommendations')
    .insert({
      agent_run_id: agentRunId,
      agent_type: recommendation.agent_type,
      advertiser_id: recommendation.advertiser_id || null,
      booking_id: recommendation.booking_id || null,
      priority: recommendation.priority,
      score: recommendation.score,
      title: recommendation.title,
      description: recommendation.description,
      action_type: recommendation.action_type,
      action_payload: recommendation.action_payload || {},
      status: 'proposed',
      recommended_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (recError) throw new Error(recError.message);

  const policy = await getGuardrailPolicy(recommendation.agent_type, recommendation.action_type);
  const mode = policy?.mode || configMode;
  const requiresApproval = policy?.requires_approval ?? mode !== 'auto_safe';

  const { data: action, error: actionError } = await supabase
    .from('ai_actions')
    .insert({
      recommendation_id: rec.id,
      agent_type: recommendation.agent_type,
      action_type: recommendation.action_type,
      action_payload: recommendation.action_payload || {},
      mode,
      requires_approval: requiresApproval,
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (actionError) throw new Error(actionError.message);

  return { recommendation: rec, action };
}

export async function computeAndStoreDailyAIMetrics() {
  const supabase = createServiceClient();

  const [{ data: platform }, { data: subs }] = await Promise.all([
    supabase.from('admin_platform_stats').select('*').maybeSingle(),
    supabase.from('subscriptions').select('status'),
  ]);

  const totalSubs = (subs || []).length;
  const activeSubs = (subs || []).filter((s) => s.status === 'active').length;
  const suspendedSubs = (subs || []).filter((s) => s.status === 'suspended').length;

  const totalBookings = Number(platform?.total_bookings || 0);
  const activeBookings = Number(platform?.active_bookings || 0);
  const totalRevenueCents = Number(platform?.total_revenue_cents || 0);
  const advertisers = Number(platform?.total_advertisers || 0);
  const clicks = Number(platform?.total_clicks || 0);
  const impressions = Number(platform?.total_impressions || 0);

  const metrics = {
    metric_date: new Date().toISOString().slice(0, 10),
    cohort: 'all',
    conversion_rate: Number((activeBookings / Math.max(1, totalBookings)).toFixed(3)),
    renewal_rate: Number((activeSubs / Math.max(1, totalSubs)).toFixed(3)),
    churn_rate: Number((suspendedSubs / Math.max(1, totalSubs)).toFixed(3)),
    arpu_cents: Math.round(totalRevenueCents / Math.max(1, advertisers)),
    ltv_short_cents: Math.round((totalRevenueCents * 0.35) / Math.max(1, advertisers)),
    ctr_uplift: Number(((clicks / Math.max(1, impressions)) * 100).toFixed(3)),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('ai_business_metrics_daily')
    .upsert(metrics, { onConflict: 'metric_date,cohort' });

  if (error) {
    console.error('[AI] metrics upsert error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, metrics };
}

export async function runAIOrchestrator({
  triggerType = 'manual',
  inputPayload = {},
  autoExecute = false,
  actor = 'ai-orchestrator',
} = {}) {
  const config = getAIConfig();
  if (!config.enabled || config.killSwitch) {
    return { ok: false, skipped: true, reason: 'AI disabled' };
  }

  const supabase = createServiceClient();
  const summary = {
    ok: true,
    triggerType,
    mode: config.mode,
    startedAt: new Date().toISOString(),
    agents: [],
    recommendationCount: 0,
    actionCount: 0,
    autoExecuted: 0,
  };

  for (const agent of AGENTS) {
    const started = Date.now();
    let run;

    try {
      run = await createRun(supabase, {
        agentType: agent.key,
        triggerType,
        inputPayload,
      });

      const recommendations = await agent.runner({ supabase, triggerType, inputPayload });
      const persisted = [];

      for (const recommendation of recommendations) {
        const stored = await persistRecommendationAndAction({
          supabase,
          recommendation,
          agentRunId: run.id,
          configMode: config.mode,
        });
        persisted.push(stored);
      }

      let autoExecuted = 0;
      if (autoExecute || config.mode === 'auto_safe') {
        for (const row of persisted) {
          if (row.action.requires_approval) continue;
          try {
            await executeAIAction({
              actionId: row.action.id,
              actor,
              manualApproval: false,
              dryRun: false,
              idempotencyKey: `${row.action.id}:auto`,
            });
            autoExecuted++;
          } catch (err) {
            console.error('[AI] auto-execute error:', err.message);
          }
        }
      }

      await finishRun(supabase, run.id, {
        status: 'success',
        outputPayload: {
          recommendations: persisted.length,
          auto_executed: autoExecuted,
        },
        durationMs: Date.now() - started,
      });

      summary.recommendationCount += persisted.length;
      summary.actionCount += persisted.length;
      summary.autoExecuted += autoExecuted;

      summary.agents.push({
        agent: agent.key,
        status: 'success',
        runId: run.id,
        recommendations: persisted.length,
        autoExecuted,
      });
    } catch (err) {
      if (run?.id) {
        await finishRun(supabase, run.id, {
          status: 'failed',
          outputPayload: {},
          durationMs: Date.now() - started,
          errorMessage: err.message,
        });
      }

      summary.ok = false;
      summary.agents.push({
        agent: agent.key,
        status: 'failed',
        error: err.message,
      });
    }
  }

  const metricsResult = await computeAndStoreDailyAIMetrics();
  summary.metrics = metricsResult;
  summary.finishedAt = new Date().toISOString();

  return summary;
}
