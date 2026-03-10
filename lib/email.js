// lib/email.js
// Helper centralisé pour l'envoi d'emails transactionnels

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Envoie un email transactionnel via l'API interne /api/emails
 * @param {Object} params
 * @param {string} params.to - Email destinataire
 * @param {string} params.type - Type d'email (waitlist_welcome, booking_confirmed, etc.)
 * @param {string} [params.subject] - Sujet (optionnel, sinon généré automatiquement)
 * @param {Object} [params.data] - Données pour le template
 */
export async function sendEmail({ to, type, subject, ...data }) {
  if (!to || !type) {
    console.error('[sendEmail] Paramètres manquants: to et type requis');
    return { ok: false, error: 'Paramètres manquants' };
  }

  try {
    const res = await fetch(`${APP_URL}/api/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type, subject, ...data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      console.error('[sendEmail] Erreur:', err);
      return { ok: false, error: err.error };
    }

    return await res.json();
  } catch (err) {
    console.error('[sendEmail] Exception:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Notifie l'admin d'un événement important
 * (implémentation simple via email)
 */
export async function notifyAdmin(subject, message) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  return sendEmail({
    to: adminEmail,
    type: 'admin_notification',
    subject: `[ADS-SQUARE Admin] ${subject}`,
    message,
  }).catch(() => {});
}
