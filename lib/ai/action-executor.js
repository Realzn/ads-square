import { createServiceClient } from '../supabase-server';
import { checkGuardrails } from './guardrails';
import { ingestAIEvent } from './events';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function runAction({ supabase, action, actor, dryRun = false }) {
  const payload = action.action_payload || {};

  if (dryRun) {
    return { ok: true, dryRun: true, simulated: true, action_type: action.action_type };
  }

  switch (action.action_type) {
    case 'send_email': {
      const response = await fetch(`${APP_URL}/api/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payload.type || 'ai_nudge',
          to: payload.to,
          subject: payload.subject,
          nudge: payload.nudge,
          cta_url: payload.cta_url,
          cta_text: payload.cta_text,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Email action failed');
      }
      return { ok: true, delivery: result };
    }

    case 'create_admin_task': {
      const { error } = await supabase.from('admin_actions').insert({
        admin_email: actor,
        action: 'ai_admin_task',
        target_type: payload.task_type || 'ai_task',
        target_id: payload.advertiser_id || action.recommendation_id || action.id,
        details: payload,
      });

      if (error) throw new Error(error.message);
      return { ok: true, admin_task_created: true };
    }

    case 'schedule_followup': {
      const eventResult = await ingestAIEvent({
        eventType: 'followup_scheduled',
        eventSource: 'ai.executor',
        entityType: 'recommendation',
        entityId: action.recommendation_id,
        advertiserId: payload.advertiser_id || null,
        bookingId: payload.booking_id || null,
        payload,
      });
      if (!eventResult.ok) throw new Error(eventResult.error || 'Unable to schedule follow-up');
      return { ok: true, followup_event_id: eventResult.id };
    }

    case 'toggle_tier_recommendation': {
      if (!payload.tier || typeof payload.available !== 'boolean') {
        throw new Error('tier and available are required');
      }

      const { error } = await supabase
        .from('tier_config')
        .update({
          available: payload.available,
          updated_at: new Date().toISOString(),
          updated_by: actor,
        })
        .eq('tier', payload.tier);

      if (error) throw new Error(error.message);
      return { ok: true, tier: payload.tier, available: payload.available };
    }

    default:
      throw new Error(`Unknown action type: ${action.action_type}`);
  }
}

export async function executeAIAction({
  actionId,
  actor = 'system',
  manualApproval = false,
  dryRun = false,
  idempotencyKey,
}) {
  if (!actionId) throw new Error('actionId is required');

  const supabase = createServiceClient();
  const startedAt = Date.now();
  const dedupeKey = idempotencyKey || `${actionId}:${dryRun ? 'dry' : 'live'}`;

  const { data: existingExecution } = await supabase
    .from('ai_action_executions')
    .select('*')
    .eq('idempotency_key', dedupeKey)
    .maybeSingle();

  if (existingExecution) {
    return { ok: true, deduplicated: true, execution: existingExecution };
  }

  const { data: action, error: actionError } = await supabase
    .from('ai_actions')
    .select('*, ai_recommendations(id, status, advertiser_id, booking_id)')
    .eq('id', actionId)
    .maybeSingle();

  if (actionError) throw new Error(actionError.message);
  if (!action) throw new Error('Action not found');

  const guardrail = await checkGuardrails({
    agentType: action.agent_type,
    actionType: action.action_type,
    manualApproval,
  });

  if (!guardrail.allowed) {
    const skippedPayload = {
      action_id: actionId,
      reason: guardrail.reason,
      mode: guardrail.mode,
    };

    const { data: skippedExec } = await supabase
      .from('ai_action_executions')
      .insert({
        action_id: action.id,
        idempotency_key: dedupeKey,
        execution_status: 'skipped',
        result_payload: skippedPayload,
        executed_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    await supabase
      .from('ai_actions')
      .update({ status: 'skipped', updated_at: new Date().toISOString() })
      .eq('id', action.id);

    return { ok: false, skipped: true, guardrail, execution: skippedExec };
  }

  if (manualApproval) {
    await supabase
      .from('ai_actions')
      .update({
        status: 'approved',
        approved_by: actor,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', action.id);

    if (action.recommendation_id) {
      await supabase
        .from('ai_recommendations')
        .update({
          status: 'approved',
          reviewed_by: actor,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', action.recommendation_id);
    }
  }

  try {
    const result = await runAction({ supabase, action, actor, dryRun });
    const durationMs = Date.now() - startedAt;

    const executionStatus = dryRun ? 'dry_run' : 'success';

    const { data: execution } = await supabase
      .from('ai_action_executions')
      .insert({
        action_id: action.id,
        idempotency_key: dedupeKey,
        execution_status: executionStatus,
        result_payload: result,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    await supabase
      .from('ai_actions')
      .update({ status: 'executed', updated_at: new Date().toISOString() })
      .eq('id', action.id);

    if (action.recommendation_id) {
      await supabase
        .from('ai_recommendations')
        .update({ status: 'executed', executed_at: new Date().toISOString() })
        .eq('id', action.recommendation_id);
    }

    return { ok: true, execution, result };
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    const { data: execution } = await supabase
      .from('ai_action_executions')
      .insert({
        action_id: action.id,
        idempotency_key: dedupeKey,
        execution_status: 'failed',
        result_payload: {},
        error_message: err.message,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    await supabase
      .from('ai_actions')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', action.id);

    throw new Error(err.message || execution?.error_message || 'AI action failed');
  }
}
