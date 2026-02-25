// app/api/subscriptions/reactivate/route.js
import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { sendSlotReactivated } from '../../../../lib/emails-sphere';

export async function POST(request) {
  try {
    const { subscription_id } = await request.json();
    if (!subscription_id) return NextResponse.json({ error: 'subscription_id requis' }, { status: 400 });

    const supabase = createServiceClient();

    const { data: sub } = await supabase.from('subscriptions')
      .select('*, advertisers(email, display_name)')
      .eq('id', subscription_id)
      .single();

    if (!sub) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 });

    await supabase.rpc('reactivate_subscription', { p_subscription_id: subscription_id, p_by: 'user' });

    // Créer les tâches du jour
    await supabase.rpc('create_daily_tasks_for_subscription', { p_subscription_id: subscription_id });

    // Email
    await sendSlotReactivated({
      to: sub.advertisers?.email,
      displayName: sub.advertisers?.display_name,
      rank: sub.rank,
      slotX: sub.slot_x,
      slotY: sub.slot_y,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
