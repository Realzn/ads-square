-- ============================================================
-- ADS-SQUARE — Migration 012 : Expiration à la seconde près
-- ============================================================
-- Ajoute starts_at / expires_at en TIMESTAMPTZ
-- Les colonnes DATE (start_date, end_date) restent pour compatibilité
-- mais les vues utilisent désormais expires_at pour le filtrage.
-- ============================================================

-- 1. Nouvelles colonnes TIMESTAMPTZ sur bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS starts_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

-- 2. Backfill — convertir les bookings existants
--    (on reconstruit à partir des colonnes DATE existantes)
UPDATE bookings
SET
  starts_at  = start_date::timestamptz,
  expires_at = (end_date + INTERVAL '1 day')::timestamptz  -- fin de journée J
WHERE starts_at IS NULL;

-- 3. Recréer active_slots — filtre sur expires_at si disponible, sinon end_date
DROP VIEW IF EXISTS active_slots CASCADE;
CREATE VIEW active_slots AS
SELECT
  b.id            AS booking_id,
  b.slot_x        AS x,
  b.slot_y        AS y,
  b.tier,
  b.status,
  b.start_date,
  b.end_date,
  b.starts_at,
  b.expires_at,
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
  true AS is_occupied,
  -- Secondes restantes (pour affichage countdown côté client)
  GREATEST(0, EXTRACT(EPOCH FROM (
    COALESCE(b.expires_at, (b.end_date + INTERVAL '1 day')::timestamptz) - now()
  )))::bigint AS seconds_remaining
FROM bookings b
WHERE
  b.status = 'active'
  AND COALESCE(b.expires_at, (b.end_date + INTERVAL '1 day')::timestamptz) > now();

-- 4. Mettre à jour la fonction d'expiration pour utiliser expires_at
CREATE OR REPLACE FUNCTION expire_old_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND COALESCE(expires_at, (end_date + INTERVAL '1 day')::timestamptz) <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS jsonb AS $$
DECLARE
  bookings_expired INT;
  offers_expired   INT;
BEGIN
  UPDATE bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND COALESCE(expires_at, (end_date + INTERVAL '1 day')::timestamptz) <= now();
  GET DIAGNOSTICS bookings_expired = ROW_COUNT;

  UPDATE slot_offers
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
  GET DIAGNOSTICS offers_expired = ROW_COUNT;

  RETURN jsonb_build_object(
    'ran_at',           now(),
    'bookings_expired', bookings_expired,
    'offers_expired',   offers_expired
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Index pour performance
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);

-- ============================================================
-- ✅ MIGRATION 012 TERMINÉE
-- ============================================================
