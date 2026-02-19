import { PageShell, Section, P, Highlight, Tag } from '../legal-shared';

export const metadata = {
  title: 'Conditions Générales de Vente — ADS-SQUARE',
  description: 'Conditions régissant l\'achat et la location d\'espaces publicitaires sur ADS-SQUARE.',
};

export default function CGVPage() {
  return (
    <PageShell
      title="Conditions Générales de Vente"
      subtitle="Ces CGV régissent toute réservation d'espace publicitaire sur ADS-SQUARE. En finalisant votre paiement, vous les acceptez intégralement. Dernière mise à jour : 19 février 2026."
    >
      <Section title="1. Qui sommes-nous">
        <P>
          ADS-SQUARE est une plateforme de réservation d'espaces publicitaires en ligne exploitée par <Highlight>LE91-ARENA SAS</Highlight> (siège à Les Ulis, 91940). Le service est accessible à l'adresse ads-square.pages.dev et sur tout domaine associé.
        </P>
        <P>
          La plateforme est actuellement en <Tag>BÊTA</Tag> — certaines fonctionnalités peuvent évoluer. Vous serez informé de tout changement impactant vos réservations actives par email.
        </P>
      </Section>

      <Section title="2. Ce qu'on vend (et ce qu'on vend pas)">
        <P>
          ADS-SQUARE commercialise des <Highlight>locations d'espaces publicitaires numériques</Highlight> sur une grille interactive de 1 369 blocs, classés en 5 tiers selon leur visibilité :
        </P>
        <P>
          <Tag color="#f0b429">ÉPICENTRE</Tag> Centre absolu de la grille · €1 000/jour · 1 bloc<br/>
          <Tag color="#ff4d8f">PRESTIGE</Tag> Anneau central · €100/jour · 48 blocs<br/>
          <Tag color="#f0b429">CORNER</Tag> Coins stratégiques · €100/jour · 4 blocs<br/>
          <Tag color="#00d9f5">BUSINESS</Tag> Zone intermédiaire · €10/jour · 576 blocs<br/>
          <Tag color="#00e8a2">VIRAL</Tag> Périphérie · €1/jour · 740 blocs
        </P>
        <P>
          On vend de la <Highlight>visibilité</Highlight>, pas de la performance garantie. Le nombre de vues et clics dépend du trafic naturel de la plateforme et n'est pas contractuellement garanti. Les statistiques affichées sont indicatives.
        </P>
      </Section>

      <Section title="3. Processus de réservation">
        <P>
          <Highlight>Étape 1 :</Highlight> Vous sélectionnez un bloc disponible sur la grille.<br/>
          <Highlight>Étape 2 :</Highlight> Vous choisissez la durée (7, 30 ou 90 jours).<br/>
          <Highlight>Étape 3 :</Highlight> Vous fournissez votre email et procédez au paiement via Stripe.<br/>
          <Highlight>Étape 4 :</Highlight> Après confirmation du paiement, votre contenu est mis en ligne sous 15 minutes.
        </P>
        <P>
          La réservation n'est confirmée qu'après réception effective du paiement. Tout bloc reste disponible à d'autres acheteurs jusqu'à la confirmation.
        </P>
      </Section>

      <Section title="4. Prix et paiement">
        <P>
          Les prix sont affichés en euros TTC. ADS-SQUARE est actuellement en dessous du seuil de franchise de TVA applicable aux micro-entreprises/SAS en phase de démarrage. Cette mention sera mise à jour lors de l'assujettissement à TVA.
        </P>
        <P>
          Le paiement s'effectue via <Highlight>Stripe</Highlight>, qui gère la sécurité des transactions (chiffrement TLS/SSL, conformité PCI-DSS). ADS-SQUARE ne stocke jamais vos données bancaires.
        </P>
        <P>
          Les prix peuvent être modifiés à tout moment pour les nouvelles réservations. Les réservations en cours ne sont pas affectées.
        </P>
      </Section>

      <Section title="5. Durée et renouvellement">
        <P>
          La location prend effet à la date de confirmation du paiement et expire à la fin de la durée choisie. <Highlight>Il n'y a pas de renouvellement automatique.</Highlight>
        </P>
        <P>
          À l'expiration, le bloc redevient disponible. Vous recevez un email de rappel 48h avant l'expiration si vous souhaitez renouveler.
        </P>
      </Section>

      <Section title="6. Système d'offre de rachat">
        <P>
          Si un bloc est déjà occupé, vous pouvez soumettre une <Highlight>offre de rachat</Highlight>. Le processus est le suivant :
        </P>
        <P>
          • Vous proposez un montant supérieur au prix journalier résiduel de l'occupant actuel.<br/>
          • L'occupant reçoit une notification et dispose de <Highlight>72 heures</Highlight> pour accepter ou refuser.<br/>
          • Si accepté : vous payez l'offre, l'occupant perçoit <Highlight>70% du montant restant</Highlight> de sa période non consommée + une prime de 30% sur votre offre. Le bloc vous est transféré.<br/>
          • Si refusé ou expiré : aucun débit. Vous êtes notifié par email.
        </P>
        <P>
          ADS-SQUARE perçoit une commission de <Highlight>20%</Highlight> sur le montant de l'offre de rachat.
        </P>
      </Section>

      <Section title="7. Obligations de l'annonceur">
        <P>Il est <Highlight>strictement interdit</Highlight> de publier :</P>
        <P>
          • Du contenu illicite, frauduleux, ou contraire à l'ordre public.<br/>
          • De la publicité pour des produits/services illégaux en France (armes, drogues, jeux illégaux, etc.).<br/>
          • Du contenu à caractère sexuel explicite ou violent.<br/>
          • De fausses allégations, arnaques ou phishing.<br/>
          • Du contenu diffamatoire ou portant atteinte à des tiers.
        </P>
        <P>
          En cas de violation, ADS-SQUARE se réserve le droit de supprimer le contenu <Highlight>immédiatement et sans remboursement</Highlight>, et de signaler les faits aux autorités compétentes.
        </P>
      </Section>

      <Section title="8. Droit de rétractation">
        <P>
          Conformément à l'article L.221-28 du Code de la consommation, <Highlight>le droit de rétractation de 14 jours ne s'applique pas</Highlight> aux contenus numériques dont l'exécution a commencé avec votre consentement exprès.
        </P>
        <P>
          En validant votre paiement, vous acceptez expressément que votre bloc soit activé immédiatement et renoncez à votre droit de rétractation. Cependant, en cas de bug technique empêchant l'affichage de votre contenu, un remboursement pro-rata sera appliqué.
        </P>
      </Section>

      <Section title="9. Responsabilité limitée">
        <P>
          ADS-SQUARE s'engage à maintenir la plateforme disponible 24h/24, 7j/7, avec un objectif de disponibilité de 99%. En cas d'indisponibilité technique supérieure à 24 heures consécutives, une compensation pro-rata sera appliquée sur votre prochaine facture.
        </P>
        <P>
          Notre responsabilité est limitée au montant de la réservation concernée. Nous ne sommes pas responsables des pertes indirectes (manque à gagner, atteinte à l'image, etc.).
        </P>
      </Section>

      <Section title="10. Litiges">
        <P>
          En cas de litige, contactez-nous d'abord à <Highlight>contact@ads-square.com</Highlight> — on essaie toujours de trouver une solution amiable.
        </P>
        <P>
          Si aucune solution n'est trouvée dans un délai de 30 jours, vous pouvez recourir à la médiation via la plateforme européenne de règlement en ligne des litiges : <Highlight>ec.europa.eu/consumers/odr</Highlight>
        </P>
        <P>
          En dernier recours, le Tribunal de Commerce d'Évry (91) est compétent, conformément au droit français.
        </P>
      </Section>
    </PageShell>
  );
}
