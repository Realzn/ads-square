// lib/emails.js
// Helpers d'envoi d'email (transactionnel)
// Configurer avec Resend, SendGrid, ou autre service selon ENV.

export async function sendWaitlistConfirmation({ to }) {
  // Implémentation selon le service email configuré (ex: Resend)
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[emails] RESEND_API_KEY non configurée — email non envoyé');
    return;
  }
  // TODO: implémenter avec le service email de votre choix
}

export async function sendPaymentConfirmation({ to, bookingDetails }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[emails] RESEND_API_KEY non configurée — email non envoyé');
    return;
  }
  // TODO: implémenter avec le service email de votre choix
}
