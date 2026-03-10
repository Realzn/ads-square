// app/api/emails/route.js
// Emails transactionnels centralisés via Resend

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'ADS-SQUARE <noreply@ads-square.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ads-square.com';

// ─── Templates HTML ────────────────────────────────────────────────────────

function baseTemplate(content, preheader = '') {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ADS-SQUARE</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #01020A; font-family: 'Rajdhani', 'Segoe UI', sans-serif; color: #DDE6F2; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .logo { font-size: 22px; font-weight: 800; letter-spacing: 0.12em; color: #00C8E4; margin-bottom: 32px; }
  .logo span { color: #DDE6F2; }
  .card { background: rgba(1,6,18,0.96); border: 1px solid rgba(0,200,240,0.12); border-radius: 12px; padding: 32px; margin-bottom: 24px; }
  h1 { font-size: 28px; font-weight: 800; letter-spacing: 0.04em; line-height: 1.2; margin-bottom: 16px; }
  p { font-size: 15px; line-height: 1.6; color: rgba(221,230,242,0.75); margin-bottom: 12px; }
  .accent { color: #00C8E4; }
  .btn { display: inline-block; background: #00C8E4; color: #01020A; font-weight: 800; font-size: 14px; letter-spacing: 0.1em; padding: 14px 28px; border-radius: 6px; text-decoration: none; margin-top: 8px; }
  .stat-row { display: flex; gap: 16px; margin: 20px 0; }
  .stat-box { flex: 1; background: rgba(0,200,240,0.06); border: 1px solid rgba(0,200,240,0.15); border-radius: 8px; padding: 16px; text-align: center; }
  .stat-value { font-size: 26px; font-weight: 800; color: #00C8E4; }
  .stat-label { font-size: 11px; letter-spacing: 0.08em; color: rgba(221,230,242,0.5); margin-top: 4px; }
  .streak-badge { display: inline-block; background: linear-gradient(135deg, #E8A020, #D06010); color: #01020A; font-weight: 800; font-size: 18px; padding: 10px 20px; border-radius: 8px; }
  .footer { font-size: 12px; color: rgba(221,230,242,0.35); text-align: center; margin-top: 32px; }
  .divider { border: none; border-top: 1px solid rgba(0,200,240,0.1); margin: 24px 0; }
</style>
</head>
<body>
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<div class="container">
  <div class="logo">ADS<span>-SQUARE</span></div>
  ${content}
  <div class="footer">
    <p>ADS-SQUARE — La grille publicitaire ouverte à tous</p>
    <p><a href="${APP_URL}/unsubscribe" style="color:rgba(221,230,242,0.35)">Se désabonner</a></p>
  </div>
</div>
</body>
</html>`;
}

function waitlistWelcome({ profile }) {
  const profileMsg = {
    creator: 'En tant que <strong>Créateur</strong>, vous aurez accès aux slots Viral et Standard pour démarrer.',
    freelance: 'En tant que <strong>Freelance</strong>, les slots Business sont parfaits pour votre visibilité.',
    brand: 'En tant que <strong>Brand</strong>, les slots Prestige et Épicentre vous attendent.',
  }[profile] || 'Votre profil est enregistré.';

  return baseTemplate(`
    <div class="card">
      <h1>Votre place est réservée 🟦</h1>
      <p>${profileMsg}</p>
      <p>Vous serez notifié en priorité à l'ouverture de la grille. En attendant, voici ce qui vous attend :</p>
      <hr class="divider">
      <p>✦ <strong>1 369 blocs publicitaires</strong> sur une grille 37×37</p>
      <p>✦ Tarifs de <strong>1€/jour</strong> (Viral) à <strong>1 000€/jour</strong> (Épicentre)</p>
      <p>✦ Système de <strong>rangs et streaks</strong> pour amplifier votre visibilité</p>
      <p>✦ <strong>Statistiques en temps réel</strong> : clics, impressions, CTR</p>
      <hr class="divider">
      <a href="${APP_URL}" class="btn">DÉCOUVRIR LA GRILLE →</a>
    </div>
  `, 'Bienvenue sur ADS-SQUARE — votre place est réservée');
}

function bookingConfirmed({ name, slotX, slotY, tier, endDate, totalCents }) {
  const tierColor = { epicenter: '#f0b429', prestige: '#ff4d8f', elite: '#a855f7', business: '#00d9f5', standard: '#38bdf8', viral: '#00e8a2' }[tier] || '#00C8E4';
  const euros = (totalCents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
  
  return baseTemplate(`
    <div class="card">
      <h1>Votre bloc est en ligne ✦</h1>
      <p>Bonjour <strong>${name}</strong>, votre réservation est confirmée.</p>
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-value" style="color:${tierColor}">${tier?.toUpperCase()}</div>
          <div class="stat-label">TIER</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">[${slotX},${slotY}]</div>
          <div class="stat-label">POSITION</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${euros}€</div>
          <div class="stat-label">TOTAL</div>
        </div>
      </div>
      <p>Votre bloc restera visible jusqu'au <strong>${endDate}</strong>.</p>
      <hr class="divider">
      <a href="${APP_URL}/dashboard" class="btn">MON DASHBOARD →</a>
    </div>
    <div class="card">
      <p><strong>💡 Conseil :</strong> Complétez vos tâches quotidiennes pour maintenir votre streak et amplifier votre visibilité sur la grille.</p>
    </div>
  `, `Votre bloc [${slotX},${slotY}] est en ligne`);
}

function dailyStats({ name, slotX, slotY, clicksToday, clicksWeek, impressionsWeek, ctr, streak, daysBeforeSuspension, rank }) {
  const suspensionWarning = daysBeforeSuspension <= 1 ? `
    <div style="background:rgba(208,40,72,0.12);border:1px solid rgba(208,40,72,0.3);border-radius:8px;padding:16px;margin:16px 0;">
      <strong style="color:#D02848;">⚠️ Attention :</strong> votre slot sera suspendu dans ${daysBeforeSuspension} jour${daysBeforeSuspension > 1 ? 's' : ''} si vous ne complétez pas vos tâches aujourd'hui.
    </div>` : '';

  return baseTemplate(`
    <div class="card">
      <h1>Vos stats du jour</h1>
      <p>Bonjour <strong>${name}</strong> — voici votre résumé quotidien pour le slot [${slotX},${slotY}].</p>
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-value">${clicksToday}</div>
          <div class="stat-label">CLICS AUJOURD'HUI</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${clicksWeek}</div>
          <div class="stat-label">CLICS 7 JOURS</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${ctr}%</div>
          <div class="stat-label">CTR</div>
        </div>
      </div>
      ${suspensionWarning}
      <p>🔥 Streak actuel : <strong>${streak} jours</strong> (Rang : ${rank?.toUpperCase()})</p>
      <hr class="divider">
      <a href="${APP_URL}/dashboard" class="btn">VOIR MES STATS →</a>
    </div>
  `, `${clicksToday} clics aujourd'hui sur votre slot`);
}

function streakMilestone({ name, streak, rank }) {
  const msgs = {
    7: { emoji: '🔥', title: '7 jours de streak !', msg: 'Une semaine complète de tâches validées. Vous êtes sur la bonne voie.' },
    14: { emoji: '⚡', title: '2 semaines de streak !', msg: 'Constance exemplaire. Votre visibilité sur la grille augmente.' },
    30: { emoji: '💎', title: '1 mois de streak !', msg: "Un mois sans interruption. Vous faites partie de l'élite." },
    60: { emoji: '🌟', title: '60 jours de streak !', msg: 'Deux mois de discipline. Une performance exceptionnelle.' },
    100: { emoji: '👑', title: '100 jours de streak !', msg: 'Cent jours consécutifs. Vous êtes une légende de la grille.' },
  }[streak] || { emoji: '🎯', title: `${streak} jours de streak !`, msg: 'Impressionnant.' };

  return baseTemplate(`
    <div class="card" style="text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">${msgs.emoji}</div>
      <h1>${msgs.title}</h1>
      <p>${msgs.msg}</p>
      <div style="margin:24px 0;">
        <div class="streak-badge">${streak} JOURS 🔥</div>
      </div>
      <p>Rang actuel : <strong class="accent">${rank?.toUpperCase()}</strong></p>
      <hr class="divider">
      <a href="${APP_URL}/dashboard" class="btn">VOIR MON CLASSEMENT →</a>
    </div>
  `, `${streak} jours de streak — félicitations ${name} !`);
}

function offerReceived({ name, offerAmount, buyerName, slotX, slotY, expiresAt }) {
  const euros = (offerAmount / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
  return baseTemplate(`
    <div class="card">
      <h1>Vous avez reçu une offre 💰</h1>
      <p>Bonjour <strong>${name}</strong>, <strong>${buyerName}</strong> souhaite racheter votre slot [${slotX},${slotY}].</p>
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-value" style="color:#E8A020;">${euros}€</div>
          <div class="stat-label">OFFRE PROPOSÉE</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">72h</div>
          <div class="stat-label">POUR RÉPONDRE</div>
        </div>
      </div>
      <p>L'offre expire le <strong>${expiresAt}</strong>. Acceptez ou refusez depuis votre dashboard.</p>
      <hr class="divider">
      <a href="${APP_URL}/dashboard" class="btn">VOIR L'OFFRE →</a>
    </div>
  `, `${euros}€ offerts pour votre slot [${slotX},${slotY}]`);
}

function suspensionWarning({ name, rank, daysLeft, slotX, slotY }) {
  return baseTemplate(`
    <div class="card" style="border-color:rgba(208,40,72,0.3);">
      <h1 style="color:#D02848;">⚠️ Suspension imminente</h1>
      <p>Bonjour <strong>${name}</strong>, votre slot [${slotX},${slotY}] sera suspendu dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.</p>
      <p>En tant que <strong>${rank?.toUpperCase()}</strong>, vous devez compléter vos tâches quotidiennes pour maintenir votre slot visible sur la grille.</p>
      <p>Un slot suspendu n'est plus visible — votre audience ne peut plus vous trouver.</p>
      <hr class="divider">
      <a href="${APP_URL}/dashboard" class="btn" style="background:#D02848;">COMPLÉTER MES TÂCHES →</a>
    </div>
  `, `Votre slot sera suspendu dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`);
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, to, subject, ...data } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'type et to requis' }, { status: 400 });
    }

    // Générer le contenu selon le type
    let html, emailSubject;

    switch (type) {
      case 'waitlist_welcome':
        html = waitlistWelcome(data);
        emailSubject = subject || '🟦 Bienvenue sur ADS-SQUARE — votre place est réservée';
        break;
      case 'booking_confirmed':
        html = bookingConfirmed(data);
        emailSubject = subject || `✦ Votre bloc [${data.slotX},${data.slotY}] est en ligne`;
        break;
      case 'daily_stats':
        html = dailyStats(data);
        emailSubject = subject || `📊 Vos stats du jour — ${data.clicksToday} clics`;
        break;
      case 'streak_milestone':
        html = streakMilestone(data);
        emailSubject = subject || `🔥 ${data.streak} jours de streak — félicitations !`;
        break;
      case 'offer_received':
        html = offerReceived(data);
        emailSubject = subject || `💰 Vous avez reçu une offre de rachat`;
        break;
      case 'suspension_warning':
        html = suspensionWarning(data);
        emailSubject = subject || `⚠️ Votre slot sera suspendu dans ${data.daysLeft} jour(s)`;
        break;
      default:
        return NextResponse.json({ error: `Type d'email inconnu: ${type}` }, { status: 400 });
    }

    // Envoyer via Resend
    if (!RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY non défini — email non envoyé');
      return NextResponse.json({ ok: true, sent: false, reason: 'No API key' });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: emailSubject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Email] Resend error:', err);
      return NextResponse.json({ error: 'Erreur envoi email', detail: err }, { status: 500 });
    }

    const result = await res.json();
    return NextResponse.json({ ok: true, id: result.id });

  } catch (err) {
    console.error('[Email] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
