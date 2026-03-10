// app/api/tasks/route.js
// Récupérer et valider les tâches quotidiennes d'un membre

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET : récupère les tâches du jour pour un membre
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'Token requis' }, { status: 400 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

  const supabase = createServiceClient();

  // Récupérer l'advertiser lié à cet auth user
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!advertiser) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

  // Dashboard membre complet
  const { data: dashboard } = await supabase
    .from('member_dashboard')
    .select('*')
    .eq('advertiser_id', advertiser.id)
    .single();

  // Tâches du jour
  const today = new Date().toISOString().split('T')[0];
  const { data: tasks } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('advertiser_id', advertiser.id)
    .eq('task_date', today)
    .order('created_at', { ascending: true });

  // Fil communautaire récent
  const { data: feed } = await supabase
    .from('community_feed_enriched')
    .select('*')
    .limit(20);

  // Top streaks pour motivation
  const { data: topStreaks } = await supabase
    .from('subscriptions')
    .select('tasks_streak, rank, advertisers(display_name)')
    .eq('status', 'active')
    .order('tasks_streak', { ascending: false })
    .limit(5);

  return NextResponse.json({
    dashboard: dashboard || null,
    tasks: tasks || [],
    feed: feed || [],
    top_streaks: topStreaks || [],
  });
}

// POST : valider une tâche
export async function POST(request) {
  try {
    const { token, task_id, proof_text, proof_url, proof_platform } = await request.json();

    if (!token) return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    if (!task_id) return NextResponse.json({ error: 'task_id requis' }, { status: 400 });

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const supabase = createServiceClient();

    // Vérifier que la tâche appartient à cet utilisateur
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!advertiser) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

    const { data: task } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('id', task_id)
      .eq('advertiser_id', advertiser.id)
      .single();

    if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
    if (task.completed) return NextResponse.json({ error: 'Tâche déjà complétée' }, { status: 400 });

    // Valider la tâche via la fonction SQL
    const { error: completeError } = await supabase.rpc('complete_task', {
      p_task_id: task_id,
      p_proof_text: proof_text || null,
      p_proof_url: proof_url || null,
      p_proof_platform: proof_platform || null,
    });

    if (completeError) {
      // Fallback si la fonction RPC n'existe pas encore
      await supabase
        .from('daily_tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          proof_text: proof_text || null,
          proof_url: proof_url || null,
          proof_platform: proof_platform || null,
        })
        .eq('id', task_id);
    }

    // Envoyer email de félicitation si streak milestone
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tasks_streak, rank, advertisers(email, display_name)')
      .eq('advertiser_id', advertiser.id)
      .single();

    const newStreak = (sub?.tasks_streak || 0) + 1;
    if ([7, 14, 30, 60, 100].includes(newStreak)) {
      // Envoyer email milestone
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'streak_milestone',
          to: sub.advertisers?.email,
          name: sub.advertisers?.display_name,
          streak: newStreak,
          rank: sub.rank,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, streak: newStreak });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
