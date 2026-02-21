import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),

  // ── Titre & description ──────────────────────────────────────
  title: {
    default:  'ADS-SQUARE — Publiez votre contenu dès 1€/jour',
    template: '%s | ADS-SQUARE',
  },
  description: 'La plateforme pub accessible à tous : créateurs, auto-entrepreneurs, marques. Réservez un bloc sur la grille, diffusez votre contenu. Dès 1€/jour, sans agence.',
  keywords: ['publicité en ligne', 'pub pas chère', 'créateur contenu', 'auto-entrepreneur', 'promotion site web', 'bloc publicitaire', 'ads-square'],

  // ── Open Graph (Facebook, LinkedIn, WhatsApp, Discord…) ──────
  openGraph: {
    title:       'ADS-SQUARE — Publiez votre contenu dès 1€/jour',
    description: 'Créateurs, freelances, marques — réservez votre bloc en 2 minutes. 1 369 espaces disponibles sur la grille publicitaire ouverte à tous.',
    url:         SITE_URL,
    siteName:    'ADS-SQUARE',
    locale:      'fr_FR',
    type:        'website',
    images: [
      {
        url:    '/og.png',
        width:  1200,
        height: 630,
        alt:    'ADS-SQUARE — La grille publicitaire ouverte à tous, dès 1€/jour',
      },
    ],
  },

  // ── Twitter / X ──────────────────────────────────────────────
  twitter: {
    card:        'summary_large_image',
    site:        '@adssquare',
    creator:     '@adssquare',
    title:       'ADS-SQUARE — Pub pour tous dès 1€/jour',
    description: '1 369 blocs publicitaires. Réservez le vôtre en 2 minutes. Sans agence, sans budget minimum.',
    images:      ['/og.png'],
  },

  // ── Canonical & robots ───────────────────────────────────────
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index:            true,
    follow:           true,
    googleBot: {
      index:          true,
      follow:         true,
      'max-image-preview': 'large',
      'max-snippet':  -1,
    },
  },

  // ── App / PWA minimal ────────────────────────────────────────
  applicationName: 'ADS-SQUARE',
  authors:         [{ name: 'ADS-SQUARE' }],
  category:        'advertising',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* Favicon SVG inline */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23020609'/><rect x='4' y='4' width='11' height='11' rx='2' fill='%2300d9f5' opacity='.9'/><rect x='17' y='4' width='11' height='11' rx='2' fill='%239d7dff' opacity='.7'/><rect x='4' y='17' width='11' height='11' rx='2' fill='%239d7dff' opacity='.7'/><rect x='17' y='17' width='11' height='11' rx='2' fill='%2300d9f5' opacity='.5'/></svg>" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap" />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
