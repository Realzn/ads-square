import { scoreOpsAnomaly, toPriority } from '../scoring';

export async function runOpsAgent({ supabase }) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [eventsResult, platformResult] = await Promise.all([
    supabase
      .from('ai_events')
      .select('event_type, event_source, happened_at')
      .gte('happened_at', since),
    supabase.from('admin_platform_stats').select('*').maybeSingle(),
  ]);

  if (eventsResult.error) {
    throw new Error(`[ops] ${eventsResult.error.message}`);
  }

  const events = eventsResult.data || [];
  const paymentFailed = events.filter((e) => String(e.event_type).includes('payment_failed')).length;
  const checkoutSuccess = events.filter((e) => String(e.event_type).includes('checkout_completed')).length;
  const failureRatio = paymentFailed / Math.max(1, checkoutSuccess + paymentFailed);
  const anomalyScore = scoreOpsAnomaly({ ratio: failureRatio, threshold: 0.18 });

  const recommendations = [];
  if (anomalyScore > 0) {
    recommendations.push({
      agent_type: 'ops',
      advertiser_id: null,
      booking_id: null,
      priority: toPriority(anomalyScore),
      score: anomalyScore,
      title: 'Anomalie paiements détectée',
      description: `Ratio payment_failed=${Math.round(failureRatio * 100)}% sur 24h.`,
      action_type: 'create_admin_task',
      action_payload: {
        task_type: 'ops_investigation',
        note: 'Vérifier Stripe webhooks / retries / UX checkout.',
        metrics: {
          payment_failed: paymentFailed,
          checkout_completed: checkoutSuccess,
          failure_ratio: Number(failureRatio.toFixed(3)),
        },
      },
    });
  }

  const platform = platformResult.data;
  if (platform && Number(platform.pending_bookings || 0) >= 20) {
    recommendations.push({
      agent_type: 'ops',
      advertiser_id: null,
      booking_id: null,
      priority: 2,
      score: 0.66,
      title: 'Backlog de bookings pending élevé',
      description: `${platform.pending_bookings} bookings pending détectés.`,
      action_type: 'create_admin_task',
      action_payload: {
        task_type: 'conversion_funnel_audit',
        note: 'Auditer friction checkout + relances automatiques.',
      },
    });
  }

  return recommendations;
}
