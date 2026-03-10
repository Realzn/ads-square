// lib/stripe-email-hooks.js
// Helpers pour déclencher les emails transactionnels depuis les webhooks Stripe
// À importer dans votre handler webhook Stripe existant

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * À appeler après activation d'un booking (payment_intent.succeeded / checkout.session.completed)
 * @param {Object} booking - Données du booking depuis Supabase
 * @param {Object} advertiser - Données de l'annonceur
 */
export async function onBookingActivated(booking, advertiser) {
  if (!advertiser?.email) return;

  await fetch(`${APP_URL}/api/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'booking_confirmed',
      to: advertiser.email,
      name: advertiser.display_name || 'Annonceur',
      slotX: booking.slot_x,
      slotY: booking.slot_y,
      tier: booking.tier,
      endDate: new Date(booking.end_date).toLocaleDateString('fr-FR'),
      totalCents: booking.amount_cents,
    }),
  }).catch(err => console.error('[Email] booking_confirmed failed:', err));
}

/**
 * À appeler quand une offre de rachat est créée
 * @param {Object} offer - Données de l'offre
 * @param {Object} ownerAdvertiser - Propriétaire actuel du slot
 */
export async function onOfferReceived(offer, ownerAdvertiser) {
  if (!ownerAdvertiser?.email) return;

  await fetch(`${APP_URL}/api/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'offer_received',
      to: ownerAdvertiser.email,
      name: ownerAdvertiser.display_name || 'Annonceur',
      offerAmount: offer.offer_amount_cents,
      buyerName: offer.buyer_name || 'Un acheteur',
      slotX: offer.slot_x,
      slotY: offer.slot_y,
      expiresAt: new Date(offer.expires_at).toLocaleDateString('fr-FR'),
    }),
  }).catch(err => console.error('[Email] offer_received failed:', err));
}

/**
 * Intégration dans votre webhook Stripe :
 *
 * // Dans votre switch(event.type) :
 *
 * case 'checkout.session.completed': {
 *   const session = event.data.object;
 *   // ... votre logique existante pour activer le booking ...
 *   const booking = await activateBooking(session);
 *   const advertiser = await getAdvertiser(booking.advertiser_id);
 *   await onBookingActivated(booking, advertiser);
 *   break;
 * }
 *
 * case 'payment_intent.succeeded': {
 *   // Si c'est une offre de rachat acceptée
 *   const offer = await getOfferByPaymentIntent(paymentIntent.id);
 *   if (offer) {
 *     const owner = await getAdvertiser(offer.owner_advertiser_id);
 *     await onOfferReceived(offer, owner);
 *   }
 *   break;
 * }
 */
