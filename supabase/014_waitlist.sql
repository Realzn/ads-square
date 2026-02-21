-- ============================================================
-- ADS-SQUARE — Migration 014 : Table waitlist
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  profile    TEXT,                        -- 'creator' | 'freelance' | 'brand' | null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

-- Index pour les exports et recherches par date
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_profile ON waitlist(profile);

-- RLS : lecture réservée au service role (admin uniquement)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Aucune policy publique — uniquement accessible via service_role key (API routes)
-- Les inscriptions se font via /api/waitlist qui utilise le service client

-- Vue admin pour comptage rapide
CREATE OR REPLACE VIEW waitlist_stats AS
SELECT
  COUNT(*)                                          AS total,
  COUNT(*) FILTER (WHERE profile = 'creator')      AS creators,
  COUNT(*) FILTER (WHERE profile = 'freelance')    AS freelancers,
  COUNT(*) FILTER (WHERE profile = 'brand')        AS brands,
  COUNT(*) FILTER (WHERE profile IS NULL)          AS unknown,
  MAX(created_at)                                   AS last_signup
FROM waitlist;

-- ============================================================
-- ✅ MIGRATION 014 TERMINÉE
-- À exécuter dans Supabase → SQL Editor
-- ============================================================
