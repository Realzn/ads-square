// lib/emails-sphere.js — Emails transactionnels Sphère de Dyson

const RANK_LABEL = {
  elu:        "L'Élu",
  architecte: "L'Architecte",
  gardien:    "Le Gardien",
  batisseur:  "Le Bâtisseur",
  signal:     "Le Signal",
};

const RANK_COLOR = {
  elu:        '#f0b429',
  architecte: '#ff4d8f',
  gardien:    '#a855f7',
  batisseur:  '#00d9f5',
  signal:     '#00e8a2',
};

const TASK_LABELS = {
  share_grid:          '🌐 Partager la Sphère',
  highlight_neighbor:  '✨ Mettre en avant un voisin',
  create_content:      '🎬 Créer du contenu',
  welcome_member:      '👋 Accueillir un nouveau membre',
  recommend_members:   '⭐ Recommander 2 membres',
  offer_advantage:     '🎁 Offrir un avantage à la communauté',
  slot_perfect:        '💎 Maintenir le slot parfait',
};

async function send({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('[emails-sphere] RESEND_API_KEY manquant'); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Sphère de Dyson <noreply@ads-square.com>',
      to, subject, html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`[emails-sphere] Erreur Resend: ${err.message || res.status}`);
  }
  return res.json();
}

function baseTemplate({ title, preview, body, cta, ctaUrl, rank }) {
  const color = RANK_COLOR[rank] || '#d4a84b';
  const rankName = RANK_LABEL[rank] || '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin:0; background:#080808; font-family:'DM Sans',system-ui,sans-serif; color:#f0f0f0; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .header { border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:24px; margin-bottom:32px; }
  .rank-badge { display:inline-block; background:${color}18; color:${color}; border:1px solid ${color}40;
    border-radius:6px; padding:4px 12px; font-size:11px; font-weight:700; letter-spacing:0.1em; }
  h1 { font-size:24px; font-weight:700; margin:16px 0 8px; color:#f0f0f0; }
  .preview { color:rgba(255,255,255,0.5); font-size:14px; margin-bottom:32px; }
  .body-text { font-size:15px; line-height:1.7; color:rgba(255,255,255,0.8); }
  .cta-btn { display:inline-block; margin-top:32px; padding:14px 28px;
    background:${color}; color:#080808; border-radius:8px;
    font-weight:700; font-size:14px; text-decoration:none; }
  .footer { margin-top:48px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.07);
    font-size:12px; color:rgba(255,255,255,0.3); }
  .sphere { font-size:28px; margin-bottom:8px; }
</style></head>
<body><div class="wrap">
  <div class="header">
    <div class="sphere">◎</div>
    <strong style="color:#f0f0f0;font-size:16px;">Sphère de Dyson</strong>
    ${rankName ? `<div class="rank-badge" style="margin-top:8px;">${rankName}</div>` : ''}
  </div>
  <h1>${title}</h1>
  <p class="preview">${preview}</p>
  <div class="body-text">${body}</div>
  ${cta && ctaUrl ? `<a href="${ctaUrl}" class="cta-btn">${cta}</a>` : ''}
  <div class="footer">
    Sphère de Dyson — Réseau publicitaire mutualiste<br>
    Si vous souhaitez vous désabonner, connectez-vous à votre dashboard.
  </div>
</div></body></html>`;
}

// ─── 1. Email de bienvenue / activation ───────────────────────

export async function sendSubscriptionConfirmation({ to, displayName, rank, tier, slotX, slotY }) {
  const rankName = RANK_LABEL[rank] || 'Membre';
  const color = RANK_COLOR[rank] || '#d4a84b';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';

  const tasks = {
    signal:     ['🌐 Partager la Sphère sur vos réseaux chaque jour'],
    batisseur:  ['🌐 Partager la Sphère chaque jour', '✨ Mettre en avant 1 voisin par jour'],
    gardien:    ['🎬 Créer du contenu autour de votre slot chaque jour', '👋 Accueillir 1 nouveau membre par jour'],
    architecte: ['🎬 Créer du contenu premium chaque jour', '⭐ Recommander 2 membres par jour', '🎁 Offrir 1 avantage à la communauté chaque jour'],
    elu:        ['💎 Maintenir votre slot parfait — c\'est tout ce qu\'on demande'],
  }[rank] || [];

  return send({
    to,
    subject: `Bienvenue dans la Sphère, ${displayName} — Rang : ${rankName}`,
    html: baseTemplate({
      rank,
      title: `Vous êtes ${rankName}`,
      preview: `Slot (${slotX},${slotY}) activé. La Sphère vous attend.`,
      body: `
        <p>Bonjour <strong>${displayName}</strong>,</p>
        <p>Votre slot <strong>(${slotX}, ${slotY})</strong> est maintenant actif dans la Sphère de Dyson.</p>
        <p>En tant que <strong style="color:${color}">${rankName}</strong>, voici vos tâches quotidiennes :</p>
        <ul style="padding-left:20px;">
          ${tasks.map(t => `<li style="margin-bottom:8px;">${t}</li>`).join('')}
        </ul>
        <p>Ces tâches amplifient la visibilité de <strong>tous les membres</strong>, y compris la vôtre.
        Si vous ne les accomplissez pas, votre slot sera suspendu automatiquement.</p>
        <p>Votre abonnement est <strong>annulable à tout moment</strong> depuis votre dashboard.</p>
      `,
      cta: 'Accéder à mon dashboard',
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  });
}

// ─── 2. Rappel de tâches (J-1 avant suspension) ───────────────

export async function sendTaskReminder({ to, displayName, rank, slotX, slotY, daysBeforeSuspension }) {
  const rankName = RANK_LABEL[rank] || 'Membre';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';
  const urgence = daysBeforeSuspension <= 1 ? '🚨 URGENT — ' : '';

  return send({
    to,
    subject: `${urgence}Vos tâches d'aujourd'hui — Sphère de Dyson`,
    html: baseTemplate({
      rank,
      title: `Tâches non complétées`,
      preview: `Il reste ${daysBeforeSuspension} jour(s) avant la suspension de votre slot.`,
      body: `
        <p>Bonjour <strong>${displayName}</strong>,</p>
        <p>Vous n'avez pas encore accompli vos tâches d'aujourd'hui pour votre slot <strong>(${slotX}, ${slotY})</strong>.</p>
        ${daysBeforeSuspension <= 1
          ? `<p style="color:#e05252;font-weight:700;">⚠️ Attention : votre slot sera suspendu demain si vous ne complétez pas vos tâches aujourd'hui.</p>`
          : `<p>Il vous reste <strong>${daysBeforeSuspension} jour(s)</strong> avant la suspension automatique.</p>`
        }
        <p>Chaque tâche accomplie amplifie la visibilité de toute la Sphère — y compris la vôtre.</p>
      `,
      cta: 'Compléter mes tâches maintenant',
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  });
}

// ─── 3. Notification de suspension ───────────────────────────

export async function sendSuspensionNotice({ to, displayName, rank, slotX, slotY, missedDays }) {
  const rankName = RANK_LABEL[rank] || 'Membre';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';

  return send({
    to,
    subject: `Votre slot est suspendu — Sphère de Dyson`,
    html: baseTemplate({
      rank,
      title: 'Slot suspendu',
      preview: `${missedDays} jours sans tâches — votre slot (${slotX},${slotY}) est grisé.`,
      body: `
        <p>Bonjour <strong>${displayName}</strong>,</p>
        <p>Votre slot <strong>(${slotX}, ${slotY})</strong> a été <strong>suspendu automatiquement</strong>
        après <strong>${missedDays} jours</strong> sans tâches complétées.</p>
        <p>Votre slot est actuellement grisé sur la grille — il n'est plus visible aux visiteurs.</p>
        <p><strong>Pour réactiver votre slot</strong>, rendez-vous sur votre dashboard et cliquez sur "Réactiver".</p>
        <p>Votre abonnement continue à être prélevé — la réactivation est immédiate dès que vous reprenez vos tâches.</p>
        <p>Si vous souhaitez annuler définitivement, vous pouvez le faire depuis votre dashboard à tout moment.</p>
      `,
      cta: 'Réactiver mon slot',
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  });
}

// ─── 4. Notification de réactivation ─────────────────────────

export async function sendSlotReactivated({ to, displayName, rank, slotX, slotY }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';

  return send({
    to,
    subject: `Votre slot est réactivé — Sphère de Dyson`,
    html: baseTemplate({
      rank,
      title: 'Slot réactivé ✓',
      preview: `Votre slot (${slotX},${slotY}) est de nouveau visible sur la Sphère.`,
      body: `
        <p>Bonjour <strong>${displayName}</strong>,</p>
        <p>Votre slot <strong>(${slotX}, ${slotY})</strong> est de nouveau <strong>actif et visible</strong> sur la Sphère de Dyson.</p>
        <p>Votre compteur de jours manqués a été remis à zéro. Continuez vos tâches quotidiennes pour rester actif.</p>
      `,
      cta: 'Voir mon dashboard',
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  });
}

// ─── 5. Avertissement de suspension (admin) ───────────────────

export async function sendSuspensionWarning({ to, displayName, rank }) {
  return sendTaskReminder({ to, displayName, rank, daysBeforeSuspension: 1 });
}
