-- ============================================================
-- ADS-SQUARE — Migration 011 : Expiration automatique des blocs
-- ============================================================
-- Trois niveaux de sécurité pour l'expiration :
--
-- NIVEAU 1 (toujours actif) — Vue active_slots
--   La vue filtre déjà par end_date >= CURRENT_DATE
--   → les blocs expirés disparaissent visuellement immédiatement
--   → AUCUNE action requise, c'est déjà en place
--
-- NIVEAU 2 (ce fichier) — Trigger automatique
--   Un trigger sur SELECT de active_slots n'est pas possible,
--   mais on peut utiliser une fonction appelée par le webhook Stripe
--   et/ou pg_cron si disponible.
--
-- NIVEAU 3 — Cron externe via /api/cron/expire
--   Configurer sur cron-job.org (gratuit) :
--   URL     : https://ads-square.pages.dev/api/cron/expire
--   Header  : x-cron-token: <CRON_SECRET>
--   Schedule: 0 1 * * * (chaque jour à 01:00 UTC)
-- ============================================================

-- ── Fonction d'expiration (déjà créée dans 001, on la renforce) ──
CREATE OR REPLACE FUNCTION expire_old_bookings()
RETURNS void AS $$
DECLARE
  expired_count INT;
BEGIN
  UPDATE bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;   -- < et non <= pour expirer dès minuit J+1

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE NOTICE '[expire_old_bookings] % booking(s) expirés à %', expired_count, now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Expirer aussi les offres périmées ──
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS void AS $$
BEGIN
  UPDATE slot_offers
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Fonction combinée (la seule à appeler) ──
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS jsonb AS $$
DECLARE
  bookings_expired INT;
  offers_expired   INT;
BEGIN
  -- Expirer bookings
  UPDATE bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND end_date < CURRENT_DATE;
  GET DIAGNOSTICS bookings_expired = ROW_COUNT;

  -- Expirer offres
  UPDATE slot_offers
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
  GET DIAGNOSTICS offers_expired = ROW_COUNT;

  RETURN jsonb_build_object(
    'ran_at',            now(),
    'bookings_expired',  bookings_expired,
    'offers_expired',    offers_expired
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── pg_cron (Plan Pro Supabase uniquement) ──
-- Si tu es sur le plan Pro, décommente ces lignes :
-- SELECT cron.schedule(
--   'daily-maintenance',
--   '0 1 * * *',          -- chaque jour à 01:00 UTC
--   'SELECT run_daily_maintenance()'
-- );

-- ── Test immédiat ──
-- Vérifie les bookings qui seraient expirés aujourd'hui :
-- SELECT id, display_name, slot_x, slot_y, end_date, status
-- FROM bookings
-- WHERE status = 'active' AND end_date < CURRENT_DATE;

-- ── Appel manuel si besoin ──
-- SELECT run_daily_maintenance();

-- ============================================================
-- ✅ MIGRATION 011 TERMINÉE
-- Prochaine étape : configurer le cron externe sur cron-job.org
-- ============================================================
