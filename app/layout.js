// app/layout.js  —  Layout racine Next.js
// Double provider i18n — les deux lisent/écrivent localStorage('ads_lang')
// · LangProvider    → page.js, sphere, BugReportButton (useT retourne une fn)
// · I18nProvider    → admin, dashboard, legal, leaderboard (useT retourne {t,lang,…})

import LangProvider from './LangProvider';
import { I18nProvider } from '../lib/i18n/index';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#01020A' }}>
        {/* LangProvider pour page.js / sphere / composants hérités */}
        <LangProvider>
          {/* I18nProvider pour admin / dashboard / legal / leaderboard / slot */}
          <I18nProvider>
            {children}
          </I18nProvider>
        </LangProvider>
      </body>
    </html>
  );
}
