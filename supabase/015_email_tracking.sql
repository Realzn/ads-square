-- ============================================================
-- ADS-SQUARE — Migration 013 : Colonnes tracking emails
-- ============================================================
-- Évite les doublons d'emails en marquant les notifications déjà envoyées.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS remind_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_notif_sent_at  TIMESTAMPTZ;

-- Index pour performance du cron
CREATE INDEX IF NOT EXISTS idx_bookings_remind ON bookings(remind_sent_at);
CREATE INDEX IF NOT EXISTS idx_bookings_expiry_notif ON bookings(expiry_notif_sent_at);

-- ============================================================
-- ✅ MIGRATION 013 TERMINÉE
-- ============================================================
