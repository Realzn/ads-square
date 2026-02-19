-- ============================================================
-- ADS-SQUARE — Migration 003 : Buyout Offers + Click Stats
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. ENUM : statut d'une offre de rachat
-- ============================================================
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'cancelled');

-- 2. TABLE : slot_offers (offres de rachat)
-- ============================================================
CREATE TABLE slot_offers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Slot ciblé
  slot_x            INT NOT NULL,
  slot_y            INT NOT NULL,
  
  -- Booking actuel que l'offre cherche à racheter
  target_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Acheteur potentiel
  buyer_email       TEXT NOT NULL,
  buyer_name        TEXT,
  
  -- Montant de l'offre (en centimes pour éviter les float)
  offer_amount_cents INT NOT NULL CHECK (offer_amount_cents > 0),
  
  -- Statut et gestion
  status            offer_status NOT NULL DEFAULT 'pending',
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  
  -- Stripe (pré-autorisation, débitée seulement si acceptée)
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  
  -- Métadonnées
  message           TEXT,                         -- message optionnel à l'occupant
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  FOREIGN KEY (slot_x, slot_y) REFERENCES slots(x, y)
);

CREATE INDEX idx_offers_slot       ON slot_offers(slot_x, slot_y);
CREATE INDEX idx_offers_booking    ON slot_offers(target_booking_id);
CREATE INDEX idx_offers_status     ON slot_offers(status);
CREATE INDEX idx_offers_buyer      ON slot_offers(buyer_email);
CREATE INDEX idx_offers_expires    ON slot_offers(expires_at);

-- 3. FONCTION : expirer automatiquement les offres > 72h
-- ============================================================
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS void AS $$
BEGIN
  UPDATE slot_offers
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Appeler via cron (même job que expire_old_bookings) :
-- SELECT cron.schedule('expire-offers', '*/30 * * * *', 'SELECT expire_old_offers()');

-- 4. TRIGGER : updated_at sur slot_offers
-- ============================================================
CREATE TRIGGER trg_offers_updated
  BEFORE UPDATE ON slot_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. TABLE : slot_clicks (tracking clics sur les blocs)
-- ============================================================
CREATE TABLE slot_clicks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_x        INT NOT NULL,
  slot_y        INT NOT NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Type d'événement
  event_type    TEXT NOT NULL DEFAULT 'click'   -- 'click' | 'impression'
    CHECK (event_type IN ('click', 'impression')),
  
  -- Anti-duplicate : on ne log pas 2 clics du même user dans la même session
  session_hash  TEXT,    -- hash(ip + user_agent + date) — jamais l'IP brute
  
  -- Contexte
  referrer      TEXT,    -- d'où venait le visiteur
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  FOREIGN KEY (slot_x, slot_y) REFERENCES slots(x, y)
);

CREATE INDEX idx_clicks_slot      ON slot_clicks(slot_x, slot_y);
CREATE INDEX idx_clicks_booking   ON slot_clicks(booking_id);
CREATE INDEX idx_clicks_event     ON slot_clicks(event_type);
CREATE INDEX idx_clicks_date      ON slot_clicks(created_at);

-- 6. VUE : stats par booking (utilisée dans le dashboard annonceur)
-- ============================================================
CREATE OR REPLACE VIEW booking_stats AS
SELECT
  b.id                                          AS booking_id,
  b.slot_x,
  b.slot_y,
  b.display_name,
  b.start_date,
  b.end_date,
  b.status,
  -- Impressions
  COUNT(*) FILTER (WHERE sc.event_type = 'impression') AS impressions,
  -- Clics
  COUNT(*) FILTER (WHERE sc.event_type = 'click')      AS clicks,
  -- CTR
  CASE
    WHEN COUNT(*) FILTER (WHERE sc.event_type = 'impression') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE sc.event_type = 'click')::numeric
      / COUNT(*) FILTER (WHERE sc.event_type = 'impression')::numeric * 100,
      2
    )
  END                                           AS ctr_pct,
  -- Stats des 7 derniers jours
  COUNT(*) FILTER (WHERE sc.event_type = 'click' AND sc.created_at > now() - INTERVAL '7 days')
                                                AS clicks_7d,
  COUNT(*) FILTER (WHERE sc.event_type = 'impression' AND sc.created_at > now() - INTERVAL '7 days')
                                                AS impressions_7d
FROM bookings b
LEFT JOIN slot_clicks sc
  ON sc.booking_id = b.id
GROUP BY b.id, b.slot_x, b.slot_y, b.display_name, b.start_date, b.end_date, b.status;

-- 7. FONCTION : enregistrer un clic (appelée côté serveur, jamais depuis anon)
-- ============================================================
CREATE OR REPLACE FUNCTION record_click(
  p_slot_x       INT,
  p_slot_y       INT,
  p_booking_id   UUID,
  p_event_type   TEXT DEFAULT 'click',
  p_session_hash TEXT DEFAULT NULL,
  p_referrer     TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Anti-spam : ne pas compter si même session dans les 30 dernières minutes
  IF p_session_hash IS NOT NULL AND EXISTS (
    SELECT 1 FROM slot_clicks
    WHERE slot_x = p_slot_x
      AND slot_y = p_slot_y
      AND session_hash = p_session_hash
      AND event_type = p_event_type
      AND created_at > now() - INTERVAL '30 minutes'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO slot_clicks (slot_x, slot_y, booking_id, event_type, session_hash, referrer)
  VALUES (p_slot_x, p_slot_y, p_booking_id, p_event_type, p_session_hash, p_referrer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS
-- ============================================================
ALTER TABLE slot_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_clicks ENABLE ROW LEVEL SECURITY;

-- Offres : lecture publique (occupant doit pouvoir voir les offres sur son slot)
CREATE POLICY "Offers are viewable by everyone"
  ON slot_offers FOR SELECT USING (true);

-- Offres : insertion via service_role uniquement
CREATE POLICY "Offers are created by service role only"
  ON slot_offers FOR INSERT WITH CHECK (false);

CREATE POLICY "Offers are updated by service role only"
  ON slot_offers FOR UPDATE USING (false);

-- Clics : lecture publique (stats visibles)
CREATE POLICY "Clicks are viewable by everyone"
  ON slot_clicks FOR SELECT USING (true);

-- Clics : insertion bloquée côté anon (via Edge Function seulement)
CREATE POLICY "Clicks are inserted by service role only"
  ON slot_clicks FOR INSERT WITH CHECK (false);

-- 9. REALTIME : offres et stats en temps réel
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE slot_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE slot_clicks;

-- ============================================================
-- ✅ MIGRATION 003 TERMINÉE
--
-- Nouvelles tables :
--   • slot_offers    — offres de rachat avec expiration 72h
--   • slot_clicks    — tracking impressions + clics (anonymisé)
--
-- Nouvelles vues :
--   • booking_stats  — CTR, clics, impressions par booking
--
-- Nouvelles fonctions :
--   • expire_old_offers()   — expiration auto des offres
--   • record_click(...)     — enregistrement sécurisé des clics
-- ============================================================
