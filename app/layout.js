// app/layout.js — Server Component
import './globals.css';
import SkipLink from './SkipLink';
import FontLoader from './Fontloader';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adsmostfair.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ADSMostFair — La grille publicitaire ouverte à tous',
    template: '%s | ADSMostFair',
  },
  description:
    'Réservez un bloc publicitaire sur la grille ADSMostFair dès 1€/jour. ' +
    'Plateforme en bêta publique — réservations bientôt disponibles.',
  keywords: ['publicité', 'grille publicitaire', 'blocs', 'advertising', 'ADSMostFair'],
  openGraph: {
    type:     'website',
    locale:   'fr_FR',
    url:      SITE_URL,
    siteName: 'ADSMostFair',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <noscript>
          <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" />
        </noscript>
      </head>
      <body>
        <FontLoader />
        <SkipLink />
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}