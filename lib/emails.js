// lib/emails.js — Service email centralisé (Resend)
// Tous les templates HTML + fonction d'envoi unique
// Resend : https://resend.com — gratuit 3000 emails/mois
//
// Variables d'environnement requises :
//   RESEND_API_KEY    → depuis Resend Dashboard → API Keys
//   RESEND_FROM_EMAIL → ex: "ADS-SQUARE <noreply@ads-square.com>"
//                       (domaine doit être vérifié dans Resend)

const RESEND_API = 'https://api.resend.com/emails';

// ─── Couleurs & constantes design ────────────────────────────
const D = {
  bg:      '#080808',
  card:    '#111111',
  border:  '#1f1f1f',
  text:    '#f0f0f0',
  muted:   '#888888',
  accent:  '#d4a84b',
  green:   '#00e8a2',
  cyan:    '#00d9f5',
};

// ─── Envoi via Resend API ─────────────────────────────────────
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL || 'ADS-SQUARE <noreply@ads-square.com>';

  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY non défini — email non envoyé:', subject);
    return { ok: false, error: 'RESEND_API_KEY manquant' };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Email] Resend error:', data);
      return { ok: false, error: data.message };
    }
    console.log('[Email] Sent:', subject, '→', to, '| id:', data.id);
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('[Email] Network error:', err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Utilitaires templates ────────────────────────────────────
function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ADS-SQUARE</title>
</head>
<body style="margin:0;padding:0;background:${D.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${D.text};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${D.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="padding:0 0 28px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:900;letter-spacing:-0.02em;color:${D.text};">
                      ADS<span style="color:${D.accent};">·</span>SQUARE
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:${D.muted};letter-spacing:0.08em;text-transform:uppercase;">BÊTA</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:${D.border};margin-top:14px;"></div>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="background:${D.card};border:1px solid ${D.border};border-radius:12px;overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${D.muted};">
                ADS-SQUARE — La grille publicitaire interactive
              </p>
              <p style="margin:0;font-size:11px;color:#444;">
                <a href="https://ads-square.pages.dev" style="color:${D.accent};text-decoration:none;">ads-square.pages.dev</a>
                &nbsp;·&nbsp;
                <a href="https://ads-square.pages.dev/legal" style="color:#555;text-decoration:none;">Mentions légales</a>
                &nbsp;·&nbsp;
                <a href="https://ads-square.pages.dev/cgv" style="color:#555;text-decoration:none;">CGV</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function accentBar(color = D.accent) {
  return `<div style="height:3px;background:linear-gradient(90deg,${color},${color}80,transparent);"></div>`;
}

function statBadge(value, label, color = D.accent) {
  return `<td align="center" style="padding:12px 8px;background:#0d0d0d;border-radius:8px;">
    <div style="font-size:22px;font-weight:900;color:${color};letter-spacing:-0.02em;">${value}</div>
    <div style="font-size:10px;color:${D.muted};margin-top:3px;text-transform:uppercase;letter-spacing:0.06em;">${label}</div>
  </td>`;
}

function ctaButton(href, label, color = D.accent) {
  return `<a href="${href}" style="display:inline-block;padding:13px 28px;background:${color};color:#080808;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">${label}</a>`;
}

function tierBadge(tier) {
  const colors = { one:'#9d7dff', ten:'#f0b429', corner_ten:'#f0b429', hundred:'#00d9f5', thousand:'#00e8a2' };
  const labels = { one:'ÉPICENTRE', ten:'PRESTIGE', corner_ten:'CORNER', hundred:'BUSINESS', thousand:'VIRAL' };
  const c = colors[tier] || D.accent;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:${c}18;border:1px solid ${c}40;color:${c};font-size:10px;font-weight:800;letter-spacing:0.08em;">${labels[tier] || tier.toUpperCase()}</span>`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
}

// ─────────────────────────────────────────────────────────────
// EMAIL 1 — Confirmation de paiement + bienvenue
// ─────────────────────────────────────────────────────────────
export async function sendPaymentConfirmation({ to, displayName, tier, slotX, slotY, days, amountCents, startsAt, expiresAt }) {
  const amount   = (amountCents / 100).toLocaleString('fr-FR', { style:'currency', currency:'EUR' });
  const startFmt = formatDate(startsAt);
  const endFmt   = formatDate(expiresAt);
  const dashUrl  = 'https://ads-square.pages.dev/dashboard';

  const html = baseLayout(`
    ${accentBar(D.green)}
    <div style="padding:32px 32px 0;">
      <div style="font-size:28px;margin-bottom:6px;">✅</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${D.text};letter-spacing:-0.02em;">Paiement confirmé !</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${D.muted};line-height:1.6;">
        Bonjour <strong style="color:${D.text};">${displayName}</strong>, votre bloc est maintenant <strong style="color:${D.green};">actif sur la grille</strong>.<br/>
        Il sera visible par tous les visiteurs jusqu'à la date d'expiration.
      </p>

      <!-- Bloc détails -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid ${D.border};border-radius:10px;margin-bottom:24px;">
        <tr>
          <td style="padding:18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:10px;">
                  <span style="font-size:10px;color:${D.muted};text-transform:uppercase;letter-spacing:0.08em;">Votre bloc</span><br/>
                  ${tierBadge(tier)}
                  <span style="margin-left:8px;font-size:13px;color:${D.muted};">Position (${slotX}, ${slotY})</span>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid ${D.border};padding-top:12px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:${D.muted};">Début</td>
                      <td style="font-size:12px;color:${D.text};text-align:right;font-weight:600;">${startFmt}</td>
                    </tr>
                    <tr style="height:6px;"></tr>
                    <tr>
                      <td style="font-size:12px;color:${D.muted};">Expiration</td>
                      <td style="font-size:12px;color:${D.text};text-align:right;font-weight:600;">${endFmt}</td>
                    </tr>
                    <tr style="height:6px;"></tr>
                    <tr>
                      <td style="font-size:12px;color:${D.muted};">Durée</td>
                      <td style="font-size:12px;color:${D.text};text-align:right;font-weight:600;">${days} jour${days > 1 ? 's' : ''}</td>
                    </tr>
                    <tr style="height:6px;"></tr>
                    <tr>
                      <td style="font-size:12px;color:${D.muted};">Montant total</td>
                      <td style="font-size:14px;color:${D.accent};text-align:right;font-weight:800;">${amount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Prochaines étapes -->
      <p style="margin:0 0 10px;font-size:12px;color:${D.muted};text-transform:uppercase;letter-spacing:0.08em;">Prochaines étapes</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        ${[
          ['Personnaliser votre bloc', 'Ajoutez une image, accroche et lien depuis votre espace.', D.cyan],
          ['Activer le boost', 'Passez en visibilité maximale dans le ticker de la grille.', D.accent],
          ['Suivre vos stats', 'Vues, clics, CTR — données réelles en temps réel.', D.green],
        ].map(([title, desc, color]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${D.border};">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:${D.text};margin-bottom:2px;">${title}</div>
                  <div style="font-size:12px;color:${D.muted};">${desc}</div>
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </table>

      <div style="text-align:center;padding-bottom:32px;">
        ${ctaButton(dashUrl, 'Accéder à mon espace →', D.accent)}
      </div>
    </div>
  `);

  return sendEmail({ to, subject: `✅ Votre bloc ${tier.toUpperCase()} est actif — ADS-SQUARE`, html });
}

// ─────────────────────────────────────────────────────────────
// EMAIL 2 — Rappel 3 jours avant expiration
// ─────────────────────────────────────────────────────────────
export async function sendExpiryReminder({ to, displayName, tier, slotX, slotY, expiresAt, pricePerDay }) {
  const endFmt   = formatDate(expiresAt);
  const renewUrl = 'https://ads-square.pages.dev/dashboard';
  const gridUrl  = `https://ads-square.pages.dev/?highlight=${slotX}-${slotY}`;

  const html = baseLayout(`
    ${accentBar('#f0b429')}
    <div style="padding:32px 32px 0;">
      <div style="font-size:28px;margin-bottom:6px;">⏳</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${D.text};letter-spacing:-0.02em;">Votre bloc expire dans 3 jours</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${D.muted};line-height:1.6;">
        Bonjour <strong style="color:${D.text};">${displayName}</strong>,<br/>
        votre bloc <strong style="color:#f0b429;">${tier.toUpperCase()}</strong> en position (${slotX}, ${slotY}) 
        expire le <strong style="color:${D.text};">${endFmt}</strong>.<br/>
        Renouvelez maintenant pour conserver votre emplacement.
      </p>

      <!-- Alerte visuelle -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0b42910;border:1px solid #f0b42930;border-radius:10px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:${D.muted};">Bloc</td>
                <td style="text-align:right;">${tierBadge(tier)}</td>
              </tr>
              <tr style="height:8px;"></tr>
              <tr>
                <td style="font-size:12px;color:${D.muted};">Position</td>
                <td style="font-size:13px;color:${D.text};text-align:right;font-weight:600;">(${slotX}, ${slotY})</td>
              </tr>
              <tr style="height:8px;"></tr>
              <tr>
                <td style="font-size:12px;color:${D.muted};">Expiration</td>
                <td style="font-size:13px;color:#f0b429;text-align:right;font-weight:700;">${endFmt}</td>
              </tr>
              <tr style="height:8px;"></tr>
              <tr>
                <td style="font-size:12px;color:${D.muted};">Tarif</td>
                <td style="font-size:13px;color:${D.text};text-align:right;font-weight:600;">€${pricePerDay}/jour</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:13px;color:${D.muted};line-height:1.6;text-align:center;">
        ⚠️ Si vous ne renouvelez pas, votre bloc sera libéré et disponible pour d'autres annonceurs.
      </p>

      <div style="text-align:center;padding-bottom:32px;">
        ${ctaButton(renewUrl, 'Renouveler mon bloc →', '#f0b429')}
        <div style="margin-top:12px;">
          <a href="${gridUrl}" style="font-size:12px;color:${D.muted};text-decoration:none;">Voir mon bloc sur la grille</a>
        </div>
      </div>
    </div>
  `);

  return sendEmail({ to, subject: `⏳ Votre bloc ADS-SQUARE expire dans 3 jours`, html });
}

// ─────────────────────────────────────────────────────────────
// EMAIL 3 — Notification d'offre de rachat reçue
// ─────────────────────────────────────────────────────────────
export async function sendOfferNotification({ to, occupantName, tier, slotX, slotY, buyerName, offerCents, message, offerExpiresAt }) {
  const amount    = (offerCents / 100).toLocaleString('fr-FR', { style:'currency', currency:'EUR' });
  const expiryFmt = formatDate(offerExpiresAt);
  const dashUrl   = 'https://ads-square.pages.dev/dashboard';

  const html = baseLayout(`
    ${accentBar(D.cyan)}
    <div style="padding:32px 32px 0;">
      <div style="font-size:28px;margin-bottom:6px;">💬</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${D.text};letter-spacing:-0.02em;">Vous avez reçu une offre !</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${D.muted};line-height:1.6;">
        Bonjour <strong style="color:${D.text};">${occupantName}</strong>,<br/>
        <strong style="color:${D.cyan};">${buyerName || 'Un annonceur'}</strong> souhaite racheter votre bloc 
        ${tierBadge(tier)} en position (${slotX}, ${slotY}).
      </p>

      <!-- Détails de l'offre -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1e2e;border:1px solid #00d9f520;border-radius:10px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:11px;color:${D.muted};letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Offre proposée</div>
              <div style="font-size:36px;font-weight:900;color:${D.cyan};letter-spacing:-0.02em;">${amount}</div>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1a2e3e;padding-top:14px;">
              <tr style="height:14px;"></tr>
              <tr>
                <td style="font-size:12px;color:${D.muted};">De la part de</td>
                <td style="font-size:13px;color:${D.text};text-align:right;font-weight:600;">${buyerName || 'Anonyme'}</td>
              </tr>
              <tr style="height:8px;"></tr>
              <tr>
                <td style="font-size:12px;color:${D.muted};">Expiration de l'offre</td>
                <td style="font-size:12px;color:#f0b429;text-align:right;font-weight:600;">${expiryFmt}</td>
              </tr>
              ${message ? `
              <tr style="height:12px;"></tr>
              <tr>
                <td colspan="2" style="font-size:12px;color:${D.muted};background:#0a1820;border-radius:6px;padding:10px;border-left:2px solid ${D.cyan}40;font-style:italic;">
                  "${message}"
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:13px;color:${D.muted};line-height:1.6;text-align:center;">
        Accepter cette offre libèrera votre bloc et vous sera rémunéré.<br/>
        L'offre expire dans <strong style="color:${D.text};">72 heures</strong>.
      </p>

      <div style="text-align:center;padding-bottom:32px;">
        ${ctaButton(dashUrl, 'Voir et répondre à l\'offre →', D.cyan)}
      </div>
    </div>
  `);

  return sendEmail({ to, subject: `💬 Offre de rachat reçue : ${amount} pour votre bloc ADS-SQUARE`, html });
}

// ─────────────────────────────────────────────────────────────
// EMAIL 4 — Notification d'expiration
// ─────────────────────────────────────────────────────────────
export async function sendExpiryNotification({ to, displayName, tier, slotX, slotY, expiredAt }) {
  const expiredFmt = formatDate(expiredAt);
  const reserveUrl = 'https://ads-square.pages.dev/?view=advertiser';

  const html = baseLayout(`
    ${accentBar(D.muted)}
    <div style="padding:32px 32px 0;">
      <div style="font-size:28px;margin-bottom:6px;">🔔</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${D.text};letter-spacing:-0.02em;">Votre bloc a expiré</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${D.muted};line-height:1.6;">
        Bonjour <strong style="color:${D.text};">${displayName}</strong>,<br/>
        votre bloc ${tierBadge(tier)} en position (${slotX}, ${slotY}) a expiré le 
        <strong style="color:${D.text};">${expiredFmt}</strong>.<br/>
        Il est de nouveau disponible pour d'autres annonceurs.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid ${D.border};border-radius:10px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 20px;text-align:center;">
            <p style="margin:0 0 14px;font-size:13px;color:${D.muted};">Vous souhaitez reprendre cet emplacement ?</p>
            ${ctaButton(reserveUrl, 'Réserver à nouveau →', D.accent)}
          </td>
        </tr>
      </table>

      <p style="margin:0 0 28px;font-size:12px;color:#444;line-height:1.6;text-align:center;">
        Merci d'avoir fait confiance à ADS-SQUARE.<br/>
        Vos statistiques restent accessibles dans votre espace.
      </p>
    </div>
  `);

  return sendEmail({ to, subject: `🔔 Votre bloc ADS-SQUARE a expiré`, html });
}
