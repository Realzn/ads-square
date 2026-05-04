import { createServiceClient } from '../supabase-server';

const DEFAULT_DAILY_LIMIT = 120;
const DEFAULT_MODE = 'recommend_only';
const DEFAULT_ALLOWED_ACTIONS = new Set([
  'send_email',
  'create_admin_task',
  'schedule_followup',
  'toggle_tier_recommendation',
]);

export function getAIConfig() {
  const enabled = (process.env.AI_AGENTS_ENABLED || 'true').toLowerCase() !== 'false';
  const killSwitch = (process.env.AI_AGENTS_KILL_SWITCH || 'false').toLowerCase() === 'true';
  const mode = process.env.AI_AGENTS_MODE || DEFAULT_MODE;
  const dailyLimit = parseInt(process.env.AI_AGENTS_DAILY_ACTION_LIMIT || String(DEFAULT_DAILY_LIMIT), 10);
  return {
    enabled,
    killSwitch,
    mode: ['recommend_only', 'auto_safe'].includes(mode) ? mode : DEFAULT_MODE,
    dailyLimit: Number.isFinite(dailyLimit) ? dailyLimit : DEFAULT_DAILY_LIMIT,
  };
}

export async function getGuardrailPolicy(agentType, actionType) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('ai_guardrails')
    .select('agent_type, action_type, mode, allowed, requires_approval, daily_limit, cooldown_minutes')
    .eq('agent_type', agentType)
    .eq('action_type', actionType)
    .maybeSingle();

  return data || null;
}

export async function checkGuardrails({
  agentType,
  actionType,
  manualApproval = false,
}) {
  const config = getAIConfig();

  if (!config.enabled || config.killSwitch) {
    return { allowed: false, reason: 'AI agents disabled', requiresApproval: true, mode: config.mode };
  }

  if (!DEFAULT_ALLOWED_ACTIONS.has(actionType)) {
    return { allowed: false, reason: `Action ${actionType} not allowlisted`, requiresApproval: true, mode: config.mode };
  }

  const policy = await getGuardrailPolicy(agentType, actionType);
  const mode = policy?.mode || config.mode;
  const requiresApproval = policy?.requires_approval ?? mode !== 'auto_safe';
  const allowedByPolicy = policy?.allowed ?? true;

  if (!allowedByPolicy) {
    return { allowed: false, reason: 'Blocked by guardrail policy', requiresApproval: true, mode };
  }

  const supabase = createServiceClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_action_executions')
    .select('id', { count: 'exact', head: true })
    .gte('executed_at', since.toISOString());

  const dayLimit = policy?.daily_limit || config.dailyLimit;
  if ((count || 0) >= dayLimit) {
    return { allowed: false, reason: 'Daily AI action quota reached', requiresApproval: true, mode };
  }

  if (requiresApproval && !manualApproval) {
    return { allowed: false, reason: 'Manual approval required', requiresApproval: true, mode };
  }

  return { allowed: true, reason: null, requiresApproval, mode };
}
