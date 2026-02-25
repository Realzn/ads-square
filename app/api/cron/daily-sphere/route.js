// app/api/cron/daily-sphere/route.js
// Cron quotidien pour la Sphère de Dyson :
// 1. Génère les tâches du jour pour tous les abonnements actifs
// 2. Vérifie les suspensions (membres qui n'ont pas fait leurs tâches)
// 3. Envoie les rappels par email
//
// À appeler 2x/jour :
//   - 6h00 : génération des tâches (GET?step=tasks)
//   - 23h00 : vérification suspensions (GET?step=suspend)

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { sendTaskReminder, sendSuspensionWarning, sendSuspensionNotice } from '../../../../lib/emails-sphere';

export async function GET(request) {
  const token = request.headers.get('x-cron-token')
    || new URL(request.url).searchParams.get('token');
  const step = new URL(request.url).searchParams.get('step') || 'tasks';

  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // ─── ÉTAPE 1 : Générer les tâches du jour ─────────────────
  if (step === 'tasks') {
    const { error } = await supabase.rpc('create_all_daily_tasks');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Compter les tâches créées
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase.from('daily_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('task_date', today);

    return NextResponse.json({
      ok: true,
      step: 'tasks',
      ran_at: new Date().toISOString(),
      tasks_created: count || 0,
    });
  }

  // ─── ÉTAPE 2 : Vérifier suspensions + envoyer rappels ─────
  if (step === 'suspend') {
    const { data: result, error } = await supabase.rpc('run_daily_suspension_check');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Récupérer les membres en zone rouge (missed_days = threshold - 1) pour rappel
    const { data: atRisk } = await supabase
      .from('member_dashboard')
      .select('advertiser_id, email, display_name, rank, days_before_suspension, slot_x, slot_y')
      .eq('status', 'active')
      .eq('days_before_suspension', 1);

    // Envoyer un email de rappel d'urgence aux membres à 1 jour de suspension
    let remindedCount = 0;
    for (const member of (atRisk || [])) {
      try {
        await sendTaskReminder({
          to: member.email,
          displayName: member.display_name,
          rank: member.rank,
          slotX: member.slot_x,
          slotY: member.slot_y,
          daysBeforeSuspension: 1,
        });
        remindedCount++;
      } catch (e) {
        console.error('[Cron] Rappel email échoué pour', member.email, e.message);
      }
    }

    // Récupérer les nouvelles suspensions pour notifier
    const today = new Date().toISOString().split('T')[0];
    const { data: newlySuspended } = await supabase
      .from('suspension_log')
      .select('*, advertisers(email, display_name), subscriptions(slot_x, slot_y, rank)')
      .gte('suspended_at', today + 'T00:00:00Z');

    for (const log of (newlySuspended || [])) {
      try {
        await sendSuspensionNotice({
          to: log.advertisers?.email,
          displayName: log.advertisers?.display_name,
          rank: log.subscriptions?.rank,
          slotX: log.subscriptions?.slot_x,
          slotY: log.subscriptions?.slot_y,
          missedDays: log.missed_days,
        });
      } catch (e) {
        console.error('[Cron] Email suspension échoué:', e.message);
      }
    }

    return NextResponse.json({
      ok: true,
      step: 'suspend',
      ran_at: new Date().toISOString(),
      ...result,
      reminded: remindedCount,
    });
  }

  return NextResponse.json({ error: 'step inconnu (tasks | suspend)' }, { status: 400 });
}

export const POST = GET;
