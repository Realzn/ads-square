# ADS-SQUARE v2 — Architecture Guide

## 🏗️ Nouvelle architecture

```
Cloudflare Pages (Next.js frontend)
        ↓ fetch active_slots
Supabase (PostgreSQL + Auth + Realtime)
        ↑ webhook écrit les bookings
Stripe (Checkout + Webhooks)
        ↑ paiement annonceur
Annonceur
```

## 📁 Structure des fichiers

```
├── app/
│   ├── page.js                    ← Page principale (refactorisée)
│   ├── layout.js                  ← Layout (inchangé)
│   ├── not-found.js               ← 404 (inchangé)
│   ├── globals.css                ← CSS global (inchangé)
│   └── api/stripe/
│       ├── checkout/route.js      ← NOUVEAU: crée une session Stripe
│       └── webhook/route.js       ← NOUVEAU: confirme les paiements
├── lib/
│   ├── grid.js                    ← NOUVEAU: logique grille extraite
│   ├── supabase.js                ← REFACTORISÉ: client + realtime
│   └── supabase-server.js         ← NOUVEAU: client service_role
├── supabase/
│   ├── 001_schema.sql             ← Migration principale
│   └── 002_seed_demo.sql          ← Données de test
├── package.json                   ← +stripe dependency
└── .env.example                   ← Template variables
```

## 🚀 Guide de déploiement étape par étape

### Étape 1 : Supabase (5 min)

1. Ouvrir ton projet Supabase → **SQL Editor**
2. Coller et exécuter `supabase/001_schema.sql`
3. Coller et exécuter `supabase/002_seed_demo.sql`
4. Vérifier : `SELECT * FROM active_slots WHERE is_occupied = true;`
5. Aller dans **Database → Replication** → Activer `bookings` pour le Realtime
6. Copier la `service_role key` depuis **Settings → API**

### Étape 2 : Variables d'environnement (2 min)

Dans **Cloudflare Pages → Settings → Environment variables**, ajouter :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (service role) |
| `NEXT_PUBLIC_STRIPE_ENABLED` | `false` (pour l'instant) |
| `NEXT_PUBLIC_SITE_URL` | `https://ads-square.com` |

### Étape 3 : Déployer le code (5 min)

Remplacer les fichiers dans ton repo :
- `lib/grid.js` (nouveau)
- `lib/supabase.js` (remplacer)
- `lib/supabase-server.js` (nouveau)
- `app/page.js` (remplacer)
- `app/api/stripe/checkout/route.js` (nouveau)
- `app/api/stripe/webhook/route.js` (nouveau)
- `package.json` (remplacer)

Push → Cloudflare rebuild automatique.

### Étape 4 : Stripe (quand prêt)

1. Créer un compte sur [stripe.com](https://stripe.com)
2. Compléter le KYC (1-3 jours)
3. Ajouter les variables dans Cloudflare :
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `NEXT_PUBLIC_STRIPE_ENABLED` = `true`
4. Dans Stripe → **Webhooks** → ajouter endpoint :
   - URL : `https://ads-square.com/api/stripe/webhook`
   - Events : `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`

## 🔄 Comment ça marche maintenant

### Mode démo (sans Supabase)
Si les variables Supabase ne sont pas configurées, la grille affiche les données fictives comme avant (rng seed 42). Aucun changement visible pour l'utilisateur.

### Mode live (avec Supabase)
1. Au chargement, le frontend fetch `active_slots` (vue Supabase)
2. La grille affiche les vrais blocs réservés
3. Le Realtime écoute les changements sur `bookings`
4. Quand un paiement est confirmé, le webhook active le booking → le Realtime push le changement → la grille se met à jour pour tous les visiteurs

### Mode paiement (avec Stripe)
1. L'annonceur choisit un bloc → modal de checkout
2. API route crée une session Stripe + un booking `pending`
3. Redirect vers Stripe Checkout
4. Paiement OK → webhook reçoit `checkout.session.completed`
5. Webhook active le booking → Realtime → grille mise à jour

## ⚠️ Notes importantes

- **RLS** : Les bookings ne peuvent être créés/modifiés que via `service_role` (webhook). Le `anon_key` ne peut que lire. C'est voulu pour la sécurité.
- **Expiration** : La fonction `expire_old_bookings()` doit être appelée quotidiennement. Options : pg_cron (plan Pro) ou Edge Function CRON.
- **Next.js 14.2.0** : Vulnérabilité connue. Migrer vers 14.2.10+ quand possible.
- **Cloudflare Pages** : Les API routes Stripe nécessitent le runtime Node.js. Vérifier la compatibilité avec `@cloudflare/next-on-pages`.
