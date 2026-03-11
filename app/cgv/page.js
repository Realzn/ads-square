import { PageShell, Section, P, Highlight, Tag } from '../legal-shared';

export const metadata = {
  title: 'Conditions Générales de Vente — ADS-SQUARE',
  description: 'Conditions générales de vente applicables aux réservations de blocs publicitaires sur la plateforme ADS-SQUARE.',
};

export default function CGVPage() {
  return (
    <PageShell
      title="Conditions Générales de Vente"
      subtitle="Applicables à toute réservation de bloc publicitaire sur ADS-SQUARE. Dernière mise à jour : 10 mars 2026."
    >

      <Section title="Préambule">
        <P>
          Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des transactions effectuées sur la plateforme ADS-SQUARE, exploitée par <Highlight>LE91-ARENA SAS</Highlight>, société par actions simplifiée en cours d'immatriculation, dont le siège social est situé à Les Ulis, 91940, Essonne, France (ci-après « ADS-SQUARE » ou « la Plateforme »).
        </P>
        <P>
          Toute réservation d'un bloc publicitaire implique l'acceptation pleine et entière des présentes CGV. L'annonceur reconnaît en avoir pris connaissance avant de procéder au paiement.
        </P>
      </Section>

      <Section title="1. Description du service">
        <P>
          ADS-SQUARE est une grille publicitaire interactive composée de <Highlight>1 296 blocs</Highlight> (36 × 36) disposés sur une sphère de Dyson virtuelle en trois dimensions. Chaque bloc est une unité d'espace publicitaire numérique pouvant afficher un contenu (image, texte, lien, vidéo) défini par l'annonceur.
        </P>
        <P>
          Les blocs sont organisés en six niveaux hiérarchiques (<Highlight>Épicentre, Prestige, Élite, Business, Standard, Viral</Highlight>), chacun correspondant à un tarif journalier et à une position sur la grille.
        </P>
        <P>
          La plateforme propose deux modes de réservation :
        </P>
        <P>
          <Highlight>Réservation ponctuelle</Highlight> <Tag>One-shot</Tag><br />
          Paiement unique pour une durée déterminée (minimum 1 jour). Le bloc est actif pendant la durée achetée puis libéré automatiquement à l'échéance.
        </P>
        <P>
          <Highlight>Abonnement récurrent</Highlight> <Tag>Subscription</Tag><br />
          Paiement automatique journalier ou mensuel via Stripe. L'abonnement se renouvelle automatiquement jusqu'à résiliation par l'annonceur.
        </P>
      </Section>

      <Section title="2. Tarifs et modes de paiement">
        <P>
          Les tarifs en vigueur sont indiqués en euros TTC sur la plateforme au moment de la réservation. ADS-SQUARE se réserve le droit de modifier ses tarifs à tout moment ; les nouveaux tarifs s'appliquent aux nouvelles réservations uniquement.
        </P>
        <P>
          <Highlight>Tarifs journaliers indicatifs :</Highlight><br />
          • Épicentre : 1 000 € / jour<br />
          • Prestige : 100 € / jour<br />
          • Élite : 50 € / jour<br />
          • Business : 10 € / jour<br />
          • Standard : 3 € / jour<br />
          • Viral : 1 € / jour
        </P>
        <P>
          Des remises peuvent être appliquées pour les réservations longue durée (7 jours, 30 jours, 90 jours). Le montant exact est affiché avant confirmation du paiement.
        </P>
        <P>
          Le paiement est effectué exclusivement via <Highlight>Stripe</Highlight>, prestataire de paiement sécurisé. ADS-SQUARE ne collecte ni ne stocke jamais les coordonnées bancaires des annonceurs. Les transactions sont sécurisées par chiffrement TLS et conformes à la norme PCI-DSS.
        </P>
        <P>
          Moyens de paiement acceptés : carte bancaire (Visa, Mastercard, American Express), Apple Pay, Google Pay, selon disponibilité.
        </P>
      </Section>

      <Section title="3. Processus de réservation">
        <P>
          La réservation d'un bloc suit les étapes suivantes :
        </P>
        <P>
          <Highlight>1. Sélection</Highlight> — L'annonceur sélectionne un bloc disponible sur la grille et choisit la durée de réservation.<br />
          <Highlight>2. Configuration</Highlight> — L'annonceur renseigne le contenu à afficher (nom, slogan, URL, visuel).<br />
          <Highlight>3. Paiement</Highlight> — Redirection vers la page de paiement sécurisée Stripe.<br />
          <Highlight>4. Confirmation</Highlight> — Après paiement validé, le bloc est activé immédiatement et l'annonceur reçoit un email de confirmation.
        </P>
        <P>
          La réservation est ferme et définitive dès confirmation du paiement par Stripe. Un email récapitulatif est envoyé à l'adresse fournie lors du paiement.
        </P>
        <P>
          En cas d'échec du paiement, aucune réservation n'est créée et le bloc reste disponible.
        </P>
      </Section>

      <Section title="4. Durée et expiration">
        <P>
          <Highlight>Réservation ponctuelle :</Highlight> le bloc est actif du moment du paiement jusqu'à la date d'expiration calculée selon la durée achetée. À l'échéance, le bloc est automatiquement libéré et redevient disponible pour d'autres annonceurs. Aucun renouvellement automatique n'est effectué.
        </P>
        <P>
          <Highlight>Abonnement récurrent :</Highlight> le bloc reste actif tant que les paiements périodiques sont honorés. En cas d'échec de prélèvement, ADS-SQUARE procède à une ou plusieurs tentatives de débit. Si le paiement reste en échec après la période de grâce, le bloc peut être suspendu puis libéré selon les conditions décrites à l'article 8.
        </P>
        <P>
          L'annonceur reçoit des notifications d'expiration imminente par email (7 jours, 3 jours, 1 jour avant) pour lui permettre de renouveler ou d'exporter son contenu.
        </P>
      </Section>

      <Section title="5. Contenu publicitaire — Obligations de l'annonceur">
        <P>
          L'annonceur est seul responsable du contenu diffusé dans son bloc. En publiant sur ADS-SQUARE, il garantit que ledit contenu :
        </P>
        <P>
          • est légal au regard du droit français et de la réglementation applicable ;<br />
          • ne contient pas de contenu à caractère pornographique, raciste, haineux, diffamatoire ou contraire aux bonnes mœurs ;<br />
          • ne porte pas atteinte aux droits de tiers (propriété intellectuelle, image, vie privée) ;<br />
          • ne constitue pas une publicité mensongère ou de nature à induire le consommateur en erreur ;<br />
          • respecte les règles applicables à la publicité numérique (ARPP, directives européennes).
        </P>
        <P>
          ADS-SQUARE se réserve le droit de supprimer sans préavis tout contenu contraire aux présentes CGV, sans que cette suppression ouvre droit à remboursement. En cas de récidive, le compte de l'annonceur peut être résilié.
        </P>
        <P>
          L'annonceur accorde à ADS-SQUARE une licence d'affichage non-exclusive, mondiale et gratuite sur son contenu, pour la durée de la réservation et aux seules fins de l'exploitation de la plateforme.
        </P>
      </Section>

      <Section title="6. Système d'offres de rachat">
        <P>
          ADS-SQUARE intègre un mécanisme permettant à un tiers de soumettre une <Highlight>offre de rachat</Highlight> sur un bloc déjà occupé.
        </P>
        <P>
          <Highlight>Fonctionnement :</Highlight><br />
          • Un tiers peut soumettre une offre supérieure au tarif journalier du bloc ;<br />
          • L'occupant actuel est notifié et dispose d'un délai de <Highlight>72 heures</Highlight> pour accepter ou refuser ;<br />
          • En cas d'acceptation, l'occupant cède sa place et reçoit le prorata du montant restant de sa réservation, déduit des frais de transaction ;<br />
          • En cas de refus ou d'absence de réponse dans le délai imparti, l'offre est annulée et le bloc reste à l'occupant actuel.
        </P>
        <P>
          ADS-SQUARE se réserve le droit de modifier les règles du système d'offres de rachat avec notification préalable aux annonceurs actifs.
        </P>
      </Section>

      <Section title="7. Politique de remboursement">
        <P>
          <Highlight>Droit de rétractation :</Highlight> conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contenus numériques dont l'exécution a commencé avec l'accord exprès du consommateur. En acceptant les présentes CGV et en procédant au paiement, l'annonceur reconnaît que la prestation commence immédiatement et renonce expressément à son droit de rétractation.
        </P>
        <P>
          <Highlight>Remboursement exceptionnel :</Highlight> un remboursement proratisé peut être accordé dans les cas suivants :<br />
          • indisponibilité technique prolongée de la plateforme (supérieure à 48 heures consécutives) imputable à ADS-SQUARE ;<br />
          • erreur de facturation avérée ;<br />
          • décision unilatérale d'ADS-SQUARE de mettre fin au service.
        </P>
        <P>
          Les demandes de remboursement doivent être adressées à <Highlight>contact@adsmostfair.com</Highlight> dans un délai de 30 jours suivant le fait générateur.
        </P>
        <P>
          <Highlight>Aucun remboursement</Highlight> ne sera accordé pour : suppression de contenu non conforme aux CGV, résiliation à l'initiative de l'annonceur en dehors des cas ci-dessus, offres de rachat refusées.
        </P>
      </Section>

      <Section title="8. Abonnements récurrents — Résiliation">
        <P>
          L'annonceur peut résilier son abonnement à tout moment depuis son espace dashboard, rubrique « Gérer mon abonnement ». La résiliation prend effet à la fin de la période en cours ; aucun remboursement proratisé n'est effectué pour la période déjà facturée.
        </P>
        <P>
          En cas de suspension pour impayé, l'annonceur dispose d'une période de grâce de <Highlight>72 heures</Highlight> pour régulariser sa situation. Passé ce délai, le bloc est libéré et son contenu supprimé.
        </P>
        <P>
          ADS-SQUARE peut résilier un abonnement sans préavis en cas de violation des présentes CGV, notamment en cas de contenu illicite ou d'utilisation abusive de la plateforme.
        </P>
      </Section>

      <Section title="9. Disponibilité et maintenance">
        <P>
          ADS-SQUARE s'engage à maintenir la plateforme accessible 24h/24, 7j/7, sous réserve des interruptions nécessaires à la maintenance ou d'événements indépendants de sa volonté (force majeure, pannes d'hébergeur, attaques informatiques).
        </P>
        <P>
          En cas d'indisponibilité non planifiée supérieure à 48 heures consécutives, ADS-SQUARE prolongera automatiquement les réservations actives d'une durée équivalente.
        </P>
        <P>
          ADS-SQUARE ne garantit pas de résultats spécifiques en termes d'impressions, de clics ou de conversions. Les statistiques fournies sont indicatives et dépendent du trafic organique de la plateforme.
        </P>
      </Section>

      <Section title="10. Responsabilité">
        <P>
          ADS-SQUARE est un hébergeur de contenus au sens de la loi n°2004-575 du 21 juin 2004 (LCEN). Sa responsabilité ne peut être engagée du fait des contenus publiés par les annonceurs, dès lors qu'elle n'en a pas eu connaissance ou qu'elle a agi promptement pour les retirer après notification.
        </P>
        <P>
          En tout état de cause, la responsabilité d'ADS-SQUARE ne saurait excéder le montant des sommes effectivement versées par l'annonceur au cours des 3 derniers mois précédant le fait générateur.
        </P>
      </Section>

      <Section title="11. Protection des données personnelles">
        <P>
          Le traitement des données personnelles collectées lors de la réservation est détaillé dans notre <Highlight>Politique de confidentialité</Highlight>, accessible à l'adresse adsmostfair.com/privacy. Les données strictement nécessaires à l'exécution de la commande sont conservées conformément aux obligations légales en vigueur.
        </P>
      </Section>

      <Section title="12. Propriété intellectuelle">
        <P>
          La marque ADS-SQUARE, le nom DYSON COSMOS, l'interface et l'ensemble des éléments constitutifs de la plateforme sont la propriété exclusive de LE91-ARENA SAS. Toute reproduction sans autorisation préalable écrite est interdite.
        </P>
        <P>
          Les contenus déposés par les annonceurs demeurent leur propriété. ADS-SQUARE ne revendique aucun droit de propriété sur lesdits contenus au-delà de la licence d'affichage décrite à l'article 5.
        </P>
      </Section>

      <Section title="13. Modification des CGV">
        <P>
          ADS-SQUARE se réserve le droit de modifier les présentes CGV à tout moment. Les annonceurs disposant d'une réservation active seront informés par email de toute modification substantielle, avec un préavis de <Highlight>15 jours</Highlight>. L'utilisation continue de la plateforme après l'entrée en vigueur des nouvelles CGV vaut acceptation.
        </P>
      </Section>

      <Section title="14. Droit applicable et litiges">
        <P>
          Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours. À défaut, tout litige sera soumis à la compétence exclusive des juridictions du ressort de la Cour d'appel de Paris.
        </P>
        <P>
          <Highlight>Médiation :</Highlight> les consommateurs peuvent recourir gratuitement à la médiation (articles L.611-1 et suivants du Code de la consommation). Médiateur compétent : CM2C — 14 rue Saint Jean 75017 Paris — cm2c.net.
        </P>
        <P>
          <Highlight>Règlement en ligne des litiges (UE) :</Highlight> plateforme accessible à ec.europa.eu/consumers/odr.
        </P>
      </Section>

      <Section title="15. Contact">
        <P>
          Pour toute question relative aux présentes CGV ou à une transaction :<br />
          <Highlight>Email :</Highlight> contact@adsmostfair.com<br />
          <Highlight>Adresse :</Highlight> LE91-ARENA SAS, Les Ulis, 91940, Essonne, France
        </P>
      </Section>

    </PageShell>
  );
}
