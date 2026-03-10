// app/api/cron/daily/route.js
// Job CRON journalier — appelé par Cloudflare Cron Triggers ou un service externe
// Déclenche : stats quotidiennes, vérification suspensions, génération tâches

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// Sécurité : vérifier le secret CRON
function checkCronAuth(request) {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET) return true; // dev mode
  return auth === expected;
}

export async function POST(request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job') || 'all';

  const supabase = createServiceClient();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const results = {};

  try {

    // ── 1. Générer les tâches du jour ────────────────────────────────────────
    if (job === 'all' || job === 'tasks') {
      const { error: tasksError } = await supabase.rpc('create_all_daily_tasks');
      results.tasks = tasksError ? { error: tasksError.message } : { ok: true };
    }

    // ── 2. Vérifier les suspensions ──────────────────────────────────────────
    if (job === 'all' || job === 'suspension') {
      const { data: suspResult, error: suspError } = await supabase.rpc('run_daily_suspension_check');
      results.suspension = suspError ? { error: suspError.message } : suspResult;

      // Envoyer emails d'alerte de suspension
      if (!suspError && suspResult?.suspended > 0) {
        const { data: recentSuspended } = await supabase
          .from('suspension_log')
          .select('subscription_id, subscriptions(advertiser_id, rank, slot_x, slot_y, advertisers(email, display_name))')
          .gte('suspended_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .is('reactivated_at', null);

        for (const log of (recentSuspended || [])) {
          const sub = log.subscriptions;
          const adv = sub?.advertisers;
          if (adv?.email) {
            await fetch(`${APP_URL}/api/emails`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'suspension_warning',
                to: adv.email,
                name: adv.display_name,
                rank: sub.rank,
                daysLeft: 0,
                slotX: sub.slot_x,
                slotY: sub.slot_y,
              }),
            }).catch(() => {});
          }
        }
      }
    }

    // ── 3. Alertes pré-suspension (J-1) ─────────────────────────────────────
    if (job === 'all' || job === 'warnings') {
      const { data: atrisk } = await supabase
        .from('member_dashboard')
        .select('*')
        .eq('status', 'active')
        .eq('days_before_suspension', 1)
        .neq('rank', 'elu');

      let warningsSent = 0;
      for (const m of (atrisk || [])) {
        if (m.email) {
          await fetch(`${APP_URL}/api/emails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'suspension_warning',
              to: m.email,
              name: m.display_name,
              rank: m.rank,
              daysLeft: 1,
              slotX: m.slot_x,
              slotY: m.slot_y,
            }),
          }).catch(() => {});
          warningsSent++;
        }
      }
      results.warnings = { sent: warningsSent };
    }

    // ── 4. Emails stats quotidiennes ─────────────────────────────────────────
    if (job === 'all' || job === 'daily_stats') {
      const { data: payload } = await supabase.rpc('generate_daily_stats_payload');
      const members = payload || [];
      let emailsSent = 0;

      for (const m of members) {
        // Ne pas envoyer si 0 clics ET 0 impressions (pas d'activité)
        if ((m.clicksToday || 0) === 0 && (m.clicksWeek || 0) === 0 && (m.streak || 0) === 0) continue;

        await fetch(`${APP_URL}/api/emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'daily_stats', to: m.email, ...m }),
        }).catch(() => {});
        emailsSent++;
      }
      results.daily_stats = { sent: emailsSent, total_members: members.length };
    }

    // ── 5. Expirer bookings et offres ────────────────────────────────────────
    if (job === 'all' || job === 'expire') {
      await supabase.rpc('expire_old_bookings').catch(() => {});
      await supabase.rpc('expire_old_offers').catch(() => {});
      results.expire = { ok: true };
    }

    return NextResponse.json({
      ok: true,
      job,
      results,
      ran_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Cron Daily] Error:', err);
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}

// GET pour vérification de santé
export async function GET(request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, next_run: 'Scheduled via Cloudflare Cron Triggers' });
}
