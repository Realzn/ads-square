import { scoreRetentionCandidate, toPriority } from '../scoring';

export async function runRetentionAgent({ supabase, limit = 25 }) {
  const { data, error } = await supabase
    .from('v_churn_risk_candidates')
    .select('*')
    .order('risk_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[retention] ${error.message}`);
  }

  return (data || []).map((candidate) => {
    const score = scoreRetentionCandidate(candidate);
    const severity = candidate.severity || 'medium';

    return {
      agent_type: 'retention',
      advertiser_id: candidate.advertiser_id,
      booking_id: candidate.booking_id,
      priority: toPriority(score),
      score,
      title: `Risque churn ${severity.toUpperCase()} (${candidate.slot_x},${candidate.slot_y})`,
      description: `tasks_missed_days=${candidate.tasks_missed_days}, days_before_suspension=${candidate.days_before_suspension}`,
      action_type: severity === 'critical' ? 'create_admin_task' : 'send_email',
      action_payload: severity === 'critical'
        ? {
            task_type: 'retention_intervention',
            advertiser_id: candidate.advertiser_id,
            note: `Intervention manuelle demandée pour ${candidate.display_name || candidate.email}`,
          }
        : {
            type: 'ai_nudge',
            to: candidate.email,
            subject: 'Gardez votre slot actif : action recommandée aujourd’hui',
            nudge: 'Complétez vos tâches du jour pour éviter une suspension et conserver votre visibilité.',
            cta_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
            cta_text: 'Voir mes tâches',
          },
    };
  });
}
