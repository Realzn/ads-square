import { scoreConversionCandidate, toPriority } from '../scoring';

export async function runConversionAgent({ supabase, limit = 25 }) {
  const { data, error } = await supabase
    .from('v_conversion_dropoffs')
    .select('*')
    .order('dropoff_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[conversion] ${error.message}`);
  }

  return (data || []).map((candidate) => {
    const score = scoreConversionCandidate(candidate);
    return {
      agent_type: 'conversion',
      advertiser_id: candidate.advertiser_id,
      booking_id: candidate.booking_id,
      priority: toPriority(score),
      score,
      title: `Relance checkout en attente (${candidate.slot_x},${candidate.slot_y})`,
      description: `Le checkout est bloqué depuis plus de 45 min. Proposer une relance contextuelle pour finaliser le paiement.`,
      action_type: 'send_email',
      action_payload: {
        type: 'ai_nudge',
        to: candidate.email,
        subject: 'Votre slot vous attend encore sur AdsMostFair',
        nudge: `Votre réservation (${candidate.slot_x},${candidate.slot_y}) est toujours en attente. Finalisez-la avant qu'un autre annonceur la réserve.`,
        cta_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?slot=${candidate.slot_x}-${candidate.slot_y}`,
        cta_text: 'Finaliser ma réservation',
      },
    };
  });
}
