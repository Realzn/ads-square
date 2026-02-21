-- ============================================================
-- 013 — Description libre sur les blocs
-- Champ texte long (~500 chars) pour raconter son histoire,
-- décrire son univers, ou inciter au clic.
-- ============================================================

-- 1. Colonne sur bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Exposer dans la vue active_slots
-- (recréation complète de la vue avec le nouveau champ)
CREATE OR REPLACE VIEW active_slots AS
SELECT
  s.x,
  s.y,
  s.tier,
  b.id              AS booking_id,
  b.advertiser_id,
  b.status,
  b.content_type,
  b.display_name,
  b.slogan,
  b.description,
  b.logo_initials,
  b.primary_color,
  b.background_color,
  b.cta_text,
  b.cta_url,
  b.image_url,
  b.badge,
  b.start_date,
  b.end_date,
  CASE WHEN b.id IS NOT NULL THEN true ELSE false END AS is_occupied
FROM slots s
LEFT JOIN bookings b
  ON b.slot_x = s.x
  AND b.slot_y = s.y
  AND b.status = 'active'
  AND b.start_date <= CURRENT_DATE
  AND b.end_date > CURRENT_DATE;

-- Vérification
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'description';
