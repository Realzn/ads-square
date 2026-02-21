'use client';
import { useState } from 'react';
import { PageShell, Section, P, Highlight, Tag } from '../legal-shared';

const U = {
  bg: '#080808', s1: '#0f0f0f', s2: '#151515',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)', faint: 'rgba(255,255,255,0.04)',
  accent: '#d4a84b',
};
const F = { h: "'Clash Display','Syne',sans-serif", b: "'DM Sans','Inter',sans-serif" };

function FAQItem({ q, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${U.border}`, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, textAlign: 'left' }}
      >
        <span style={{ color: U.text, fontSize: 14, fontWeight: 600, fontFamily: F.b, lineHeight: 1.5 }}>{q}</span>
        <span style={{ color: U.accent, fontSize: 18, fontWeight: 300, flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease', lineHeight: 1 }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 400 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        <div style={{ padding: '0 0 20px', color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.8, paddingRight: 32 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FAQSection({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: F.h, fontSize: 11, fontWeight: 700, color: U.accent, letterSpacing: '0.06em', margin: '0 0 4px', textTransform: 'uppercase' }}>{title}</h2>
      <h3 style={{ fontFamily: F.h, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: U.text, margin: '0 0 24px' }}></h3>
      <div style={{ border: `1px solid ${U.border}`, borderRadius: 12, padding: '0 20px', background: U.s1 }}>
        {children}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <PageShell
      title="Questions fréquentes"
      subtitle="Tout ce que vous voulez savoir sur ADS-SQUARE. Et si votre question n'est pas là, écrivez-nous."
    >
      <FAQSection title="Les bases">
        <FAQItem q="C'est quoi exactement ADS-SQUARE ?">
          Une grille interactive de 1 369 blocs publicitaires, organisés du centre vers la périphérie. Plus vous êtes proche du centre, plus vous êtes visible — et plus c'est cher. C'est pensé pour que tout le monde puisse trouver un espace qui correspond à son budget, du créateur solo à la grande marque.
        </FAQItem>
        <FAQItem q="Qui peut acheter un bloc ?">
          Tout le monde. Littéralement. Créateur TikTok, freelance en développement, restaurant local, e-commerce, startup, grande marque — aucun critère de taille ou de budget minimum. Si vous avez €1/jour, vous pouvez être sur ADS-SQUARE.
        </FAQItem>
        <FAQItem q="Comment ça marche concrètement ?">
          Vous choisissez un bloc disponible sur la grille → vous sélectionnez une durée (7, 30 ou 90 jours) → vous payez par carte via Stripe → votre contenu est en ligne sous 15 minutes. C'est tout. Pas d'appel commercial, pas de brief créatif, pas de validation manuelle (sauf contenu problématique).
        </FAQItem>
        <FAQItem q="La plateforme est en bêta, ça veut dire quoi ?">
          Ça veut dire qu'on est en phase de lancement et que certaines fonctionnalités arrivent progressivement (paiement direct, dashboard analytics, etc.). En bêta, les prix sont ceux de lancement — ils peuvent augmenter à l'ouverture officielle. Vos réservations bêta sont honorées aux conditions initiales.
        </FAQItem>
      </FAQSection>

      <FAQSection title="Les blocs et les tiers">
        <FAQItem q="Quelle est la différence entre les 5 tiers ?">
          <strong style={{ color: U.text }}>ÉPICENTRE</strong> (€1 000/j) — 1 seul bloc, au centre exact. Visibilité maximale, c'est ce que tout le monde voit en arrivant sur la grille.<br/><br/>
          <strong style={{ color: U.text }}>PRESTIGE + CORNER</strong> (€100/j) — Autour du centre. Les 4 coins de la grille (CORNER) ont un cachet particulier : ils sont visibles en un coup d'œil sans scroller.<br/><br/>
          <strong style={{ color: U.text }}>BUSINESS</strong> (€10/j) — Zone intermédiaire, bon équilibre visibilité/prix. 576 blocs disponibles.<br/><br/>
          <strong style={{ color: U.text }}>VIRAL</strong> (€1/j) — Périphérie de la grille. Pour les budgets serrés ou les tests. 740 blocs.
        </FAQItem>
        <FAQItem q="Est-ce qu'un bloc peut être loué par plusieurs annonceurs ?">
          Non. Un bloc = un annonceur à la fois. Si un bloc est occupé, vous pouvez soit attendre son expiration, soit soumettre une offre de rachat (voir ci-dessous).
        </FAQItem>
        <FAQItem q="Ma réservation se renouvelle automatiquement ?">
          Non. Il n'y a pas de renouvellement automatique. Vous recevez un email 48h avant l'expiration pour vous laisser le choix de renouveler. Si vous ne faites rien, le bloc se libère et devient disponible pour tous.
        </FAQItem>
        <FAQItem q="Quel type de contenu je peux afficher ?">
          Image statique, logo, texte court, lien vers votre site. Pas de video auto-play, pas d'animation agressive, pas de son. Le contenu doit être en rapport avec votre activité réelle — pas de pages d'escroquerie, pas de contenu pour adultes, pas de fausses promotions.
        </FAQItem>
      </FAQSection>

      <FAQSection title="Offres de rachat">
        <FAQItem q="C'est quoi le système d'offre de rachat ?">
          Si un bloc qui vous intéresse est occupé, vous pouvez faire une offre financière à l'occupant actuel. Si il accepte, le bloc vous est transféré et il récupère une compensation sur sa période restante + une prime sur votre offre. Si il refuse (ou ne répond pas dans 72h), rien ne se passe côté paiement.
        </FAQItem>
        <FAQItem q="Comment est calculée la compensation de l'occupant ?">
          L'occupant reçoit <Highlight>70% du montant résiduel de sa réservation</Highlight> (jours restants × prix/jour) + <Highlight>30% de votre offre de rachat</Highlight>. ADS-SQUARE perçoit 20% de l'offre comme commission. Exemple : occupant avec 10j restants à €10/j → valeur résiduelle €100. Vous offrez €200. Il reçoit €70 (résiduel) + €60 (prime) = €130. Vous payez €200. ADS-SQUARE perçoit €40.
        </FAQItem>
        <FAQItem q="L'occupant est obligé d'accepter ?">
          Non. C'est totalement facultatif pour lui. Il peut refuser sans aucune justification. C'est son bloc tant que sa réservation est active.
        </FAQItem>
        <FAQItem q="Que se passe-t-il si l'occupant ne répond pas ?">
          L'offre expire automatiquement après 72 heures. Aucun paiement n'est effectué. Vous recevez un email de notification.
        </FAQItem>
      </FAQSection>

      <FAQSection title="Stats et analytics">
        <FAQItem q="Est-ce que je peux voir combien de personnes voient mon bloc ?">
          Oui. Votre dashboard annonceur affiche les impressions (vues de la grille avec votre bloc visible) et les clics sur votre bloc. Ces stats sont disponibles en temps réel dans votre espace.
        </FAQItem>
        <FAQItem q="Comment les clics sont-ils comptés ?">
          Un clic = un visiteur qui clique sur votre bloc et est redirigé vers votre URL. On ne compte pas les clics multiples d'un même utilisateur dans la même session (anti-click-fraud basique).
        </FAQItem>
        <FAQItem q="Les stats sont-elles partagées avec d'autres annonceurs ?">
          Non. Vos stats sont privées et accessibles uniquement via votre compte. Personne d'autre ne peut voir le détail de vos performances.
        </FAQItem>
      </FAQSection>

      <FAQSection title="Paiement et remboursements">
        <FAQItem q="Quels modes de paiement sont acceptés ?">
          Carte bancaire (Visa, Mastercard, American Express) via Stripe. Apple Pay et Google Pay disponibles selon votre navigateur. Virement bancaire disponible pour les réservations supérieures à €500 — contactez-nous.
        </FAQItem>
        <FAQItem q="Est-ce que je peux me faire rembourser ?">
          Pas de remboursement pour les blocs déjà activés (votre contenu est en ligne). Si un bug technique empêche l'affichage pendant plus de 24h consécutives, un crédit pro-rata est appliqué. Pour les commandes non encore activées, remboursement complet sous 5 jours ouvrés.
        </FAQItem>
        <FAQItem q="J'ai une facture à demander pour ma comptabilité ?">
          Une facture est générée automatiquement après chaque paiement confirmé. Elle vous est envoyée par email et disponible dans votre espace annonceur. Pour les demandes spécifiques (TVA intracommunautaire, etc.), contactez contact@ads-square.com.
        </FAQItem>
      </FAQSection>

      <FAQSection title="Technique et support">
        <FAQItem q="La plateforme tourne sur quoi ?">
          Frontend Next.js 15 + React 19, déployé sur Cloudflare Pages (Edge Network mondial). Base de données PostgreSQL via Supabase avec synchronisation temps réel. Paiements via Stripe. Performance optimisée pour les très grandes grilles (1 369 blocs rendus en mémoire).
        </FAQItem>
        <FAQItem q="Comment contacter le support ?">
          Email : <Highlight>contact@ads-square.com</Highlight> — réponse habituelle sous 24-48h. Pour les urgences (contenu illicite, bug critique) : mentionnez [URGENT] dans l'objet. En bêta, on répond généralement plus vite car le volume de demandes est gérable.
        </FAQItem>
        <FAQItem q="La grille ne charge pas chez moi, que faire ?">
          Assurez-vous d'avoir un navigateur récent (Chrome, Firefox, Safari, Edge — version 2023+). La grille utilise des APIs web modernes. Internet Explorer n'est pas supporté (et franchement, c'est l'heure de mettre à jour). Si le problème persiste, contactez-nous avec votre navigateur et OS.
        </FAQItem>
      </FAQSection>
    </PageShell>
  );
}
