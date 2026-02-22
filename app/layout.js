// app/layout.js
// Layout racine ADS-SQUARE — Optimisé Lighthouse
//
// ✅ CORRECTIFS APPLIQUÉS :
//   [FCP/LCP]  Polices non-bloquantes via media="print" onLoad trick
//   [LCP]      preconnect cdn.fontshare.com (80ms économisés)
//   [CLS]      Fallback fonts dimensionnés dans globals.css
//   [A11y]     Landmark <main> ajouté (était absent)
//   [A11y]     Skip-link "Aller au contenu" pour clavier

import './globals.css';

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
  twitter: {
    card: 'summary_large_image',
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // ⚠️ NE PAS ajouter userScalable: 'no' — bloque le zoom, nuit à l'accessibilité (WCAG 1.4.4)
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/*
         * ── Preconnects ───────────────────────────────────────────────────
         * Établit les connexions TCP/TLS tôt pour les origines critiques.
         *
         * ✅ CORRECTIF : cdn.fontshare.com était MANQUANT.
         *   → Lighthouse indiquait 80ms d'économie LCP possible.
         *   → api.fontshare.com est l'API CSS, cdn.fontshare.com sert les .woff2.
         *   → Les deux preconnects sont nécessaires.
         *
         * ⚠️ Limiter à 4 preconnects max (coûteux sur mobile).
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        {/* ✅ AJOUTÉ : preconnect pour le CDN des fichiers woff2 Fontshare */}
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />

        {/*
         * ── Polices non-bloquantes ────────────────────────────────────────
         * ✅ CORRECTIF : les polices bloquaient le rendu (2 120ms sur mobile).
         *
         * Technique media="print" + onLoad="this.media='all'" :
         *   1. Le navigateur charge les CSS polices en basse priorité (non-bloquant).
         *   2. Une fois chargées, bascule vers media=all → polices activées.
         *   3. <noscript> assure le rendu si JS désactivé.
         *
         * Les métriques de fallback dans globals.css (@font-face Fallback)
         * réduisent le CLS au minimum lors du swap font.
         *
         * Alternative : exécuter `bash scripts/download-fonts.sh` pour
         * auto-héberger les polices avec font-display: optional → CLS = 0.
         */}

        {/* Clash Display (700–900) — titres, logo */}
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

        {/* DM Sans (400–800) — corps, UI */}
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
        {/*
         * ── Skip-link (accessibilité clavier) ────────────────────────────
         * Permet aux utilisateurs clavier de passer directement au contenu.
         * Invisible sauf au focus — requis WCAG 2.4.1.
         */}
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            top: -999,
            left: -999,
            zIndex: 9999,
            padding: '8px 16px',
            background: '#f0b429',
            color: '#080808',
            fontWeight: 700,
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
          }}
          onFocus={(e) => {
            e.target.style.top = '8px';
            e.target.style.left = '8px';
          }}
          onBlur={(e) => {
            e.target.style.top = '-999px';
            e.target.style.left = '-999px';
          }}
        >
          Aller au contenu principal
        </a>

        {/*
         * ── Landmark <main> ───────────────────────────────────────────────
         * ✅ CORRECTIF : était absent → -7pts Lighthouse accessibilité.
         * Requis WCAG 2.4.1 + utilisé par les lecteurs d'écran pour naviguer.
         */}
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
