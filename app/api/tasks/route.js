// app/api/tasks/route.js
// GET  : récupérer les tâches du jour pour un abonnement
// POST : compléter une tâche

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

// GET /api/tasks?subscription_id=xxx
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get('subscription_id');

  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscription_id requis' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('task_date', today)
    .order('task_type');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si aucune tâche pour aujourd'hui → les générer
  if (!tasks || tasks.length === 0) {
    await supabase.rpc('create_daily_tasks_for_subscription', { p_subscription_id: subscriptionId });
    const { data: newTasks } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('task_date', today)
      .order('task_type');
    return NextResponse.json({ tasks: newTasks || [], generated: true });
  }

  return NextResponse.json({ tasks });
}

// POST /api/tasks — compléter une tâche
export async function POST(request) {
  try {
    const {
      task_id,
      proof_text,
      proof_url,
      proof_platform,
      target_slot_x,
      target_slot_y,
      target_name,
    } = await request.json();

    if (!task_id) {
      return NextResponse.json({ error: 'task_id requis' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Appeler la fonction SQL qui complète la tâche + publie sur le fil
    const { error } = await supabase.rpc('complete_task', {
      p_task_id: task_id,
      p_proof_text: proof_text || null,
      p_proof_url: proof_url || null,
      p_proof_platform: proof_platform || null,
      p_target_slot_x: target_slot_x || null,
      p_target_slot_y: target_slot_y || null,
      p_target_name: target_name || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Récupérer l'état mis à jour de l'abonnement
    const { data: task } = await supabase.from('daily_tasks').select('subscription_id').eq('id', task_id).single();
    let dashboard = null;
    if (task?.subscription_id) {
      const { data } = await supabase.from('member_dashboard').select('*').eq('id', task.subscription_id).single();
      dashboard = data;
    }

    return NextResponse.json({ success: true, dashboard });
  } catch (err) {
    console.error('[Tasks] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
