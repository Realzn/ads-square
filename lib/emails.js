// lib/emails.js — Helpers d'envoi d'email transactionnel

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

export async function sendWaitlistConfirmation({ to }) {
  return send({
    to,
    subject: 'Bienvenue sur la liste d\'attente ADS-SQUARE !',
    html: `<p>Merci de rejoindre ADS-SQUARE ! Nous vous contacterons dès l\'ouverture de la bêta publique.</p>`,
  });
}

export async function sendPaymentConfirmation({ to, bookingDetails }) {
  return send({
    to,
    subject: 'Confirmation de votre réservation ADS-SQUARE',
    html: `<p>Votre réservation est confirmée. Merci d\'utiliser ADS-SQUARE !</p>`,
  });
}

export async function sendExpiryReminder({ to, bookingDetails, daysLeft }) {
  return send({
    to,
    subject: `Votre bloc ADS-SQUARE expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
    html: `<p>Votre bloc publicitaire expire bientôt. Pensez à renouveler votre réservation.</p>`,
  });
}

export async function sendExpiryNotification({ to, bookingDetails }) {
  return send({
    to,
    subject: 'Votre bloc ADS-SQUARE a expiré',
    html: `<p>Votre bloc publicitaire a expiré. Vous pouvez en réserver un nouveau sur ADS-SQUARE.</p>`,
  });
}

export async function sendOfferNotification({ to, offerDetails }) {
  return send({
    to,
    subject: 'Nouvelle offre de rachat sur votre bloc ADS-SQUARE',
    html: `<p>Vous avez reçu une nouvelle offre de rachat pour votre bloc. Connectez-vous pour y répondre.</p>`,
  });
}
