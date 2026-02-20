-- ============================================================
-- ADS-SQUARE — Migration 004 : Stats enrichies + Offres accept/reject
-- ============================================================

-- 1. VUE booking_stats enrichie (aujourd'hui / semaine / mois)
-- ============================================================
DROP VIEW IF EXISTS booking_stats CASCADE;

CREATE OR REPLACE VIEW booking_stats AS
SELECT
  b.id                                          AS booking_id,
  b.slot_x,
  b.slot_y,
  b.display_name,
  b.start_date,
  b.end_date,
  b.status,
  b.advertiser_id,
  -- Total impressions
  COUNT(*) FILTER (WHERE sc.event_type = 'impression')                                        AS impressions,
  -- Total clics
  COUNT(*) FILTER (WHERE sc.event_type = 'click')                                             AS clicks,
  -- CTR global
  CASE
    WHEN COUNT(*) FILTER (WHERE sc.event_type = 'impression') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE sc.event_type = 'click')::numeric
      / COUNT(*) FILTER (WHERE sc.event_type = 'impression')::numeric * 100, 2)
  END                                                                                          AS ctr_pct,
  -- Aujourd'hui
  COUNT(*) FILTER (WHERE sc.event_type = 'click'      AND sc.created_at >= current_date)      AS clicks_today,
  COUNT(*) FILTER (WHERE sc.event_type = 'impression' AND sc.created_at >= current_date)      AS impressions_today,
  -- 7 derniers jours
  COUNT(*) FILTER (WHERE sc.event_type = 'click'      AND sc.created_at > now() - INTERVAL '7 days')  AS clicks_7d,
  COUNT(*) FILTER (WHERE sc.event_type = 'impression' AND sc.created_at > now() - INTERVAL '7 days')  AS impressions_7d,
  -- 30 derniers jours
  COUNT(*) FILTER (WHERE sc.event_type = 'click'      AND sc.created_at > now() - INTERVAL '30 days') AS clicks_30d,
  COUNT(*) FILTER (WHERE sc.event_type = 'impression' AND sc.created_at > now() - INTERVAL '30 days') AS impressions_30d
FROM bookings b
LEFT JOIN slot_clicks sc ON sc.booking_id = b.id
GROUP BY b.id, b.slot_x, b.slot_y, b.display_name, b.start_date, b.end_date, b.status, b.advertiser_id;

-- 2. VUE : offres reçues par booking (pour le dashboard)
-- ============================================================
CREATE OR REPLACE VIEW received_offers AS
SELECT
  so.*,
  b.advertiser_id AS owner_advertiser_id
FROM slot_offers so
JOIN bookings b ON b.id = so.target_booking_id
WHERE so.status = 'pending'
  AND so.expires_at > now();

-- 3. Colonne buyer_name dans slot_offers (si manquante)
-- ============================================================
ALTER TABLE slot_offers ADD COLUMN IF NOT EXISTS buyer_name text;
ALTER TABLE slot_offers ADD COLUMN IF NOT EXISTS message text;

-- ============================================================
-- ✅ MIGRATION 004 TERMINÉE
-- ============================================================

-- 4. Colonnes social dans bookings (si manquantes)
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS social_network text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS music_platform text;

-- 5. Recréer active_slots avec champs sociaux
-- ============================================================
DROP VIEW IF EXISTS active_slots CASCADE;

CREATE VIEW active_slots AS
  SELECT
    b.id AS booking_id,
    b.slot_x AS x,
    b.slot_y AS y,
    b.tier,
    b.status,
    b.start_date,
    b.end_date,
    b.display_name,
    b.slogan,
    b.logo_initials,
    b.primary_color,
    b.background_color,
    b.cta_text,
    b.cta_url,
    b.image_url,
    b.badge,
    b.content_type,
    b.social_network,
    b.music_platform,
    b.advertiser_id,
    true AS is_occupied
  FROM bookings b
  WHERE b.status = 'active'
  AND b.start_date <= current_date
  AND b.end_date >= current_date;

-- 6. Colonne is_boosted dans bookings
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false;

-- Mettre à jour active_slots avec is_boosted
DROP VIEW IF EXISTS active_slots CASCADE;

CREATE VIEW active_slots AS
  SELECT
    b.id AS booking_id,
    b.slot_x AS x,
    b.slot_y AS y,
    b.tier,
    b.status,
    b.start_date,
    b.end_date,
    b.display_name,
    b.slogan,
    b.logo_initials,
    b.primary_color,
    b.background_color,
    b.cta_text,
    b.cta_url,
    b.image_url,
    b.badge,
    b.content_type,
    b.social_network,
    b.music_platform,
    b.is_boosted,
    b.advertiser_id,
    true AS is_occupied
  FROM bookings b
  WHERE b.status = 'active'
  AND b.start_date <= current_date
  AND b.end_date >= current_date;

-- Recréer dashboard_bookings et received_offers
CREATE VIEW dashboard_bookings AS
  SELECT
    b.*,
    a.email,
    a.display_name AS advertiser_name,
    a.stripe_customer_id,
    a.user_id AS auth_user_id
  FROM bookings b
  LEFT JOIN advertisers a ON b.advertiser_id = a.id;

CREATE VIEW received_offers AS
SELECT
  so.*,
  b.advertiser_id AS owner_advertiser_id
FROM slot_offers so
JOIN bookings b ON b.id = so.target_booking_id
WHERE so.status = 'pending'
  AND so.expires_at > now();
