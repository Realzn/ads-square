# ADS-SQUARE

La grille publicitaire ouverte à tous. Réservez un bloc dès 1€/jour.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Cloudflare Pages** (déploiement via OpenNext)
- **Supabase** (base de données + auth)
- **Stripe** (paiements)
- **Tailwind CSS**

---

## Setup

```bash
# Installer les dépendances
npm install --legacy-peer-deps

# Configurer les variables d'environnement
cp .env.example .env.local
# → Remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.

# Développement
npm run dev

# Build & déploiement Cloudflare Pages
npm run cf:deploy
```

---

## Optimisations Lighthouse appliquées

### Performance mobile (73 → ~90+)

| Correctif | Fichier | Impact |
|-----------|---------|--------|
| Polices non-bloquantes (media="print" trick) | `app/layout.js` | FCP/LCP −2 120ms |
| preconnect cdn.fontshare.com ajouté | `app/layout.js` | LCP −80ms |
| Fallback fonts avec métriques ajustées | `app/globals.css` | CLS −0.210 |
| Animations composées sur boutons nav | `app/globals.css` | CLS −0.015 |
| Browserslist restreint (polyfills supprimés) | `package.json` | JS −11 KiB |

### Sécurité (Bonnes pratiques 96 → 100)

| Correctif | Fichier |
|-----------|---------|
| CSP, HSTS, COOP, X-Frame-Options | `public/_headers` |
| Supabase Realtime lazy (erreurs WebSocket supprimées) | `lib/supabase.js` |

### Accessibilité (93 → ~97)

| Correctif | Fichier |
|-----------|---------|
| Landmark `<main>` ajouté | `app/layout.js` |
| Skip-link clavier | `app/layout.js` |

---

## Prochaine optimisation recommandée : auto-héberger les polices

Pour atteindre **CLS = 0 garanti** et supprimer toutes les dépendances CDN polices :

```bash
bash scripts/download-fonts.sh
```

Puis dans `app/globals.css`, décommenter la section **OPTION B** et supprimer les `<link>` polices dans `app/layout.js`.

---

## Analyser le bundle JavaScript

```bash
npm run analyze
```

Ouvre un rapport visuel des chunks. Priorité : `chunks/111-*.js` (50 KiB, 37 KiB inutilisés).

**Solution recommandée :** passer les composants non visibles au chargement en `dynamic import` :

```js
import dynamic from 'next/dynamic';
const FocusModal = dynamic(() => import('./FocusModal'));
```
