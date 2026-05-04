import { createServiceClient } from '../supabase-server';

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const clone = { ...payload };
  delete clone.password;
  delete clone.token;
  delete clone.access_token;
  delete clone.refresh_token;
  return clone;
}

export async function ingestAIEvent(eventInput = {}) {
  const {
    eventType,
    eventSource,
    entityType = null,
    entityId = null,
    advertiserId = null,
    bookingId = null,
    payload = {},
    happenedAt = null,
  } = eventInput;

  if (!eventType || !eventSource) return { ok: false, skipped: true, reason: 'missing eventType/eventSource' };
  if ((process.env.AI_AGENTS_ENABLED || 'true').toLowerCase() === 'false') {
    return { ok: false, skipped: true, reason: 'AI disabled' };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ai_events')
      .insert({
        event_type: eventType,
        event_source: eventSource,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        advertiser_id: advertiserId,
        booking_id: bookingId,
        payload: sanitizePayload(payload),
        happened_at: happenedAt || new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[AI/Event] insert error:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id || null };
  } catch (err) {
    console.error('[AI/Event] unexpected error:', err.message);
    return { ok: false, error: err.message };
  }
}
