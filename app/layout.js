// app/layout.js  —  Layout racine Next.js
// Enveloppe TOUTE l'application avec le Provider i18n.
// La langue est persistée dans localStorage (clé : ads_lang).

import { I18nProvider } from '../lib/i18n';

export const metadata = {
  title: 'AdsMostFair — La grille publicitaire ouverte à tous',
  description: '1 369 blocs publicitaires sur une grille 37×37. Réservez un bloc dès 1€/jour.',
  openGraph: {
    title: 'AdsMostFair',
    description: 'La grille publicitaire ouverte à tous. Réservez dès 1€/jour.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Polices pré-connectées pour la perf */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#01020A' }}>
        {/*
          I18nProvider enveloppe tout : admin, dashboard, pages légales,
          leaderboard, slot, chat, modals — TOUT est traduit.
          La langue est lue/écrite dans localStorage sous la clé "ads_lang".
        */}
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
