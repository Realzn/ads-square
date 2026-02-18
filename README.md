# ADS-SQUARE

Plateforme de blocs publicitaires en grille 37×37.

## 🚀 Déploiement sur Cloudflare Pages

### Prérequis
- Node.js 18+
- Compte GitHub
- Compte Cloudflare

### Installation locale
```bash
npm install
npm run dev
```

### Déploiement Cloudflare Pages (via GitHub — recommandé)

1. Push ce repo sur GitHub
2. Sur [Cloudflare Pages](https://pages.cloudflare.com) → "Create a project" → connecter GitHub
3. Sélectionner le repo `ads-square`
4. Configurer le build :
   - **Framework preset** : `Next.js (Static HTML Export)` — ou laisser vide
   - **Build command** : `npx @cloudflare/next-on-pages@1`
   - **Build output directory** : `.vercel/output/static`
5. Dans **Environment variables**, ajouter :
   - `NODE_VERSION` = `18`
6. Cliquer **Save and Deploy** ✅

### Déploiement manuel (CLI)
```bash
npm install
npm run deploy
```

## Stack
- Next.js 14
- React 18
- Tailwind CSS
- Cloudflare Pages
