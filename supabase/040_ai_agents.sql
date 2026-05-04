-- ============================================================
-- ADS-SQUARE — Migration 040 : AI business multi-agents control plane
-- ============================================================

-- ─── 0. Stabilisation schéma (cohérence auth + statuts) ───────────────────

ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS user_id UUID;

UPDATE advertisers
SET
  auth_user_id = COALESCE(auth_user_id, user_id),
  user_id = COALESCE(user_id, auth_user_id)
WHERE auth_user_id IS NULL OR user_id IS NULL;

CREATE OR REPLACE FUNCTION sync_advertiser_auth_ids()
RETURNS TRIGGER AS $$
BEGIN
  NEW.auth_user_id := COALESCE(NEW.auth_user_id, NEW.user_id);
  NEW.user_id := COALESCE(NEW.user_id, NEW.auth_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_advertiser_auth_ids ON advertisers;
CREATE TRIGGER trg_sync_advertiser_auth_ids
  BEFORE INSERT OR UPDATE ON advertisers
  FOR EACH ROW
  EXECUTE FUNCTION sync_advertiser_auth_ids();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'suspended';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'void';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_tier_name(p_tier TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE LOWER(COALESCE(p_tier, ''))
    WHEN 'one' THEN 'epicenter'
    WHEN 'ten' THEN 'prestige'
    WHEN 'corner_ten' THEN 'prestige'
    WHEN 'hundred' THEN 'business'
    WHEN 'thousand' THEN 'viral'
    WHEN 'epicenter' THEN 'epicenter'
    WHEN 'prestige' THEN 'prestige'
    WHEN 'elite' THEN 'elite'
    WHEN 'business' THEN 'business'
    WHEN 'standard' THEN 'standard'
    WHEN 'viral' THEN 'viral'
    ELSE 'viral'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS tier_config (
  tier        TEXT PRIMARY KEY,
  available   BOOLEAN NOT NULL DEFAULT false,
  label       TEXT,
  price_cents INT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

INSERT INTO tier_config (tier, available, label, price_cents)
VALUES
  ('epicenter', false, 'ÉPICENTRE', 100000),
  ('prestige', false, 'PRESTIGE', 10000),
  ('elite', false, 'ELITE', 5000),
  ('business', true, 'BUSINESS', 1000),
  ('standard', true, 'STANDARD', 300),
  ('viral', true, 'VIRAL', 100)
ON CONFLICT (tier) DO UPDATE
SET label = EXCLUDED.label,
    price_cents = EXCLUDED.price_cents,
    updated_at = now();

-- ─── 1. Tables AI control plane ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,
  event_source  TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  advertiser_id UUID REFERENCES advertisers(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  happened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_events_type_date ON ai_events(event_type, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_source_date ON ai_events(event_source, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_advertiser ON ai_events(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_booking ON ai_events(booking_id);

CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type    TEXT NOT NULL,
  trigger_type  TEXT NOT NULL DEFAULT 'manual',
  status        TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed', 'partial')),
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  duration_ms   INT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_agent_date ON ai_agent_runs(agent_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_status ON ai_agent_runs(status);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id   UUID REFERENCES ai_agent_runs(id) ON DELETE SET NULL,
  agent_type     TEXT NOT NULL,
  advertiser_id  UUID REFERENCES advertisers(id) ON DELETE SET NULL,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  priority       INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  score          NUMERIC(6,3) NOT NULL DEFAULT 0,
  title          TEXT NOT NULL,
  description    TEXT,
  action_type    TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'rejected', 'executed', 'dismissed', 'expired')),
  recommended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  executed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_reco_status_date ON ai_recommendations(status, recommended_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reco_agent_date ON ai_recommendations(agent_type, recommended_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reco_advertiser_status ON ai_recommendations(advertiser_id, status, recommended_at DESC);

CREATE TABLE IF NOT EXISTS ai_actions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation_id  UUID REFERENCES ai_recommendations(id) ON DELETE CASCADE,
  agent_type         TEXT NOT NULL,
  action_type        TEXT NOT NULL,
  action_payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  mode               TEXT NOT NULL DEFAULT 'recommend_only'
    CHECK (mode IN ('recommend_only', 'auto_safe')),
  status             TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'approved', 'executed', 'failed', 'skipped', 'cancelled')),
  requires_approval  BOOLEAN NOT NULL DEFAULT true,
  approved_by        TEXT,
  approved_at        TIMESTAMPTZ,
  scheduled_for      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_status_date ON ai_actions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_type_status ON ai_actions(action_type, status);

CREATE TABLE IF NOT EXISTS ai_action_executions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id        UUID NOT NULL REFERENCES ai_actions(id) ON DELETE CASCADE,
  idempotency_key  TEXT NOT NULL UNIQUE,
  execution_status TEXT NOT NULL
    CHECK (execution_status IN ('success', 'failed', 'skipped', 'dry_run')),
  result_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message    TEXT,
  duration_ms      INT,
  executed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_exec_action_date ON ai_action_executions(action_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS ai_guardrails (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type        TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  mode              TEXT NOT NULL DEFAULT 'recommend_only'
    CHECK (mode IN ('recommend_only', 'auto_safe')),
  allowed           BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  daily_limit       INT NOT NULL DEFAULT 50,
  cooldown_minutes  INT NOT NULL DEFAULT 5,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_type, action_type)
);

CREATE TABLE IF NOT EXISTS ai_business_metrics_daily (
  metric_date      DATE NOT NULL,
  cohort           TEXT NOT NULL DEFAULT 'all',
  conversion_rate  NUMERIC(6,3) NOT NULL DEFAULT 0,
  renewal_rate     NUMERIC(6,3) NOT NULL DEFAULT 0,
  churn_rate       NUMERIC(6,3) NOT NULL DEFAULT 0,
  arpu_cents       INT NOT NULL DEFAULT 0,
  ltv_short_cents  INT NOT NULL DEFAULT 0,
  ctr_uplift       NUMERIC(6,3) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(metric_date, cohort)
);

INSERT INTO ai_guardrails (agent_type, action_type, mode, allowed, requires_approval, daily_limit, cooldown_minutes)
VALUES
  ('conversion', 'send_email', 'recommend_only', true, true, 120, 30),
  ('conversion', 'schedule_followup', 'auto_safe', true, false, 200, 10),
  ('revenue', 'send_email', 'recommend_only', true, true, 80, 60),
  ('revenue', 'create_admin_task', 'auto_safe', true, false, 100, 5),
  ('retention', 'send_email', 'recommend_only', true, true, 90, 60),
  ('retention', 'create_admin_task', 'auto_safe', true, false, 120, 10),
  ('ops', 'create_admin_task', 'auto_safe', true, false, 100, 5),
  ('ops', 'toggle_tier_recommendation', 'recommend_only', true, true, 12, 120)
ON CONFLICT (agent_type, action_type) DO NOTHING;

-- ─── 2. Vues de scoring ─────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_churn_risk_candidates AS
SELECT
  md.advertiser_id,
  s.id AS subscription_id,
  s.booking_id,
  md.email,
  md.display_name,
  md.rank,
  md.status,
  md.slot_x,
  md.slot_y,
  md.tasks_streak,
  md.tasks_missed_days,
  md.days_before_suspension,
  ROUND(
    LEAST(
      1,
      (COALESCE(md.tasks_missed_days, 0)::numeric / GREATEST(get_suspension_threshold(md.rank), 1)::numeric)
      + CASE WHEN COALESCE(md.tasks_streak, 0) < 3 THEN 0.20 ELSE 0 END
      + CASE WHEN COALESCE(md.days_before_suspension, 0) <= 1 THEN 0.35 ELSE 0 END
    ),
    3
  ) AS risk_score,
  CASE
    WHEN COALESCE(md.days_before_suspension, 99) <= 1 THEN 'critical'
    WHEN COALESCE(md.days_before_suspension, 99) <= 2 THEN 'high'
    ELSE 'medium'
  END AS severity
FROM member_dashboard md
JOIN subscriptions s ON s.advertiser_id = md.advertiser_id
WHERE md.status IN ('active', 'past_due', 'suspended')
  AND md.rank <> 'elu';

CREATE OR REPLACE VIEW v_conversion_dropoffs AS
SELECT
  b.id AS booking_id,
  b.advertiser_id,
  a.email,
  a.display_name,
  b.slot_x,
  b.slot_y,
  normalize_tier_name(COALESCE(s.tier::TEXT, 'viral')) AS normalized_tier,
  b.amount_cents,
  b.created_at,
  ROUND(
    LEAST(
      1,
      (EXTRACT(EPOCH FROM (now() - b.created_at)) / 3600.0) / 24.0
      + CASE
          WHEN normalize_tier_name(COALESCE(s.tier::TEXT, 'viral')) IN ('epicenter', 'prestige') THEN 0.30
          WHEN normalize_tier_name(COALESCE(s.tier::TEXT, 'viral')) = 'elite' THEN 0.20
          ELSE 0.10
        END
    ),
    3
  ) AS dropoff_score
FROM bookings b
LEFT JOIN advertisers a ON a.id = b.advertiser_id
LEFT JOIN slots s ON s.x = b.slot_x AND s.y = b.slot_y
WHERE b.status = 'pending'
  AND b.created_at < now() - INTERVAL '45 minutes'
  AND b.created_at > now() - INTERVAL '7 days';

CREATE OR REPLACE VIEW v_upsell_candidates AS
SELECT
  b.id AS booking_id,
  b.advertiser_id,
  a.email,
  a.display_name,
  b.slot_x,
  b.slot_y,
  normalize_tier_name(COALESCE(s.tier::TEXT, 'viral')) AS normalized_tier,
  COALESCE(bs.clicks_7d, 0) AS clicks_7d,
  COALESCE(bs.impressions_7d, 0) AS impressions_7d,
  COALESCE(bs.ctr_pct, 0) AS ctr_pct,
  GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (COALESCE(b.expires_at, (b.end_date + INTERVAL '1 day')::timestamptz) - now())) / 86400)
  )::INT AS days_to_expiry,
  ROUND(
    LEAST(
      1,
      (COALESCE(bs.clicks_7d, 0)::numeric / 120.0)
      + (COALESCE(bs.ctr_pct, 0)::numeric / 30.0)
      + CASE
          WHEN COALESCE(b.expires_at, (b.end_date + INTERVAL '1 day')::timestamptz) <= now() + INTERVAL '3 days' THEN 0.25
          WHEN COALESCE(b.expires_at, (b.end_date + INTERVAL '1 day')::timestamptz) <= now() + INTERVAL '7 days' THEN 0.15
          ELSE 0
        END
    ),
    3
  ) AS upsell_score
FROM bookings b
LEFT JOIN advertisers a ON a.id = b.advertiser_id
LEFT JOIN slots s ON s.x = b.slot_x AND s.y = b.slot_y
LEFT JOIN booking_stats bs ON bs.booking_id = b.id
WHERE b.status = 'active'
  AND COALESCE(b.expires_at, (b.end_date + INTERVAL '1 day')::timestamptz) <= now() + INTERVAL '10 days';

-- ─── 3. RLS tables AI (service role only) ──────────────────────────────────

ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_business_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_events_service_only" ON ai_events FOR ALL USING (false);
CREATE POLICY "ai_agent_runs_service_only" ON ai_agent_runs FOR ALL USING (false);
CREATE POLICY "ai_recommendations_service_only" ON ai_recommendations FOR ALL USING (false);
CREATE POLICY "ai_actions_service_only" ON ai_actions FOR ALL USING (false);
CREATE POLICY "ai_action_exec_service_only" ON ai_action_executions FOR ALL USING (false);
CREATE POLICY "ai_guardrails_service_only" ON ai_guardrails FOR ALL USING (false);
CREATE POLICY "ai_metrics_service_only" ON ai_business_metrics_daily FOR ALL USING (false);

-- ============================================================
-- ✅ MIGRATION 040 TERMINÉE
-- ============================================================
