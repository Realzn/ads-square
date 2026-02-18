-- ============================================================
-- ADS-SQUARE — Supabase Schema Migration
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM TYPES
-- ============================================================
CREATE TYPE slot_tier AS ENUM ('one', 'ten', 'corner_ten', 'hundred', 'thousand');
CREATE TYPE profile_type AS ENUM ('creator', 'freelance', 'brand');
CREATE TYPE booking_status AS ENUM ('pending', 'active', 'expired', 'cancelled');
CREATE TYPE content_type AS ENUM ('image', 'video', 'link', 'text', 'brand');

-- 2. TABLE : advertisers
-- ============================================================
CREATE TABLE advertisers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  profile_type    profile_type NOT NULL DEFAULT 'creator',
  logo_url        TEXT,
  website_url     TEXT,
  stripe_customer_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advertisers_email ON advertisers(email);
CREATE INDEX idx_advertisers_stripe ON advertisers(stripe_customer_id);

-- 3. TABLE : slots (grille 37×37 pré-peuplée)
-- ============================================================
CREATE TABLE slots (
  x         INT NOT NULL,
  y         INT NOT NULL,
  tier      slot_tier NOT NULL,
  PRIMARY KEY (x, y)
);

-- Peupler les 1369 slots avec les tiers calculés
-- Logique identique au getTier() du frontend
INSERT INTO slots (x, y, tier)
SELECT
  x, y,
  CASE
    -- 4 coins
    WHEN (x = 0 AND y = 0) OR (x = 36 AND y = 0) OR (x = 0 AND y = 36) OR (x = 36 AND y = 36)
      THEN 'corner_ten'::slot_tier
    -- Centre exact
    WHEN GREATEST(ABS(x - 18), ABS(y - 18)) = 0
      THEN 'one'::slot_tier
    -- Anneau prestige (dist <= 3)
    WHEN GREATEST(ABS(x - 18), ABS(y - 18)) <= 3
      THEN 'ten'::slot_tier
    -- Zone business (dist <= 11)
    WHEN GREATEST(ABS(x - 18), ABS(y - 18)) <= 11
      THEN 'hundred'::slot_tier
    -- Viral (reste)
    ELSE 'thousand'::slot_tier
  END
FROM generate_series(0, 36) AS x
CROSS JOIN generate_series(0, 36) AS y;

-- 4. TABLE : bookings
-- ============================================================
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_x            INT NOT NULL,
  slot_y            INT NOT NULL,
  advertiser_id     UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  status            booking_status NOT NULL DEFAULT 'pending',
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  
  -- Stripe
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  amount_cents      INT NOT NULL DEFAULT 0,
  
  -- Contenu créatif (affiché sur la grille)
  content_type      content_type NOT NULL DEFAULT 'text',
  display_name      TEXT NOT NULL,
  slogan            TEXT,
  logo_initials     TEXT NOT NULL DEFAULT '??',
  primary_color     TEXT NOT NULL DEFAULT '#00d9f5',
  background_color  TEXT NOT NULL DEFAULT '#0d1828',
  cta_text          TEXT DEFAULT 'Visiter',
  cta_url           TEXT,
  image_url         TEXT,
  badge             TEXT DEFAULT 'CRÉATEUR',
  
  -- Méta
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  FOREIGN KEY (slot_x, slot_y) REFERENCES slots(x, y),
  
  -- Un seul booking actif par slot à la fois
  -- (la contrainte réelle est dans la fonction check ci-dessous)
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_bookings_slot ON bookings(slot_x, slot_y);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_advertiser ON bookings(advertiser_id);
CREATE INDEX idx_bookings_stripe_session ON bookings(stripe_session_id);

-- 5. FONCTION : vérifier qu'un slot n'a pas de booking actif qui chevauche
-- ============================================================
CREATE OR REPLACE FUNCTION check_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_x = NEW.slot_x
      AND slot_y = NEW.slot_y
      AND id != NEW.id
      AND status IN ('active', 'pending')
      AND start_date < NEW.end_date
      AND end_date > NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Slot (%,%) is already booked for this period', NEW.slot_x, NEW.slot_y;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_slot_availability
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_slot_availability();

-- 6. FONCTION : auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_advertisers_updated
  BEFORE UPDATE ON advertisers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. VUE : active_slots (ce que le frontend lit)
-- ============================================================
-- Retourne tous les slots avec leur booking actif s'il existe
CREATE OR REPLACE VIEW active_slots AS
SELECT
  s.x,
  s.y,
  s.tier,
  b.id            AS booking_id,
  b.advertiser_id,
  b.status,
  b.content_type,
  b.display_name,
  b.slogan,
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

-- 8. FONCTION : expirer automatiquement les bookings dépassés
-- ============================================================
CREATE OR REPLACE FUNCTION expire_old_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND end_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Appeler via Supabase Cron (pg_cron) :
-- SELECT cron.schedule('expire-bookings', '0 1 * * *', 'SELECT expire_old_bookings()');
-- ⚠️ pg_cron nécessite le plan Pro. Alternative : appeler via une Edge Function CRON.

-- 9. ROW LEVEL SECURITY
-- ============================================================

-- Activer RLS
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- SLOTS : lecture publique (tout le monde voit la grille)
CREATE POLICY "Slots are viewable by everyone"
  ON slots FOR SELECT
  USING (true);

-- BOOKINGS : lecture publique (on voit les annonces actives)
CREATE POLICY "Active bookings are viewable by everyone"
  ON bookings FOR SELECT
  USING (true);

-- BOOKINGS : insertion via service_role uniquement (webhook Stripe)
-- Le anon key ne peut PAS créer de bookings directement
CREATE POLICY "Bookings are created by service role only"
  ON bookings FOR INSERT
  WITH CHECK (false);
  -- Le webhook Stripe utilisera la service_role key

-- BOOKINGS : update via service_role uniquement
CREATE POLICY "Bookings are updated by service role only"
  ON bookings FOR UPDATE
  USING (false);

-- ADVERTISERS : lecture par l'annonceur lui-même
CREATE POLICY "Advertisers can view own profile"
  ON advertisers FOR SELECT
  USING (true);
  -- Public pour l'instant, on restreindra avec Supabase Auth plus tard

-- ADVERTISERS : insertion via service_role (webhook crée le profil)
CREATE POLICY "Advertisers are created by service role only"
  ON advertisers FOR INSERT
  WITH CHECK (false);

-- 10. REALTIME : activer les notifications sur bookings
-- ============================================================
-- Dans Supabase Dashboard → Database → Replication → activer la table "bookings"
-- Ou via SQL :
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- 11. STATS VIEW (optionnel, utile pour le dashboard)
-- ============================================================
CREATE OR REPLACE VIEW grid_stats AS
SELECT
  s.tier,
  COUNT(*) AS total_slots,
  COUNT(b.id) AS occupied_slots,
  COUNT(*) - COUNT(b.id) AS vacant_slots,
  ROUND(COUNT(b.id)::numeric / COUNT(*)::numeric * 100, 1) AS occupancy_pct
FROM slots s
LEFT JOIN bookings b
  ON b.slot_x = s.x
  AND b.slot_y = s.y
  AND b.status = 'active'
  AND b.start_date <= CURRENT_DATE
  AND b.end_date > CURRENT_DATE
GROUP BY s.tier
ORDER BY
  CASE s.tier
    WHEN 'one' THEN 1
    WHEN 'ten' THEN 2
    WHEN 'corner_ten' THEN 3
    WHEN 'hundred' THEN 4
    WHEN 'thousand' THEN 5
  END;

-- ============================================================
-- ✅ MIGRATION TERMINÉE
-- 
-- Résumé :
--   • 1369 slots pré-peuplés (grille 37×37)
--   • Tiers calculés identiques au frontend
--   • Trigger anti-double-booking
--   • Vue active_slots pour le frontend
--   • Expiration auto des bookings
--   • RLS : lecture publique, écriture service_role only
--   • Realtime activé sur bookings
--
-- Prochaine étape : créer 2-3 bookings de test (voir 002_seed_demo.sql)
-- ============================================================
