// app/layout.js — Server Component
import './globals.css';
import SkipLink from './SkipLink';
import FontLoader from './Fontloader';
import LangProvider from './LangProvider';
import BugReportButton from './BugReportButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adsmostfair.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Dyson Cosmos — La grille publicitaire ouverte à tous',
    template: '%s | Dyson Cosmos',
  },
  description:
    'Réservez un bloc publicitaire sur la Sphère Dyson dès 1€/jour. ' +
    'Grille orbitale interactive — visibilité maximale, à votre échelle.',
  keywords: ['publicité', 'grille publicitaire', 'blocs', 'advertising', 'ADS-SQUARE', 'Dyson Cosmos'],
  openGraph: {
    type:     'website',
    locale:   'fr_FR',
    url:      SITE_URL,
    siteName: 'Dyson Cosmos',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon:    '/icon.svg',
    shortcut:'/icon.svg',
    apple:   '/icon.svg',
  },
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
        <noscript>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" />
        </noscript>
      </head>
      <body>
        <FontLoader />
        <SkipLink />
        {/* LangProvider wraps EVERYTHING — toutes les pages héritent du contexte de langue */}
        <LangProvider>
          <main id="main-content">
            {children}
          </main>
          {/* Bouton flottant "Signaler un bug" — visible sur toutes les pages */}
          <BugReportButton />
        </LangProvider>
      </body>
    </html>
  );
}
