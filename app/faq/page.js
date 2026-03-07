'use client';
import { useState } from 'react';
import { PageShell, Section, P, Highlight, C, T } from '../legal-shared';

function FAQItem({ q, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '18px 0', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, textAlign: 'left',
      }}>
        <span style={{ color: open ? C.text : C.text, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{q}</span>
        <span style={{
          color: C.gold, fontSize: 20, fontWeight: 300, flexShrink: 0, lineHeight: 1,
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s ease',
          fontFamily: T.mono,
        }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 600 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}>
        <div style={{ padding: '2px 0 20px', color: C.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 36 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FAQGroup({ badge, title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
          borderRadius: 20, background: C.gold + '12', border: `1px solid ${C.gold}25`,
          color: C.gold, fontSize: 9, fontFamily: T.mono, fontWeight: 700,
          letterSpacing: '.12em', marginBottom: 8,
        }}>◈ {badge}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '.02em', fontFamily: T.h }}>{title}</h2>
      </div>
      <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '0 20px' }}>
        {children}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <PageShell
      title="Questions fréquentes"
      subtitle="Tout ce que vous voulez savoir sur Dyson Cosmos. Si votre question n'est pas là, écrivez-nous."
      badge="FAQ"
    >
      <FAQGroup badge="LES BASES" title="C'est quoi Dyson Cosmos ?">
        <FAQItem q="C'est quoi exactement ADS-SQUARE ?">
          Une grille interactive de 1 369 blocs publicitaires organisés du centre vers la périphérie. Plus vous êtes proche du centre, plus vous êtes visible — et plus c'est cher. Pensé pour que tout le monde trouve un espace selon son budget, du créateur solo à la grande marque.
        </FAQItem>
        <FAQItem q="Qui peut acheter un bloc ?">
          Tout le monde. Créateur TikTok, freelance, restaurant local, e-commerce, startup, grande marque — aucun critère de taille ou de budget minimum. Avec <Highlight>1€/jour</Highlight>, vous pouvez être sur ADS-SQUARE.
        </FAQItem>
        <FAQItem q="Comment ça marche concrètement ?">
          Vous choisissez un bloc disponible → sélectionnez une durée (7, 30 ou 90 jours) → payez par carte via Stripe → votre contenu est en ligne sous 15 minutes. Pas d'appel commercial, pas de brief créatif, pas de validation manuelle.
        </FAQItem>
        <FAQItem q="La plateforme est en bêta, ça veut dire quoi ?">
          Nous sommes en phase de lancement. Les prix sont ceux du lancement — ils peuvent évoluer à l'ouverture officielle. Vos réservations bêta sont honorées aux conditions initiales.
        </FAQItem>
      </FAQGroup>

      <FAQGroup badge="BLOCS ET TIERS" title="Comprendre les niveaux">
        <FAQItem q="Quelle est la différence entre les 6 tiers ?">
          <strong style={{ color: C.text }}>ÉPICENTRE</strong> (1 000€/j) — 1 seul bloc, au centre exact. Visibilité maximale.<br /><br />
          <strong style={{ color: C.text }}>PRESTIGE</strong> (100€/j) — Autour du centre. Très haute visibilité.<br /><br />
          <strong style={{ color: C.text }}>ELITE</strong> (50€/j) — Zone premium, excellent rapport visibilité/prix.<br /><br />
          <strong style={{ color: C.text }}>BUSINESS</strong> (10€/j) — Zone intermédiaire, bon équilibre. 576 blocs.<br /><br />
          <strong style={{ color: C.text }}>STANDARD</strong> (3€/j) — Large audience, budget accessible.<br /><br />
          <strong style={{ color: C.text }}>VIRAL</strong> (1€/j) — Périphérie. Pour les budgets serrés ou les tests.
        </FAQItem>
        <FAQItem q="Un bloc peut être loué par plusieurs annonceurs en même temps ?">
          Non. Un bloc = un annonceur à la fois. Si un bloc est occupé, vous pouvez attendre son expiration ou soumettre une offre de rachat.
        </FAQItem>
        <FAQItem q="Ma réservation se renouvelle automatiquement ?">
          Non. Pas de renouvellement automatique. Vous recevez un email 48h avant l'expiration. Si vous ne faites rien, le bloc se libère.
        </FAQItem>
        <FAQItem q="Quel type de contenu je peux afficher ?">
          Image, logo, texte court, lien vers votre site. Pas de vidéo auto-play, pas d'animation agressive, pas de son. Le contenu doit correspondre à votre activité réelle.
        </FAQItem>
      </FAQGroup>

      <FAQGroup badge="OFFRES DE RACHAT" title="Le système de buyout">
        <FAQItem q="C'est quoi une offre de rachat ?">
          Si un bloc qui vous intéresse est occupé, vous pouvez faire une offre financière à son occupant. S'il accepte, le bloc vous est transféré avec une compensation pour lui. S'il refuse ou ne répond pas dans 72h, rien ne se passe.
        </FAQItem>
        <FAQItem q="Comment est calculée la compensation ?">
          L'occupant reçoit <Highlight>70% du montant résiduel</Highlight> (jours restants × prix/jour) + <Highlight>30% de votre offre</Highlight>. ADS-SQUARE perçoit 20% de l'offre comme commission.
        </FAQItem>
        <FAQItem q="L'occupant est obligé d'accepter ?">
          Non. Il peut refuser sans justification. C'est son bloc tant que sa réservation est active.
        </FAQItem>
        <FAQItem q="L'offre expire si pas de réponse ?">
          Oui, automatiquement après 72 heures. Aucun paiement n'est effectué. Vous recevez un email de notification.
        </FAQItem>
      </FAQGroup>

      <FAQGroup badge="ANALYTICS" title="Stats et performances">
        <FAQItem q="Je peux voir combien de personnes voient mon bloc ?">
          Oui. Votre dashboard annonceur affiche les impressions et les clics en temps réel.
        </FAQItem>
        <FAQItem q="Comment les clics sont-ils comptés ?">
          Un clic = un visiteur redirigé vers votre URL. Les clics multiples d'un même utilisateur dans la même session ne sont pas comptés.
        </FAQItem>
        <FAQItem q="Les stats sont partagées avec d'autres annonceurs ?">
          Non. Vos stats sont privées, accessibles uniquement via votre compte.
        </FAQItem>
      </FAQGroup>

      <FAQGroup badge="PAIEMENT" title="Facturation et remboursements">
        <FAQItem q="Quels modes de paiement sont acceptés ?">
          Carte bancaire (Visa, Mastercard, Amex) via Stripe. Apple Pay et Google Pay disponibles selon votre navigateur. Virement disponible pour les réservations supérieures à 500€.
        </FAQItem>
        <FAQItem q="Est-ce que je peux me faire rembourser ?">
          Pas de remboursement pour les blocs déjà activés. En cas de bug technique bloquant l'affichage plus de 24h, un crédit pro-rata est appliqué. Réservations non activées : remboursement complet sous 5 jours ouvrés.
        </FAQItem>
        <FAQItem q="J'ai une facture à demander ?">
          Une facture est générée automatiquement après chaque paiement. Disponible dans votre espace annonceur et envoyée par email.
        </FAQItem>
      </FAQGroup>
    </PageShell>
  );
}
