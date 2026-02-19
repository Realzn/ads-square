import { PageShell, Section, P, Highlight, Tag } from '../legal-shared';

export const metadata = {
  title: 'Politique de confidentialité — ADS-SQUARE',
  description: 'Comment ADS-SQUARE collecte, utilise et protège vos données personnelles. Conforme RGPD.',
};

export default function PrivacyPage() {
  return (
    <PageShell
      title="Politique de confidentialité"
      subtitle="On collecte le minimum. On ne vend rien à personne. Voici exactement ce qu'on fait avec vos données. Conforme RGPD · Dernière mise à jour : 19 février 2026."
    >
      <Section title="Le résumé (version honnête)">
        <P>
          On collecte votre email pour vous envoyer la confirmation de réservation et les rappels d'expiration. C'est à peu près tout. Pas de tracking publicitaire tiers, pas de revente de données, pas de profiling.
        </P>
        <P>
          Les données de paiement sont gérées entièrement par Stripe — on ne voit jamais vos coordonnées bancaires. Les statistiques de clics sur vos blocs vous appartiennent et ne sont partagées avec personne.
        </P>
      </Section>

      <Section title="1. Responsable du traitement">
        <P>
          <Highlight>LE91-ARENA SAS</Highlight> — Les Ulis, 91940, France<br/>
          Contact DPO : <Highlight>privacy@ads-square.com</Highlight>
        </P>
      </Section>

      <Section title="2. Données collectées et pourquoi">
        <P>
          <Highlight>Email</Highlight> <Tag>Obligatoire</Tag><br/>
          Base légale : exécution du contrat. Utilisé pour : confirmation de paiement, rappels d'expiration, notifications d'offre de rachat. Conservé 3 ans après la dernière réservation.
        </P>
        <P>
          <Highlight>Données de contenu publicitaire</Highlight> <Tag>Obligatoire</Tag><br/>
          Images, textes, URL que vous mettez dans votre bloc. Stockés chez Supabase (UE). Supprimés 30 jours après l'expiration de votre réservation.
        </P>
        <P>
          <Highlight>Statistiques d'impression et de clics</Highlight> <Tag>Anonymisé</Tag><br/>
          On compte les vues et clics sur les blocs sans identifier les visiteurs. Aucun cookie de tracking. Conservé 12 mois.
        </P>
        <P>
          <Highlight>Logs techniques</Highlight> <Tag>Automatique</Tag><br/>
          IP (partiellement masquée), navigateur, pages visitées — via Cloudflare. Base légale : intérêt légitime (sécurité, lutte contre les abus). Conservé 90 jours.
        </P>
        <P>
          <Highlight>Données de paiement</Highlight> <Tag>Stripe uniquement</Tag><br/>
          On ne stocke jamais de numéro de carte. Stripe est responsable de ce traitement. Consultez leur politique : stripe.com/fr/privacy.
        </P>
      </Section>

      <Section title="3. Ce qu'on ne fait pas">
        <P>
          • On ne vend pas vos données à des tiers, jamais.<br/>
          • On n'utilise pas de cookies de tracking publicitaire (Google Ads, Facebook Pixel, etc.).<br/>
          • On ne fait pas de profiling ou de décision automatisée.<br/>
          • On ne transfère pas vos données hors UE sans garanties adéquates.
        </P>
      </Section>

      <Section title="4. Cookies">
        <P>
          ADS-SQUARE utilise le minimum de cookies nécessaires au fonctionnement du site :
        </P>
        <P>
          <Highlight>Session :</Highlight> maintien de votre session (durée : session du navigateur).<br/>
          <Highlight>Préférences :</Highlight> mémorisation de certains choix d'interface (durée : 1 an).<br/>
          <Highlight>Sécurité Cloudflare :</Highlight> protection anti-DDoS et anti-bot (durée : session).
        </P>
        <P>
          Aucun cookie publicitaire ou analytique tiers. Vous pouvez bloquer les cookies dans votre navigateur sans impact sur les fonctionnalités essentielles.
        </P>
      </Section>

      <Section title="5. Vos droits (et comment les exercer)">
        <P>
          Conformément au RGPD (Règlement UE 2016/679), vous disposez des droits suivants :
        </P>
        <P>
          <Highlight>Accès</Highlight> — Obtenir une copie de vos données.<br/>
          <Highlight>Rectification</Highlight> — Corriger des données inexactes.<br/>
          <Highlight>Effacement</Highlight> — Demander la suppression de vos données ("droit à l'oubli").<br/>
          <Highlight>Portabilité</Highlight> — Recevoir vos données dans un format structuré.<br/>
          <Highlight>Opposition</Highlight> — Vous opposer à certains traitements.<br/>
          <Highlight>Limitation</Highlight> — Limiter le traitement dans certains cas.
        </P>
        <P>
          Pour exercer vos droits : envoyez un email à <Highlight>privacy@ads-square.com</Highlight> avec une pièce d'identité. Réponse sous 30 jours maximum.
        </P>
        <P>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la <Highlight>CNIL</Highlight> : cnil.fr · 01 53 73 22 22.
        </P>
      </Section>

      <Section title="6. Sécurité">
        <P>
          Vos données sont protégées par : chiffrement en transit (TLS 1.3), accès restreint par rôles (Row Level Security Supabase), authentification à deux facteurs sur les accès admin, sauvegardes quotidiennes chiffrées.
        </P>
        <P>
          En cas de violation de données susceptible d'affecter vos droits, vous serez notifié dans les 72 heures conformément à l'article 34 du RGPD.
        </P>
      </Section>

      <Section title="7. Contact">
        <P>
          Pour toute question sur cette politique : <Highlight>privacy@ads-square.com</Highlight><br/>
          Temps de réponse habituel : 48 heures.
        </P>
      </Section>
    </PageShell>
  );
}
