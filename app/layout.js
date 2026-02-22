// app/layout.js — Server Component (pas de handlers d'événements ici)

import './globals.css';
import SkipLink from './SkipLink';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ADS-SQUARE — La grille publicitaire ouverte à tous',
    template: '%s | ADS-SQUARE',
  },
  description:
    'Réservez un bloc publicitaire sur la grille ADS-SQUARE dès 1€/jour. ' +
    'Plateforme en bêta publique — réservations bientôt disponibles.',
  keywords: ['publicité', 'grille publicitaire', 'blocs', 'advertising', 'ADS-SQUARE'],
  openGraph: {
    type:     'website',
    locale:   'fr_FR',
    url:      SITE_URL,
    siteName: 'ADS-SQUARE',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // ⚠️ NE PAS ajouter userScalable: 'no' — nuit à l'accessibilité (WCAG 1.4.4)
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/*
         * ── Preconnects ───────────────────────────────────────────────────
         * ✅ cdn.fontshare.com AJOUTÉ — manquait (Lighthouse: -80ms LCP)
         * Les 4 origins : api.fontshare.com (CSS) + cdn.fontshare.com (woff2)
         *                 fonts.googleapis.com (CSS) + fonts.gstatic.com (woff2)
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />

        {/*
         * ── Polices non-bloquantes ────────────────────────────────────────
         * ✅ Technique media="print" + onLoad — économie ~2 120ms FCP/LCP mobile
         * Les fallback fonts dans globals.css réduisent le CLS lors du swap.
         */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap"
          media="print"
          // eslint-disable-next-line react/no-unknown-property
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap"
          />
        </noscript>

        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap"
          media="print"
          // eslint-disable-next-line react/no-unknown-property
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap"
          />
        </noscript>
      </head>

      <body>
        {/* SkipLink est un Client Component (onFocus/onBlur) — WCAG 2.4.1 */}
        <SkipLink />

        {/* ✅ Landmark <main> — était absent, -7pts Lighthouse accessibilité */}
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
