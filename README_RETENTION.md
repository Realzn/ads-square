# ADS-SQUARE — Nouvelles features : Rétention & Trafic

## 🗂️ Ce qui a été ajouté

### Pages Frontend

| Route | Fichier | Description |
|-------|---------|-------------|
| `/dashboard` | `app/dashboard/page.js` | Dashboard annonceur (stats, tâches, fil, offres) |
| `/slot/[x]-[y]` | `app/slot/[coords]/page.js` | Page SEO publique par slot |
| `/leaderboard` | `app/leaderboard/page.js` | Classements publics (clics, streaks, revenus) |

### API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/emails` | Emails transactionnels centralisés (Resend) |
| `GET /api/leaderboard` | Classements publics |
| `GET /api/slot` | Données publiques d'un slot |
| `GET/POST /api/tasks` | Tâches quotidiennes (Sphère de Dyson) |
| `POST /api/waitlist` | Inscription waitlist + email de bienvenue |
| `POST /api/cron/daily` | Job CRON journalier |

### Migrations SQL

| Fichier | Description |
|---------|-------------|
| `supabase/030_emails_cron.sql` | Tables `boost_requests`, `email_log`, fonctions cron |

### Lib

| Fichier | Description |
|---------|-------------|
| `lib/email.js` | Helper `sendEmail()` centralisé |
| `lib/stripe-email-hooks.js` | Helpers à intégrer dans votre webhook Stripe |

---

## ⚙️ Configuration requise

### Variables d'environnement à ajouter

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=ADS-SQUARE <noreply@ads-square.com>

# App URL (pour les liens dans les emails)
NEXT_PUBLIC_APP_URL=https://ads-square.com

# Cron security
CRON_SECRET=votre-secret-cron-ici

# Admin email (notifications)
ADMIN_EMAIL=admin@ads-square.com
```

---

## 🚀 Mise en production

### 1. Exécuter la migration SQL

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécuter le fichier : supabase/030_emails_cron.sql
```

### 2. Configurer Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez votre domaine
3. Générez une API key → ajoutez dans les env Cloudflare Pages

### 3. Configurer le CRON Cloudflare

Dans `wrangler.toml`, ajoutez :

```toml
[triggers]
crons = ["0 6 * * *", "0 22 * * *"]
```

Puis créez un handler dans votre worker qui appelle `/api/cron/daily` :

```javascript
// wrangler cron handler
export default {
  async scheduled(event, env, ctx) {
    const job = event.cron === '0 6 * * *' ? 'tasks' : 'suspension';
    await fetch(`${env.APP_URL}/api/cron/daily?job=${job}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.CRON_SECRET}` },
    });
  }
}
```

### 4. Intégrer les emails Stripe

Dans votre webhook Stripe, importer et appeler :

```javascript
import { onBookingActivated, onOfferReceived } from '../../../lib/stripe-email-hooks';

// Après activation d'un booking :
await onBookingActivated(booking, advertiser);

// Après réception d'une offre :
await onOfferReceived(offer, ownerAdvertiser);
```

---

## 📊 Emails transactionnels disponibles

| Type | Déclencheur | Contenu |
|------|-------------|---------|
| `waitlist_welcome` | POST /api/waitlist | Bienvenue + présentation |
| `booking_confirmed` | Webhook Stripe | Confirmation + infos slot |
| `daily_stats` | CRON 8h | Clics, impressions, CTR |
| `streak_milestone` | POST /api/tasks | Félicitation (7, 14, 30, 60, 100j) |
| `offer_received` | Nouvelle offre | Détails de l'offre + CTA |
| `suspension_warning` | CRON 22h | Alerte suspension imminente |

---

## 🔗 Navigation à ajouter

Dans votre layout/navbar principal, ajoutez les liens :

```jsx
<a href="/dashboard">Mon Dashboard</a>
<a href="/leaderboard">Classement</a>
// Slot pages générées dynamiquement via /slot/[x]-[y]
```

---

## 📈 Impact attendu

| Métrique | Avant | Après (estimation 30j) |
|----------|-------|------------------------|
| Taux de retour J+1 | ~5% | ~25% (dashboard + tâches) |
| Sessions/utilisateur | 1.2 | 4-6 (tâches quotidiennes) |
| Trafic organique | 0 | +200 pages indexées |
| Conversions waitlist→acheteur | ~2% | ~15% (séquence email) |
