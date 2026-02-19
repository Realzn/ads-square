import { PageShell, Section, P, Highlight, Tag } from '../legal-shared';

export const metadata = {
  title: 'Mentions légales — ADS-SQUARE',
  description: 'Informations légales relatives à la plateforme ADS-SQUARE.',
};

export default function LegalPage() {
  return (
    <PageShell
      title="Mentions légales"
      subtitle={`Conformément aux articles 6-III et 19 de la Loi n°2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN). Mis à jour le 19 février 2026.`}
    >
      <Section title="Éditeur du site">
        <P><Highlight>Raison sociale :</Highlight> LE91-ARENA SAS</P>
        <P><Highlight>Forme juridique :</Highlight> Société par Actions Simplifiée (SAS) en cours d'immatriculation</P>
        <P><Highlight>Siège social :</Highlight> Les Ulis, 91940, Essonne, France</P>
        <P><Highlight>Email de contact :</Highlight> contact@ads-square.com</P>
        <P><Highlight>Directeur de la publication :</Highlight> Tamsir Diallo</P>
        <P>
          Le site ADS-SQUARE est actuellement en phase bêta. La société est en cours de finalisation de son immatriculation au RCS. Les présentes mentions légales seront mises à jour dès obtention du numéro SIRET.
        </P>
      </Section>

      <Section title="Hébergement">
        <P><Highlight>Hébergeur :</Highlight> Cloudflare, Inc.</P>
        <P><Highlight>Adresse :</Highlight> 101 Townsend St, San Francisco, CA 94107, États-Unis</P>
        <P><Highlight>Site web :</Highlight> cloudflare.com</P>
        <P>
          Les données sont hébergées via Supabase (Supabase Inc., San Francisco, CA) pour la base de données, et Cloudflare Pages pour les fichiers statiques. Les serveurs utilisés sont conformes au RGPD via des clauses contractuelles types (CCT) approuvées par la Commission européenne.
        </P>
      </Section>

      <Section title="Propriété intellectuelle">
        <P>
          L'ensemble des éléments constituant le site ADS-SQUARE (textes, graphismes, logiciels, photographies, images, sons, plans, noms, logo, marques, créations et œuvres protégées) sont la propriété exclusive de LE91-ARENA SAS ou font l'objet d'une autorisation d'utilisation.
        </P>
        <P>
          Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de LE91-ARENA SAS.
        </P>
        <P>
          Les contenus publiés par les annonceurs dans leurs blocs restent la propriété de leurs auteurs. En publiant sur ADS-SQUARE, les annonceurs accordent une licence d'affichage non-exclusive à la plateforme pour la durée de leur réservation.
        </P>
      </Section>

      <Section title="Responsabilité">
        <P>
          Les informations et/ou documents figurant sur ce site et/ou accessibles par ce site proviennent de sources considérées comme étant fiables. Toutefois, ces informations et/ou documents sont susceptibles de contenir des inexactitudes techniques et des erreurs typographiques.
        </P>
        <P>
          ADS-SQUARE se réserve le droit de corriger le contenu de son site à tout moment et sans préavis, mais ne saurait être tenu responsable de l'utilisation qui en est faite par les internautes et des conséquences pouvant en découler.
        </P>
        <P>
          ADS-SQUARE n'est pas responsable des contenus diffusés par les annonceurs dans leurs blocs publicitaires. Tout contenu illicite, trompeur ou contraire aux bonnes mœurs pourra être supprimé sans préavis et sans remboursement.
        </P>
      </Section>

      <Section title="Liens hypertextes">
        <P>
          Ce site contient des liens vers d'autres sites. Les sites liés ne sont pas sous le contrôle d'ADS-SQUARE. Nous déclinons toute responsabilité quant à leur contenu. Si vous constatez qu'un lien est problématique, contactez-nous à contact@ads-square.com.
        </P>
      </Section>

      <Section title="Droit applicable">
        <P>
          Les présentes mentions légales sont soumises au droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
        </P>
      </Section>
    </PageShell>
  );
}
