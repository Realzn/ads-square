-- ============================================================
-- ADS-SQUARE — Migration 010 : Admin System
-- ============================================================

-- 1. Colonne is_admin sur advertisers
-- ============================================================
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 2. Table tier_config — gérer les tiers depuis la DB (sans redeploy)
-- ============================================================
CREATE TABLE IF NOT EXISTS tier_config (
  tier        TEXT PRIMARY KEY,
  available   BOOLEAN NOT NULL DEFAULT false,
  label       TEXT,
  price_cents INT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT  -- email de l'admin qui a modifié
);

-- Seed initial depuis la config du lancement
INSERT INTO tier_config (tier, available, label, price_cents) VALUES
  ('thousand',   true,  'VIRAL',       100),
  ('hundred',    false, 'BUSINESS',    1000),
  ('ten',        false, 'PRESTIGE',    10000),
  ('corner_ten', false, 'CORNER',      10000),
  ('one',        false, 'ÉPICENTRE',   100000)
ON CONFLICT (tier) DO NOTHING;

-- 3. Table admin_actions — audit log de toutes les actions admin
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,   -- 'cancel_booking', 'suspend_user', 'open_tier', etc.
  target_type TEXT,            -- 'booking', 'user', 'tier', 'offer'
  target_id   TEXT,            -- UUID ou identifiant de la cible
  details     JSONB,           -- payload de l'action
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_email ON admin_actions(admin_email);
CREATE INDEX idx_admin_actions_date  ON admin_actions(created_at DESC);

-- 4. Vue admin_bookings_full — tout ce qu'il faut sur un booking
-- ============================================================
CREATE OR REPLACE VIEW admin_bookings_full AS
SELECT
  b.id,
  b.slot_x,
  b.slot_y,
  b.status,
  b.start_date,
  b.end_date,
  b.amount_cents,
  b.display_name,
  b.slogan,
  b.content_type,
  b.badge,
  b.primary_color,
  b.is_boosted,
  b.stripe_session_id,
  b.stripe_payment_id,
  b.created_at,
  b.updated_at,
  -- Tier calculé
  s.tier,
  -- Advertiser info
  a.id            AS advertiser_id,
  a.email         AS advertiser_email,
  a.display_name  AS advertiser_name,
  a.profile_type,
  a.is_suspended,
  -- Stats clics
  COALESCE(bs.clicks, 0)          AS clicks_total,
  COALESCE(bs.impressions, 0)     AS impressions_total,
  COALESCE(bs.ctr_pct, 0)         AS ctr_pct,
  COALESCE(bs.clicks_7d, 0)       AS clicks_7d,
  COALESCE(bs.impressions_7d, 0)  AS impressions_7d,
  -- Offres actives
  COALESCE(of.offer_count, 0)     AS pending_offers,
  COALESCE(of.max_offer_cents, 0) AS max_offer_cents,
  -- Jours restants
  (b.end_date - CURRENT_DATE)     AS days_remaining
FROM bookings b
LEFT JOIN slots s      ON s.x = b.slot_x AND s.y = b.slot_y
LEFT JOIN advertisers a ON a.id = b.advertiser_id
LEFT JOIN booking_stats bs ON bs.booking_id = b.id
LEFT JOIN (
  SELECT target_booking_id,
         COUNT(*) AS offer_count,
         MAX(offer_amount_cents) AS max_offer_cents
  FROM slot_offers
  WHERE status = 'pending' AND expires_at > now()
  GROUP BY target_booking_id
) of ON of.target_booking_id = b.id;

-- 5. Vue admin_users_full
-- ============================================================
CREATE OR REPLACE VIEW admin_users_full AS
SELECT
  a.id,
  a.email,
  a.display_name,
  a.profile_type,
  a.is_admin,
  a.is_suspended,
  a.admin_note,
  a.stripe_customer_id,
  a.created_at,
  -- Stats bookings
  COUNT(b.id)                         AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'active')   AS active_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'expired')  AS expired_bookings,
  COALESCE(SUM(b.amount_cents) FILTER (WHERE b.status IN ('active','expired')), 0) AS lifetime_value_cents,
  MAX(b.created_at)                   AS last_booking_at
FROM advertisers a
LEFT JOIN bookings b ON b.advertiser_id = a.id
GROUP BY a.id, a.email, a.display_name, a.profile_type,
         a.is_admin, a.is_suspended, a.admin_note,
         a.stripe_customer_id, a.created_at;

-- 6. Vue admin_revenue — revenus par tier et par mois
-- ============================================================
CREATE OR REPLACE VIEW admin_revenue AS
SELECT
  DATE_TRUNC('month', b.created_at) AS month,
  s.tier,
  COUNT(*)                           AS booking_count,
  SUM(b.amount_cents)               AS revenue_cents,
  AVG(b.amount_cents)               AS avg_booking_cents
FROM bookings b
LEFT JOIN slots s ON s.x = b.slot_x AND s.y = b.slot_y
WHERE b.status IN ('active', 'expired')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- 7. Vue admin_platform_stats — KPIs globaux
-- ============================================================
CREATE OR REPLACE VIEW admin_platform_stats AS
SELECT
  -- Revenus
  COALESCE(SUM(b.amount_cents) FILTER (WHERE b.status IN ('active','expired')), 0)  AS total_revenue_cents,
  COALESCE(SUM(b.amount_cents) FILTER (WHERE b.status = 'active'), 0)               AS mrr_cents,
  COALESCE(SUM(b.amount_cents) FILTER (
    WHERE b.status IN ('active','expired')
    AND b.created_at >= DATE_TRUNC('month', NOW())
  ), 0)                                                                               AS revenue_this_month_cents,
  -- Bookings
  COUNT(b.id) FILTER (WHERE b.status = 'active')        AS active_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'pending')       AS pending_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'expired')       AS expired_bookings,
  COUNT(b.id)                                            AS total_bookings,
  -- Users
  COUNT(DISTINCT b.advertiser_id)                        AS total_advertisers,
  COUNT(DISTINCT b.advertiser_id) FILTER (
    WHERE b.status = 'active'
  )                                                       AS active_advertisers,
  -- Slots
  COUNT(DISTINCT CONCAT(b.slot_x,'-',b.slot_y)) FILTER (WHERE b.status = 'active') AS occupied_slots,
  -- Clics
  COALESCE(SUM(sc.click_count), 0)                       AS total_clicks,
  COALESCE(SUM(sc.impression_count), 0)                  AS total_impressions,
  -- Offres
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'pending') AS pending_offers
FROM bookings b
LEFT JOIN advertisers a ON a.id = b.advertiser_id
LEFT JOIN (
  SELECT booking_id,
    COUNT(*) FILTER (WHERE event_type = 'click') AS click_count,
    COUNT(*) FILTER (WHERE event_type = 'impression') AS impression_count
  FROM slot_clicks GROUP BY booking_id
) sc ON sc.booking_id = b.id
LEFT JOIN slot_offers so ON so.target_booking_id = b.id;

-- 8. RLS sur les nouvelles tables
-- ============================================================
ALTER TABLE tier_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- tier_config : lecture publique (le frontend peut lire les tiers dispo)
CREATE POLICY "tier_config readable by all" ON tier_config FOR SELECT USING (true);
CREATE POLICY "tier_config writable by service role" ON tier_config FOR ALL USING (false);

-- admin_actions : service_role only
CREATE POLICY "admin_actions service role only" ON admin_actions FOR ALL USING (false);

-- ============================================================
-- ✅ MIGRATION 010 TERMINÉE
--
-- Nouvelles tables :
--   • tier_config     — disponibilité des tiers gérée depuis la DB
--   • admin_actions   — audit log complet
--
-- Nouvelles vues :
--   • admin_bookings_full   — tout sur chaque booking
--   • admin_users_full      — tout sur chaque user + LTV
--   • admin_revenue         — CA par tier/mois
--   • admin_platform_stats  — KPIs globaux
--
-- Ajouter ADMIN_SECRET dans .env pour sécuriser le dashboard admin
-- ============================================================
