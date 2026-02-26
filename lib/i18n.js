// lib/i18n.js — Dictionnaire FR / EN
// Usage : const t = useT(); t('key')

export const translations = {
  // ─── Global / Header ────────────────────────────────────────
  'nav.explore':       { fr: 'Explorer',       en: 'Explore' },
  'nav.myspace':       { fr: 'Mon espace',      en: 'My space' },
  'nav.waitlist':      { fr: "Liste d'attente", en: 'Waitlist' },
  'nav.waitlist.short':{ fr: 'Attente',         en: 'Waitlist' },

  // ─── Announcement bar ────────────────────────────────────────
  'banner.text':       { fr: 'Plateforme en développement — réservations bientôt disponibles.', en: 'Platform in development — reservations opening soon.' },
  'banner.cta':        { fr: "Rejoindre la liste d'attente →", en: 'Join the waitlist →' },
  'banner.badge':      { fr: 'BÊTA', en: 'BETA' },

  // ─── Landing ─────────────────────────────────────────────────
  'landing.badge':     { fr: 'Bêta publique — lancement imminent', en: 'Public beta — launching soon' },
  'landing.title1':    { fr: 'La grille publicitaire', en: 'The advertising grid' },
  'landing.title2':    { fr: 'ouverte à tous.', en: 'open to everyone.' },
  'landing.sub':       { fr: '1 296 blocs. Créateur, freelance ou grande marque — choisissez votre espace directement depuis la vue 3D. Dès 1€/jour.', en: '1,296 blocks. Creator, freelancer, or big brand — pick your space directly from the 3D view. From €1/day.' },
  'landing.stat.active':   { fr: 'Blocs actifs',     en: 'Active blocks' },
  'landing.stat.free':     { fr: 'Blocs libres',      en: 'Free blocks' },
  'landing.stat.visitors': { fr: 'visiteurs / jour',  en: 'visitors / day' },
  'landing.stat.views':    { fr: 'vues totales',       en: 'total views' },
  'landing.stat.clicks':   { fr: 'clics générés',      en: 'clicks generated' },
  'landing.stat.total':    { fr: 'Total',              en: 'Total' },
  'landing.stat.from':     { fr: 'Dès',               en: 'From' },
  'landing.cta.explore':  { fr: 'Explorer la grille',  en: 'Explore the grid' },
  'landing.cta.choose':   { fr: 'Choisir mon bloc',    en: 'Choose my block' },
  'landing.cta.waitlist': { fr: "Liste d'attente →",   en: 'Waitlist →' },
  'landing.tagline':      { fr: 'Sans budget minimum · Sans agence · Résultat immédiat', en: 'No minimum budget · No agency · Instant results' },

  // ─── PublicView toolbar ───────────────────────────────────────
  'toolbar.grid':       { fr: 'Grille',  en: 'Grid' },
  'toolbar.feed':       { fr: 'Feed',    en: 'Feed' },
  'toolbar.all':        { fr: 'Tous',    en: 'All' },
  'toolbar.epicenter':  { fr: 'Épicentre', en: 'Epicenter' },
  'toolbar.prestige':   { fr: 'Prestige',  en: 'Prestige' },
  'toolbar.elite':      { fr: 'Elite',     en: 'Elite' },
  'toolbar.business':   { fr: 'Business',  en: 'Business' },
  'toolbar.standard':   { fr: 'Standard',  en: 'Standard' },
  'toolbar.viral':      { fr: 'Viral',     en: 'Viral' },
  'toolbar.live':       { fr: 'Live',      en: 'Live' },
  'toolbar.active':     { fr: 'actifs',    en: 'active' },
  'toolbar.free':       { fr: 'libres',    en: 'free' },

  // ─── FocusModal ───────────────────────────────────────────────
  'focus.tier_price':   { fr: (tier, price) => `${tier} · €${price}/j`, en: (tier, price) => `${tier} · €${price}/day` },
  'focus.cta_visit':    { fr: (cta) => `${cta} →`, en: (cta) => `${cta} →` },
  'focus.empty.title':  { fr: 'Espace libre', en: 'Available space' },
  'focus.empty.body':   { fr: (tier) => `Ce bloc ${tier} n'est actuellement occupé par personne.\nCliquez sur "Réserver" pour le louer directement depuis la vue 3D.`, en: (tier) => `This ${tier} block is currently unoccupied.\nClick "Book" to rent it directly from the 3D view.` },
  'focus.empty.cta':    { fr: 'Réserver ce bloc →', en: 'Book this block →' },

  // ─── TikTok Feed ──────────────────────────────────────────────
  'feed.available':     { fr: 'DISPONIBLE', en: 'AVAILABLE' },
  'feed.no_slots':      { fr: 'Aucun bloc actif', en: 'No active blocks' },

  // ─── Waitlist Modal ───────────────────────────────────────────
  'waitlist.label':     { fr: 'ACCÈS ANTICIPÉ', en: 'EARLY ACCESS' },
  'waitlist.title':     { fr: 'Soyez parmi les premiers', en: 'Be among the first' },
  'waitlist.body':      { fr: 'La plateforme ouvre bientôt. Inscrivez-vous pour être notifié et obtenir un tarif de lancement.', en: 'The platform opens soon. Sign up to be notified and get a launch price.' },
  'waitlist.nospam':    { fr: 'Aucun spam. Désabonnement en un clic.', en: 'No spam. Unsubscribe in one click.' },

  // ─── Checkout Modal ───────────────────────────────────────────
  'checkout.label':     { fr: (tier) => tier, en: (tier) => tier },
  'checkout.title':     { fr: 'Réserver ce bloc', en: 'Book this block' },
  'checkout.position':  { fr: (x, y, price) => `Position (${x}, ${y}) · €${price}/jour`, en: (x, y, price) => `Position (${x}, ${y}) · €${price}/day` },
  'checkout.duration':  { fr: 'DURÉE', en: 'DURATION' },
  'checkout.days':      { fr: (d) => `${d}j`, en: (d) => `${d}d` },
  'checkout.email':     { fr: 'EMAIL', en: 'EMAIL' },
  'checkout.email.ph':  { fr: 'votre@email.com', en: 'your@email.com' },
  'checkout.summary':   { fr: (d, p) => `${d} jours × €${p}`, en: (d, p) => `${d} days × €${p}` },
  'checkout.pay':       { fr: (total) => `Payer €${total}`, en: (total) => `Pay €${total}` },
  'checkout.loading':   { fr: 'Redirection vers Stripe…', en: 'Redirecting to Stripe…' },
  'checkout.secure':    { fr: 'Paiement sécurisé · Annulation possible', en: 'Secure payment · Cancellation possible' },

  // ─── Buyout Modal ─────────────────────────────────────────────
  'buyout.label':       { fr: (tier) => tier, en: (tier) => tier },
  'buyout.title':       { fr: 'Faire une offre de rachat', en: 'Make a buyout offer' },
  'buyout.body':        { fr: "L'occupant actuel recevra votre offre et aura", en: 'The current occupant will receive your offer and has' },
  'buyout.72h':         { fr: '72 heures', en: '72 hours' },
  'buyout.body2':       { fr: 'pour accepter ou refuser. Aucun débit si refusé.', en: 'to accept or decline. No charge if declined.' },
  'buyout.amount':      { fr: 'VOTRE OFFRE', en: 'YOUR OFFER' },
  'buyout.min':         { fr: (min) => `Offre minimum : €${min}`, en: (min) => `Minimum offer: €${min}` },
  'buyout.commission':  { fr: 'Commission plateforme : 20%', en: 'Platform commission: 20%' },
  'buyout.email':       { fr: 'EMAIL', en: 'EMAIL' },
  'buyout.email.ph':    { fr: 'vous@email.com', en: 'you@email.com' },
  'buyout.name':        { fr: 'NOM (optionnel)', en: 'NAME (optional)' },
  'buyout.name.ph':     { fr: 'Votre marque', en: 'Your brand' },
  'buyout.message':     { fr: "MESSAGE POUR L'OCCUPANT (optionnel)", en: 'MESSAGE TO OCCUPANT (optional)' },
  'buyout.message.ph':  { fr: 'Expliquez pourquoi vous voulez ce bloc...', en: 'Explain why you want this block...' },
  'buyout.submit':      { fr: "Envoyer l'offre →", en: 'Send offer →' },
  'buyout.submitting':  { fr: 'Envoi…', en: 'Sending…' },
  'buyout.nodebite':    { fr: 'Aucun débit maintenant · Paiement seulement si accepté', en: 'No charge now · Payment only if accepted' },
  'buyout.sent.title':  { fr: 'Offre envoyée', en: 'Offer sent' },
  'buyout.sent.body':   { fr: "L'occupant a été notifié. Vous recevrez une réponse par email sous", en: 'The occupant has been notified. You will receive a reply by email within' },
  'buyout.sent.body2':  { fr: 'Si l\'offre est acceptée, vous serez débité et le bloc vous sera transféré immédiatement.', en: 'If the offer is accepted, you will be charged and the block will be transferred to you immediately.' },
  'buyout.close':       { fr: 'Fermer', en: 'Close' },

  // ─── AdvertiserView sidebar ───────────────────────────────────
  'adv.choose':         { fr: 'CHOISIR UN ESPACE', en: 'CHOOSE A SPACE' },
  'adv.tier.epicenter':  { fr: 'Épicentre', en: 'Epicenter' },
  'adv.tier.prestige':   { fr: 'Prestige',  en: 'Prestige' },
  'adv.tier.elite':      { fr: 'Elite',     en: 'Elite' },
  'adv.tier.business':   { fr: 'Business',  en: 'Business' },
  'adv.tier.standard':   { fr: 'Standard',  en: 'Standard' },
  'adv.tier.viral':      { fr: 'Viral',     en: 'Viral' },
  'adv.tier.center':     { fr: 'Centre absolu',         en: 'Absolute center' },
  'adv.tier.crown':      { fr: 'Couronne centrale',     en: 'Central crown' },
  'adv.tier.elite.desc': { fr: "Zone d'influence",      en: 'Influence zone' },
  'adv.tier.mid':        { fr: 'Zone intermédiaire',    en: 'Mid zone' },
  'adv.tier.standard.desc': { fr: 'Visibilité large',   en: 'Wide visibility' },
  'adv.tier.perimeter':  { fr: 'Périphérie',            en: 'Perimeter' },
  'adv.tier.perday':    { fr: '/j', en: '/day' },
  'adv.tier.blocks':    { fr: 'blocs', en: 'blocks' },
  'adv.occupied':       { fr: 'OCCUPÉ', en: 'OCCUPIED' },
  'adv.selected':       { fr: 'Bloc sélectionné', en: 'Selected block' },
  'adv.stats.title':    { fr: 'STATISTIQUES DU BLOC', en: 'BLOCK STATISTICS' },
  'adv.stats.loading':  { fr: 'Chargement…', en: 'Loading…' },
  'adv.stats.nodemo':   { fr: 'Stats non disponibles en démo', en: 'Stats not available in demo' },
  'adv.stats.impr':     { fr: 'Impressions', en: 'Impressions' },
  'adv.stats.clicks':   { fr: 'Clics total', en: 'Total clicks' },
  'adv.stats.ctr':      { fr: 'CTR', en: 'CTR' },
  'adv.stats.clicks7d': { fr: 'Clics 7j', en: 'Clicks 7d' },
  'adv.cta.offer':      { fr: 'Faire une offre de rachat →', en: 'Make a buyout offer →' },
  'adv.cta.offer.sub':  { fr: "L'occupant a 72h pour accepter · Aucun débit si refusé", en: 'Occupant has 72h to accept · No charge if declined' },
  'adv.cta.rent':       { fr: 'Louer ce bloc →', en: 'Rent this block →' },
  'adv.cta.rent.sub':   { fr: (price) => `Disponible immédiatement · À partir de €${price}/jour`, en: (price) => `Available immediately · From €${price}/day` },
  'adv.empty':          { fr: 'Survolez un tier pour filtrer la grille.\nCliquez sur un bloc pour voir ses stats et options.', en: 'Hover a tier to filter the grid.\nClick a block to see stats and options.' },
  'adv.waitlist':       { fr: "Rejoindre la liste d'attente", en: 'Join the waitlist' },

  // ─── Theme / Category filters ────────────────────────────────
  'theme.all':       { fr: 'Tous',        en: 'All' },
  'theme.video':     { fr: 'Vidéo',       en: 'Video' },
  'theme.image':     { fr: 'Image',       en: 'Image' },
  'theme.link':      { fr: 'Liens',       en: 'Links' },
  'theme.social':    { fr: 'Réseaux',     en: 'Social' },
  'theme.music':     { fr: 'Musique',     en: 'Music' },
  'theme.app':       { fr: 'App',         en: 'App' },
  'theme.brand':     { fr: 'Marque',      en: 'Brand' },
  'theme.clothing':  { fr: 'Vêtements',   en: 'Clothing' },
  'theme.lifestyle': { fr: 'Lifestyle',   en: 'Lifestyle' },
  'theme.publish':   { fr: 'Publications',en: 'Publishing' },

  // ─── Manifest / Contrat Galactique ───────────────────────────
  'manifest.header':    { fr: 'CORP://SYS/ENROLLMENT/PROTOCOL-7', en: 'CORP://SYS/ENROLLMENT/PROTOCOL-7' },
  'manifest.waiting':   { fr: '◈ EN ATTENTE DE SIGNATURE', en: '◈ AWAITING SIGNATURE' },
  'manifest.title':     { fr: 'CONTRAT GALACTIQUE — SECTION 7-ALPHA', en: 'GALACTIC CONTRACT — SECTION 7-ALPHA' },
  'manifest.subtitle':  { fr: "PROTOCOLE D'ENRÔLEMENT CORPORATIF — LECTURE OBLIGATOIRE", en: 'CORPORATE ENROLLMENT PROTOCOL — MANDATORY READING' },
  'manifest.cta.sign':  { fr: '◈ JE SIGNE LE CONTRAT ET REJOINS LA CORPORATION', en: '◈ I SIGN THE CONTRACT AND JOIN THE CORPORATION' },
  'manifest.cta.refuse':{ fr: 'REFUSER', en: 'DECLINE' },
  'manifest.footer':    { fr: "Ce contrat est valide pour l'éternité ou jusqu'à l'effondrement gravitationnel de la Grille. La Corporation décline toute responsabilité pour les événements cosmiques postérieurs à votre signature.", en: 'This contract is valid for eternity or until the gravitational collapse of the Grid. The Corporation bears no responsibility for cosmic events following your signature.' },
  'manifest.refused.header': { fr: 'CORP://SYS/SECURITY/REVOKE', en: 'CORP://SYS/SECURITY/REVOKE' },
  'manifest.refused.status':  { fr: '⚠ ACCÈS RÉVOQUÉ', en: '⚠ ACCESS REVOKED' },
  'manifest.refused.title':   { fr: 'ERREUR DE PROTOCOLE : ACCÈS RÉVOQUÉ', en: 'PROTOCOL ERROR: ACCESS REVOKED' },
  'manifest.refused.sub':     { fr: 'IDENTIFICATION ÉCHOUÉE', en: 'IDENTIFICATION FAILED' },
  'manifest.refused.body':    { fr: 'Vous avez tenté de refuser les termes du contrat galactique.\nLe système ne reconnaît pas la notion de "refus".', en: 'You attempted to decline the terms of the galactic contract.\nThe system does not recognize the concept of "refusal".' },
  'manifest.refused.conseq':  { fr: 'CONSÉQUENCES IMMÉDIATES :', en: 'IMMEDIATE CONSEQUENCES:' },
  'manifest.refused.reco':    { fr: "RECOMMANDATION :", en: 'RECOMMENDATION:' },
  'manifest.refused.reco.body': { fr: "L'Étoile ne négocie pas. Soit vous la canalisez, soit vous brûlez avec le reste des civils.", en: 'The Star does not negotiate. Either you channel it, or you burn with the rest of the civilians.' },
  'manifest.refused.reset':   { fr: '↺ RÉINITIALISER LE SERMENT ET ACCEPTER LE CONTRAT', en: '↺ RESET THE OATH AND ACCEPT THE CONTRACT' },
  'manifest.refused.quit':    { fr: 'QUITTER LE SYSTÈME', en: 'QUIT THE SYSTEM' },
  'manifest.refused.quit.note': { fr: "* QUITTER LE SYSTÈME (RETOUR À L'OBSCURITÉ) — option non disponible dans cette dimension.", en: '* QUIT THE SYSTEM (RETURN TO DARKNESS) — option not available in this dimension.' },
  'manifest.boot.title':      { fr: 'SERMENT ENREGISTRÉ — BIENVENUE DANS LA CORPORATION', en: 'OATH RECORDED — WELCOME TO THE CORPORATION' },

  // ─── Tier labels (shared) ─────────────────────────────────────
  'tier.epicenter': { fr: 'ÉPICENTRE', en: 'EPICENTER' },
  'tier.prestige':  { fr: 'PRESTIGE',  en: 'PRESTIGE' },
  'tier.elite':     { fr: 'ELITE',     en: 'ELITE' },
  'tier.business':  { fr: 'BUSINESS',  en: 'BUSINESS' },
  'tier.standard':  { fr: 'STANDARD',  en: 'STANDARD' },
  'tier.viral':     { fr: 'VIRAL',     en: 'VIRAL' },
};

// Helper to get a translation value (string or function result)
export function getT(lang) {
  return function t(key, ...args) {
    const entry = translations[key];
    if (!entry) { console.warn(`[i18n] Missing key: ${key}`); return key; }
    const val = entry[lang] ?? entry['fr'];
    return typeof val === 'function' ? val(...args) : val;
  };
}