-- ============================================================
-- ADS-SQUARE — Migration 030 : Email tracking + Cron daily stats
-- + Boost requests table complète
-- ============================================================

-- 1. TABLE : boost_requests (référencée dans /api/boost/request)
-- ============================================================
CREATE TABLE IF NOT EXISTS boost_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  url           TEXT NOT NULL,
  hours         INT NOT NULL CHECK (hours >= 1),
  amount_cents  INT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),

  -- Stripe (paiement du boost)
  stripe_session_id TEXT,
  stripe_payment_id TEXT,

  -- Admin
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   TEXT,
  note          TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boost_email  ON boost_requests(email);
CREATE INDEX IF NOT EXISTS idx_boost_status ON boost_requests(status);

CREATE TRIGGER trg_boost_updated
  BEFORE UPDATE ON boost_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE boost_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boost visible service" ON boost_requests FOR SELECT USING (false);
CREATE POLICY "Boost insert service"  ON boost_requests FOR INSERT WITH CHECK (false);
CREATE POLICY "Boost update service"  ON boost_requests FOR UPDATE USING (false);

-- 2. TABLE : email_log (traçabilité des emails envoyés)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email    TEXT NOT NULL,
  type        TEXT NOT NULL,   -- 'waitlist_welcome', 'booking_confirmed', 'daily_stats', etc.
  subject     TEXT,
  resend_id   TEXT,            -- ID retourné par Resend
  status      TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'bounced')),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_to   ON email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(type);
CREATE INDEX IF NOT EXISTS idx_email_log_date ON email_log(created_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Email log service" ON email_log FOR SELECT USING (false);

-- 3. FONCTION CRON : envoyer les stats quotidiennes
-- ============================================================
-- Cette fonction est appelée chaque matin par pg_cron ou Edge Function CRON
-- Elle génère et envoie les récapitulatifs quotidiens

CREATE OR REPLACE FUNCTION generate_daily_stats_payload()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_row    RECORD;
BEGIN
  -- Récupérer tous les membres actifs avec leurs stats
  FOR v_row IN
    SELECT
      a.email,
      a.display_name,
      s.slot_x,
      s.slot_y,
      s.tasks_streak,
      s.tasks_missed_days,
      s.rank,
      get_suspension_threshold(s.rank) - s.tasks_missed_days AS days_before_suspension,
      COALESCE(bs.clicks_today, 0)      AS clicks_today,
      COALESCE(bs.clicks_7d, 0)         AS clicks_week,
      COALESCE(bs.impressions_7d, 0)    AS impressions_week,
      COALESCE(bs.ctr_pct, 0)           AS ctr
    FROM subscriptions s
    JOIN advertisers a ON a.id = s.advertiser_id
    LEFT JOIN booking_stats bs
      ON bs.slot_x = s.slot_x AND bs.slot_y = s.slot_y AND bs.status = 'active'
    WHERE s.status = 'active'
  LOOP
    v_result := v_result || jsonb_build_object(
      'email',                v_row.email,
      'name',                 v_row.display_name,
      'slotX',                v_row.slot_x,
      'slotY',                v_row.slot_y,
      'streak',               v_row.tasks_streak,
      'rank',                 v_row.rank,
      'daysBeforeSuspension', v_row.days_before_suspension,
      'clicksToday',          v_row.clicks_today,
      'clicksWeek',           v_row.clicks_week,
      'impressionsWeek',      v_row.impressions_week,
      'ctr',                  v_row.ctr
    );
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. VUE ADMIN : email stats
-- ============================================================
CREATE OR REPLACE VIEW admin_email_stats AS
SELECT
  type,
  COUNT(*)                                           AS total_sent,
  COUNT(*) FILTER (WHERE status = 'failed')          AS failed,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS sent_24h,
  MAX(created_at)                                    AS last_sent
FROM email_log
GROUP BY type
ORDER BY total_sent DESC;

-- 5. CRON JOBS (à activer si pg_cron Pro est disponible)
-- ============================================================
-- Générer les tâches du jour à 6h chaque matin
-- SELECT cron.schedule('create-daily-tasks',    '0 6 * * *', 'SELECT create_all_daily_tasks()');

-- Vérifier les suspensions à 22h chaque soir
-- SELECT cron.schedule('daily-suspension-check', '0 22 * * *', 'SELECT run_daily_suspension_check()');

-- Expirer les bookings et offres à 1h
-- SELECT cron.schedule('expire-bookings', '0 1 * * *', 'SELECT expire_old_bookings(); SELECT expire_old_offers();');

-- ============================================================
-- ✅ MIGRATION 030 TERMINÉE
--
-- Nouvelles tables :
--   • boost_requests    — demandes de boost spotlight
--   • email_log         — traçabilité emails Resend
--
-- Nouvelles fonctions :
--   • generate_daily_stats_payload() — payload JSON pour cron emails
--
-- Nouvelles vues :
--   • admin_email_stats — statistiques d'envoi email
-- ============================================================
