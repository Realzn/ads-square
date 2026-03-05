// lib/emails.js — Templates transactionnels ADS-SQUARE · DA Dyson Cosmos

async function send({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[emails] RESEND_API_KEY non configurée — email non envoyé à', to);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'ADS-SQUARE <noreply@ads-square.com>',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`[emails] Resend error: ${err.message || res.status}`);
  }
  return res.json();
}

// ─── Design tokens (miroir du DA) ────────────────────────────────────────────
const TIER_COLOR = {
  epicenter: '#f0b429',
  prestige:  '#ff4d8f',
  elite:     '#a855f7',
  business:  '#00d9f5',
  standard:  '#38bdf8',
  viral:     '#00e8a2',
};
const TIER_LABEL = {
  epicenter: 'ÉPICENTRE',
  prestige:  'PRESTIGE',
  elite:     'ELITE',
  business:  'BUSINESS',
  standard:  'STANDARD',
  viral:     'VIRAL',
};
const TIER_ICON = {
  epicenter: '◈', prestige: '◯', elite: '◎',
  business: '▣', standard: '▪', viral: '⚡',
};

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://adsmostfair.com';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
}
function fmtEur(cents) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

// ─── Base layout ─────────────────────────────────────────────────────────────
function base({ preheader, accentColor = '#00C8E4', body }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>ADS-SQUARE</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#01020A;font-family:'Rajdhani',system-ui,sans-serif;color:#DDE6F2;-webkit-font-smoothing:antialiased;}
  a{color:inherit;text-decoration:none;}
</style>
</head>
<body style="background:#01020A;padding:0;margin:0;">

<!-- Preheader hidden -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&zwnj;</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#01020A;min-height:100vh;">
<tr><td align="center" style="padding:32px 16px 48px;">

  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

    <!-- HEADER -->
    <tr><td style="padding-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:800;letter-spacing:.12em;color:#DDE6F2;">
              ADS<span style="color:#E8A020;">Most</span>Fair
            </span>
            <br>
            <span style="font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:.22em;color:rgba(0,200,240,0.40);">DYSON·COSMOS · GALACTIC·ADV·GRID</span>
          </td>
          <td align="right">
            <span style="font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:.18em;color:rgba(0,200,240,0.30);">
              ${new Date().toISOString().slice(0,10)}
            </span>
          </td>
        </tr>
      </table>
      <!-- Ligne energie -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,${accentColor},transparent);margin-top:12px;"></div>
    </td></tr>

    <!-- BODY -->
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:rgba(0,4,18,0.98);border:0.5px solid rgba(0,200,240,0.12);border-top:1.5px solid ${accentColor};">
        <tr><td style="padding:32px 28px 36px;">
          ${body}
        </td></tr>
      </table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="padding-top:24px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,200,240,0.15),transparent);margin-bottom:20px;"></div>
      <p style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.12em;color:rgba(60,100,150,0.45);line-height:1.9;text-align:center;">
        ADS-SQUARE · LE91-ARENA SAS · Les Ulis 91940, France<br>
        <a href="${SITE_URL()}/legal" style="color:rgba(0,200,240,0.35);">Mentions légales</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL()}/privacy" style="color:rgba(0,200,240,0.35);">Confidentialité</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL()}/cgv" style="color:rgba(0,200,240,0.35);">CGV</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL()}/dashboard" style="color:rgba(0,200,240,0.35);">Dashboard</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Composants HTML email ────────────────────────────────────────────────────

function tierBadge(tier) {
  const col = TIER_COLOR[tier] || '#00C8E4';
  const icon = TIER_ICON[tier] || '◈';
  const label = TIER_LABEL[tier] || tier?.toUpperCase();
  return `<span style="display:inline-block;background:${col}18;border:0.5px solid ${col}44;
    font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;
    letter-spacing:.16em;color:${col};padding:3px 10px;">${icon} ${label}</span>`;
}

function infoRow(label, value, col = 'rgba(0,200,240,0.60)') {
  return `<tr>
    <td style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.12em;
      color:rgba(60,100,150,0.55);padding:6px 0 6px 0;border-bottom:0.5px solid rgba(0,200,240,0.06);
      white-space:nowrap;padding-right:20px;">${label}</td>
    <td style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.08em;
      color:${col};padding:6px 0;border-bottom:0.5px solid rgba(0,200,240,0.06);
      font-weight:700;">${value}</td>
  </tr>`;
}

function ctaButton(label, url, color = '#E8A020') {
  return `<a href="${url}"
    style="display:inline-block;margin-top:24px;padding:13px 28px;
    background:${color}18;border:0.5px solid ${color}55;
    font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
    letter-spacing:.18em;color:${color};text-decoration:none;
    cursor:pointer;">
    ${label} →
  </a>`;
}

function sectionTitle(text, col = '#DDE6F2') {
  return `<p style="font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:800;
    letter-spacing:.04em;color:${col};margin-bottom:6px;">${text}</p>`;
}

function subText(text) {
  return `<p style="font-family:'JetBrains Mono',monospace;font-size:8.5px;
    letter-spacing:.08em;color:rgba(140,180,220,0.55);line-height:1.9;margin-bottom:0;">${text}</p>`;
}

// ─── 1. Confirmation paiement ─────────────────────────────────────────────────
export async function sendPaymentConfirmation({
  to, displayName, tier, slotX, slotY, days,
  amountCents, startsAt, expiresAt,
}) {
  const col = TIER_COLOR[tier] || '#00C8E4';
  const icon = TIER_ICON[tier] || '◈';
  const site = SITE_URL();

  return send({
    to,
    subject: `◈ Réservation confirmée — Bloc ${TIER_LABEL[tier] || tier} (${slotX},${slotY})`,
    html: base({
      preheader: `Votre bloc publicitaire est actif sur la Sphère de Dyson. Expiration le ${fmtDate(expiresAt)}.`,
      accentColor: col,
      body: `
        <!-- Icône tier -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;
            background:${col}12;border:1px solid ${col}44;
            line-height:56px;text-align:center;font-size:24px;color:${col};">
            ${icon}
          </div>
        </div>

        ${tierBadge(tier)}
        <div style="margin-top:14px;margin-bottom:20px;">
          ${sectionTitle(`Bonjour ${displayName},`)}
          ${subText(`Votre bloc publicitaire est maintenant <strong style="color:${col};">actif sur la Sphère de Dyson</strong>. Voici le récapitulatif de votre réservation.`)}
        </div>

        <!-- Tableau récap -->
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(0,200,240,0.03);border:0.5px solid rgba(0,200,240,0.10);margin-bottom:24px;">
          <tr><td style="padding:16px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow('SLOT', `(${slotX}, ${slotY})`, '#DDE6F2')}
              ${infoRow('TIER', `${icon} ${TIER_LABEL[tier] || tier}`, col)}
              ${infoRow('DURÉE', `${days} jour${days > 1 ? 's' : ''}`, '#DDE6F2')}
              ${infoRow('MONTANT', fmtEur(amountCents), '#E8A020')}
              ${infoRow('ACTIVATION', fmtDate(startsAt), 'rgba(0,216,128,0.90)')}
              ${infoRow('EXPIRATION', fmtDate(expiresAt), 'rgba(208,40,72,0.80)')}
            </table>
          </td></tr>
        </table>

        ${subText(`Vous pouvez modifier le contenu de votre bloc (logo, URL, texte, couleurs) à tout moment depuis votre dashboard, sans interruption de diffusion.`)}

        ${ctaButton('ACCÉDER À MON DASHBOARD', `${site}/dashboard`, col)}

        <div style="margin-top:28px;padding:14px 16px;
          background:rgba(0,200,240,0.04);border-left:2px solid rgba(0,200,240,0.35);">
          ${subText(`Une question ? Répondez directement à cet email ou contactez-nous à <a href="mailto:contact@adsmostfair.com" style="color:rgba(0,200,240,0.60);">contact@adsmostfair.com</a>`)}
        </div>
      `,
    }),
  });
}

// ─── 2. Rappel expiration ─────────────────────────────────────────────────────
export async function sendExpiryReminder({ to, bookingDetails, daysLeft, displayName: dn, tier: t, slotX: sx, slotY: sy, expiresAt: ea }) {
  // Accept flat params (from cron) or nested bookingDetails (from other callers)
  const displayName = dn || bookingDetails?.displayName;
  const tier   = t  || bookingDetails?.tier;
  const slotX  = sx || bookingDetails?.slotX;
  const slotY  = sy || bookingDetails?.slotY;
  const expiresAt = ea || bookingDetails?.expiresAt;
  const col = TIER_COLOR[tier] || '#E8A020';
  const icon = TIER_ICON[tier] || '◈';
  const urgent = daysLeft <= 1;
  const site = SITE_URL();

  return send({
    to,
    subject: `${urgent ? '⚠ URGENT — ' : ''}Votre bloc expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} — ADS-SQUARE`,
    html: base({
      preheader: `Votre bloc (${slotX},${slotY}) expire le ${fmtDate(expiresAt)}. Renouvelez pour maintenir votre présence.`,
      accentColor: urgent ? '#D02848' : col,
      body: `
        <!-- Horloge urgence -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;
            background:${urgent ? 'rgba(208,40,72,0.12)' : col + '12'};
            border:1px solid ${urgent ? 'rgba(208,40,72,0.55)' : col + '44'};
            line-height:56px;text-align:center;font-size:24px;
            color:${urgent ? '#D02848' : col};">
            ${urgent ? '⚠' : '◷'}
          </div>
        </div>

        ${tierBadge(tier)}
        <div style="margin-top:14px;margin-bottom:20px;">
          ${sectionTitle(urgent ? 'Dernier jour !' : `J−${daysLeft}`, urgent ? '#D02848' : '#DDE6F2')}
          ${subText(`Bonjour ${displayName || 'annonceur'},<br>
          Votre bloc <strong style="color:${col};">(${slotX}, ${slotY}) ${icon} ${TIER_LABEL[tier] || tier}</strong>
          expire dans <strong style="color:${urgent ? '#D02848' : col};">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.<br>
          ${urgent
            ? 'Après expiration, votre espace sera libéré et disponible pour d\'autres annonceurs.'
            : 'Renouvelez maintenant pour ne pas perdre votre emplacement sur la Sphère de Dyson.'
          }`)}
        </div>

        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(0,200,240,0.03);border:0.5px solid rgba(0,200,240,0.10);margin-bottom:24px;">
          <tr><td style="padding:16px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow('SLOT', `(${slotX}, ${slotY})`, '#DDE6F2')}
              ${infoRow('EXPIRATION', fmtDate(expiresAt), '#D02848')}
            </table>
          </td></tr>
        </table>

        ${ctaButton('RENOUVELER MON BLOC', `${site}/dashboard`, urgent ? '#D02848' : col)}
      `,
    }),
  });
}

// ─── 3. Notification expiration (bloc expiré) ─────────────────────────────────
export async function sendExpiryNotification({ to, bookingDetails, displayName: dn, tier: t, slotX: sx, slotY: sy }) {
  const displayName = dn || bookingDetails?.displayName;
  const tier   = t  || bookingDetails?.tier;
  const slotX  = sx || bookingDetails?.slotX;
  const slotY  = sy || bookingDetails?.slotY;
  const col = TIER_COLOR[tier] || '#D02848';
  const icon = TIER_ICON[tier] || '◈';
  const site = SITE_URL();

  return send({
    to,
    subject: `Votre bloc (${slotX},${slotY}) a expiré — ADS-SQUARE`,
    html: base({
      preheader: `Votre espace publicitaire sur la Sphère de Dyson a expiré. Réservez un nouveau bloc dès maintenant.`,
      accentColor: 'rgba(208,40,72,0.70)',
      body: `
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;
            background:rgba(208,40,72,0.08);border:1px solid rgba(208,40,72,0.40);
            line-height:56px;text-align:center;font-size:24px;color:rgba(208,40,72,0.80);">◯</div>
        </div>

        ${tierBadge(tier)}
        <div style="margin-top:14px;margin-bottom:20px;">
          ${sectionTitle('Votre bloc a expiré', '#DDE6F2')}
          ${subText(`Bonjour ${displayName || 'annonceur'},<br>
          Votre bloc <strong style="color:${col};">(${slotX}, ${slotY}) ${icon} ${TIER_LABEL[tier] || tier}</strong>
          a expiré. Votre emplacement est désormais disponible pour d'autres annonceurs.<br><br>
          Vous pouvez <strong style="color:#00C8E4;">réserver un nouveau bloc à tout moment</strong> depuis la plateforme.`)}
        </div>

        ${ctaButton('RÉSERVER UN NOUVEAU BLOC', site, '#00C8E4')}

        <div style="margin-top:28px;padding:14px 16px;
          background:rgba(0,200,240,0.04);border-left:2px solid rgba(0,200,240,0.30);">
          ${subText(`Merci d'avoir fait confiance à ADS-SQUARE. Votre historique et vos contenus sont conservés dans votre dashboard.`)}
        </div>
      `,
    }),
  });
}

// ─── 4. Confirmation liste d'attente ─────────────────────────────────────────
export async function sendWaitlistConfirmation({ to }) {
  const site = SITE_URL();
  return send({
    to,
    subject: '◈ Vous êtes sur la liste — ADS-SQUARE',
    html: base({
      preheader: 'Votre place sur la liste d\'attente ADS-SQUARE est confirmée. On vous prévient dès l\'ouverture.',
      accentColor: '#E8A020',
      body: `
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;
            background:rgba(232,160,32,0.12);border:1px solid rgba(232,160,32,0.44);
            line-height:56px;text-align:center;font-size:24px;color:#E8A020;">◈</div>
        </div>

        ${sectionTitle('Vous êtes dans la liste.', '#E8A020')}
        <div style="margin-top:12px;margin-bottom:24px;">
          ${subText(`Votre email a bien été enregistré pour l'accès prioritaire à ADS-SQUARE.<br><br>
          Dès l'ouverture de la bêta publique, vous serez les premier·ère·s notifié·e·s.<br>
          En attendant, vous pouvez explorer la Sphère de Dyson en lecture.`)}
        </div>

        ${ctaButton('EXPLORER LA SPHÈRE', site, '#E8A020')}
      `,
    }),
  });
}

// ─── 5. Notification offre de rachat ─────────────────────────────────────────
export async function sendOfferNotification({ to, offerDetails }) {
  const { displayName, tier, slotX, slotY, offerAmount, offerFrom } = offerDetails || {};
  const col = TIER_COLOR[tier] || '#E8A020';
  const icon = TIER_ICON[tier] || '◈';
  const site = SITE_URL();

  return send({
    to,
    subject: `◈ Nouvelle offre de rachat sur votre bloc (${slotX},${slotY}) — ADS-SQUARE`,
    html: base({
      preheader: `${offerFrom || 'Un annonceur'} souhaite racheter votre bloc pour ${fmtEur(offerAmount)}.`,
      accentColor: col,
      body: `
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;
            background:${col}12;border:1px solid ${col}44;
            line-height:56px;text-align:center;font-size:24px;color:${col};">€</div>
        </div>

        ${tierBadge(tier)}
        <div style="margin-top:14px;margin-bottom:20px;">
          ${sectionTitle('Offre de rachat reçue', '#DDE6F2')}
          ${subText(`Bonjour ${displayName || 'annonceur'},<br>
          Un annonceur souhaite racheter votre bloc <strong style="color:${col};">(${slotX}, ${slotY}) ${icon}</strong>.`)}
        </div>

        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(0,200,240,0.03);border:0.5px solid rgba(0,200,240,0.10);margin-bottom:24px;">
          <tr><td style="padding:16px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow('DE', offerFrom || '—', '#DDE6F2')}
              ${infoRow('MONTANT PROPOSÉ', fmtEur(offerAmount || 0), '#E8A020')}
              ${infoRow('VOTRE SLOT', `(${slotX}, ${slotY}) ${icon} ${TIER_LABEL[tier] || tier}`, col)}
            </table>
          </td></tr>
        </table>

        ${subText('Vous pouvez accepter ou refuser cette offre depuis votre dashboard. L\'offre est valable 48h.')}
        ${ctaButton('VOIR L\'OFFRE', `${site}/dashboard`, col)}
      `,
    }),
  });
}
