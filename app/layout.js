import './globals.css'

export const metadata = {
  title: 'ADS-SQUARE — Publiez votre contenu dès 1€/jour',
  description: 'La plateforme pub accessible à tous : créateurs, auto-entrepreneurs, marques. Réservez un bloc, diffusez votre contenu. Simple, rapide, abordable.',
  keywords: 'publicité en ligne, pub pas chère, créateur contenu, auto-entrepreneur, promotion site web, bloc publicitaire',
  openGraph: {
    title: 'ADS-SQUARE — Publiez votre contenu dès 1€/jour',
    description: 'Créateurs, freelances, marques — réservez votre bloc pub en 2 minutes.',
    url: 'https://ads-square.pages.dev',
    siteName: 'ADS-SQUARE',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADS-SQUARE — Pub pour tous dès 1€/jour',
    description: 'Réservez votre espace publicitaire en 2 minutes. Sans agence, sans budget minimum.',
  },
  robots: { index: true, follow: true },
};

export default function R({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23020609'/><rect x='4' y='4' width='11' height='11' rx='2' fill='%2300d9f5' opacity='.9'/><rect x='17' y='4' width='11' height='11' rx='2' fill='%239d7dff' opacity='.7'/><rect x='4' y='17' width='11' height='11' rx='2' fill='%239d7dff' opacity='.7'/><rect x='17' y='17' width='11' height='11' rx='2' fill='%2300d9f5' opacity='.5'/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap" />
      </head>
      <body style={{ margin: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
