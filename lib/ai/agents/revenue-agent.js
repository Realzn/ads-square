import { scoreRevenueCandidate, toPriority } from '../scoring';

export async function runRevenueAgent({ supabase, limit = 25 }) {
  const { data, error } = await supabase
    .from('v_upsell_candidates')
    .select('*')
    .order('upsell_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[revenue] ${error.message}`);
  }

  return (data || []).map((candidate) => {
    const score = scoreRevenueCandidate(candidate);
    const isUrgent = candidate.days_to_expiry <= 3;

    return {
      agent_type: 'revenue',
      advertiser_id: candidate.advertiser_id,
      booking_id: candidate.booking_id,
      priority: toPriority(score),
      score,
      title: `Upsell extension (${candidate.slot_x},${candidate.slot_y})`,
      description: isUrgent
        ? `Le slot expire dans ${candidate.days_to_expiry} jour(s), proposer une extension prioritaire.`
        : 'Le slot performe bien. Proposer extension ou upgrade de tier.',
      action_type: 'schedule_followup',
      action_payload: {
        followup_type: 'renewal_upsell',
        slot_x: candidate.slot_x,
        slot_y: candidate.slot_y,
        days_to_expiry: candidate.days_to_expiry,
        suggested_days: candidate.days_to_expiry <= 3 ? 30 : 14,
        message: 'Votre slot performe. Prolongez maintenant pour conserver votre dynamique.',
      },
    };
  });
}
