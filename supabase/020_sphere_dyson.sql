-- ============================================================
-- SPHÈRE DE DYSON — Migration complète
-- Brique 1 : Abonnements journaliers annulables
-- Brique 2 : Système de tâches quotidiennes
-- Brique 3 : Fil communautaire (mentions, recommandations)
-- Brique 4 : Suspension automatique
-- ============================================================

-- ─── TYPES ───────────────────────────────────────────────────

CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled', 'past_due');
CREATE TYPE task_type AS ENUM (
  'share_grid',        -- Partager la grille (Signal + Bâtisseur)
  'highlight_neighbor',-- Mettre en avant un voisin (Bâtisseur)
  'create_content',    -- Créer du contenu autour de la grille (Gardien + Architecte)
  'welcome_member',    -- Accueillir un nouveau membre (Gardien)
  'recommend_members', -- Recommander 2 membres publiquement (Architecte)
  'offer_advantage',   -- Offrir un avantage aux membres (Architecte)
  'slot_perfect'       -- Slot parfait à jour (Élu)
);
CREATE TYPE community_action_type AS ENUM (
  'share',        -- Partage de la grille
  'highlight',    -- Mise en avant d'un membre
  'recommend',    -- Recommandation publique
  'welcome',      -- Accueil d'un nouveau
  'advantage'     -- Avantage offert à la communauté
);

-- ─── BRIQUE 1 : ABONNEMENTS JOURNALIERS ──────────────────────

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_id         UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  slot_x                INT NOT NULL,
  slot_y                INT NOT NULL,
  tier                  TEXT NOT NULL,                          -- epicenter, prestige, elite, business, standard, viral
  rank                  TEXT NOT NULL,                          -- elu, architecte, gardien, batisseur, signal
  status                subscription_status NOT NULL DEFAULT 'active',

  -- Stripe Subscription (abonnement récurrent)
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  price_cents_per_day    INT NOT NULL,

  -- Dates
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at          TIMESTAMPTZ,
  suspended_at          TIMESTAMPTZ,
  next_billing_date     DATE,

  -- Stats de tâches
  tasks_streak          INT NOT NULL DEFAULT 0,  -- jours consécutifs de tâches complétées
  tasks_missed_days     INT NOT NULL DEFAULT 0,  -- jours sans tâches (reset à 0 si tâche faite)
  last_task_date        DATE,

  -- Lien avec l'ancien système de bookings (transition)
  booking_id            UUID REFERENCES bookings(id),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  FOREIGN KEY (slot_x, slot_y) REFERENCES slots(x, y)
);

CREATE INDEX idx_subs_advertiser    ON subscriptions(advertiser_id);
CREATE INDEX idx_subs_status        ON subscriptions(status);
CREATE INDEX idx_subs_slot          ON subscriptions(slot_x, slot_y);
CREATE INDEX idx_subs_stripe        ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subs_rank          ON subscriptions(rank);

-- ─── BRIQUE 2 : TÂCHES QUOTIDIENNES ──────────────────────────

CREATE TABLE daily_tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id   UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  advertiser_id     UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  task_type         task_type NOT NULL,
  task_date         DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Completion
  completed         BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,

  -- Contenu déclaratif (preuve fournie par l'utilisateur)
  proof_text        TEXT,          -- description de l'action réalisée
  proof_url         TEXT,          -- lien vers le post, partage, contenu créé
  proof_platform    TEXT,          -- instagram, twitter, linkedin, etc.

  -- Cible de la tâche (pour highlight_neighbor, recommend_members)
  target_slot_x     INT,
  target_slot_y     INT,
  target_name       TEXT,          -- nom du membre mis en avant

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule tâche de chaque type par jour par abonnement
  UNIQUE (subscription_id, task_type, task_date)
);

CREATE INDEX idx_tasks_sub_date   ON daily_tasks(subscription_id, task_date);
CREATE INDEX idx_tasks_advertiser ON daily_tasks(advertiser_id);
CREATE INDEX idx_tasks_date       ON daily_tasks(task_date);
CREATE INDEX idx_tasks_completed  ON daily_tasks(completed, task_date);

-- ─── BRIQUE 3 : FIL COMMUNAUTAIRE ────────────────────────────

CREATE TABLE community_feed (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_id     UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  subscription_id   UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  action_type       community_action_type NOT NULL,
  rank              TEXT NOT NULL,                -- rang de l'auteur

  -- Contenu de l'action
  content_text      TEXT NOT NULL,               -- description publique de l'action
  proof_url         TEXT,                        -- lien de preuve
  platform          TEXT,                        -- plateforme (instagram, twitter...)

  -- Membre mis en avant (si highlight / recommend / welcome)
  featured_advertiser_id  UUID REFERENCES advertisers(id) ON DELETE SET NULL,
  featured_slot_x         INT,
  featured_slot_y         INT,
  featured_name           TEXT,

  -- Avantage offert (si action_type = 'advantage')
  advantage_description   TEXT,
  advantage_valid_until   DATE,

  -- Engagement
  views_count       INT NOT NULL DEFAULT 0,
  likes_count       INT NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_created      ON community_feed(created_at DESC);
CREATE INDEX idx_feed_action_type  ON community_feed(action_type);
CREATE INDEX idx_feed_advertiser   ON community_feed(advertiser_id);
CREATE INDEX idx_feed_featured     ON community_feed(featured_advertiser_id);

-- Likes sur le fil
CREATE TABLE community_likes (
  advertiser_id   UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  feed_id         UUID NOT NULL REFERENCES community_feed(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (advertiser_id, feed_id)
);

-- ─── BRIQUE 4 : SUSPENSION AUTOMATIQUE ───────────────────────

-- Historique des suspensions pour audit
CREATE TABLE suspension_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id   UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  advertiser_id     UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL,   -- 'tasks_missed_5d', 'payment_failed', 'dead_link', 'manual'
  missed_days       INT,
  suspended_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reactivated_at    TIMESTAMPTZ,
  reactivated_by    TEXT            -- 'user', 'admin', 'auto'
);

-- ─── FONCTIONS UTILITAIRES ────────────────────────────────────

-- Calculer le rang depuis le tier
CREATE OR REPLACE FUNCTION get_rank_from_tier(p_tier TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'epicenter' THEN 'elu'
    WHEN 'prestige'  THEN 'architecte'
    WHEN 'elite'     THEN 'architecte'
    WHEN 'business'  THEN 'batisseur'
    WHEN 'standard'  THEN 'batisseur'
    WHEN 'viral'     THEN 'signal'
    ELSE 'signal'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Obtenir les tâches requises par rang
CREATE OR REPLACE FUNCTION get_required_tasks(p_rank TEXT)
RETURNS task_type[] AS $$
BEGIN
  RETURN CASE p_rank
    WHEN 'signal'      THEN ARRAY['share_grid']::task_type[]
    WHEN 'batisseur'   THEN ARRAY['share_grid', 'highlight_neighbor']::task_type[]
    WHEN 'gardien'     THEN ARRAY['create_content', 'welcome_member']::task_type[]
    WHEN 'architecte'  THEN ARRAY['create_content', 'recommend_members', 'offer_advantage']::task_type[]
    WHEN 'elu'         THEN ARRAY['slot_perfect']::task_type[]
    ELSE ARRAY['share_grid']::task_type[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Nombre de jours avant suspension par rang
CREATE OR REPLACE FUNCTION get_suspension_threshold(p_rank TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE p_rank
    WHEN 'elu'        THEN 0   -- jamais suspendu pour tâches
    WHEN 'architecte' THEN 2
    WHEN 'gardien'    THEN 2
    WHEN 'batisseur'  THEN 3
    WHEN 'signal'     THEN 5
    ELSE 5
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── FONCTION PRINCIPALE : CRÉER LES TÂCHES DU JOUR ─────────

CREATE OR REPLACE FUNCTION create_daily_tasks_for_subscription(p_subscription_id UUID)
RETURNS void AS $$
DECLARE
  v_rank TEXT;
  v_tasks task_type[];
  v_task task_type;
BEGIN
  SELECT rank INTO v_rank FROM subscriptions WHERE id = p_subscription_id AND status = 'active';
  IF NOT FOUND THEN RETURN; END IF;

  v_tasks := get_required_tasks(v_rank);

  FOREACH v_task IN ARRAY v_tasks LOOP
    INSERT INTO daily_tasks (subscription_id, advertiser_id, task_type, task_date)
    SELECT p_subscription_id, advertiser_id, v_task, CURRENT_DATE
    FROM subscriptions WHERE id = p_subscription_id
    ON CONFLICT (subscription_id, task_type, task_date) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Créer les tâches pour TOUS les abonnements actifs du jour
CREATE OR REPLACE FUNCTION create_all_daily_tasks()
RETURNS void AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  FOR v_sub_id IN
    SELECT id FROM subscriptions WHERE status = 'active'
  LOOP
    PERFORM create_daily_tasks_for_subscription(v_sub_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─── FONCTION : COMPLÉTER UNE TÂCHE + PUBLIER SUR LE FIL ─────

CREATE OR REPLACE FUNCTION complete_task(
  p_task_id         UUID,
  p_proof_text      TEXT DEFAULT NULL,
  p_proof_url       TEXT DEFAULT NULL,
  p_proof_platform  TEXT DEFAULT NULL,
  p_target_slot_x   INT DEFAULT NULL,
  p_target_slot_y   INT DEFAULT NULL,
  p_target_name     TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_task        daily_tasks%ROWTYPE;
  v_sub         subscriptions%ROWTYPE;
  v_action      community_action_type;
  v_content     TEXT;
BEGIN
  -- Récupérer la tâche
  SELECT * INTO v_task FROM daily_tasks WHERE id = p_task_id AND completed = false;
  IF NOT FOUND THEN RETURN; END IF;

  -- Marquer comme complétée
  UPDATE daily_tasks SET
    completed = true,
    completed_at = now(),
    proof_text = p_proof_text,
    proof_url = p_proof_url,
    proof_platform = p_proof_platform,
    target_slot_x = p_target_slot_x,
    target_slot_y = p_target_slot_y,
    target_name = p_target_name
  WHERE id = p_task_id;

  -- Récupérer l'abonnement
  SELECT * INTO v_sub FROM subscriptions WHERE id = v_task.subscription_id;

  -- Vérifier si toutes les tâches du jour sont complétées → mettre à jour le streak
  IF NOT EXISTS (
    SELECT 1 FROM daily_tasks
    WHERE subscription_id = v_task.subscription_id
      AND task_date = v_task.task_date
      AND completed = false
  ) THEN
    UPDATE subscriptions SET
      tasks_streak = tasks_streak + 1,
      tasks_missed_days = 0,
      last_task_date = v_task.task_date,
      updated_at = now()
    WHERE id = v_task.subscription_id;
  END IF;

  -- Publier sur le fil communautaire
  v_action := CASE v_task.task_type
    WHEN 'share_grid'        THEN 'share'::community_action_type
    WHEN 'highlight_neighbor' THEN 'highlight'::community_action_type
    WHEN 'create_content'    THEN 'share'::community_action_type
    WHEN 'welcome_member'    THEN 'welcome'::community_action_type
    WHEN 'recommend_members' THEN 'recommend'::community_action_type
    WHEN 'offer_advantage'   THEN 'advantage'::community_action_type
    ELSE 'share'::community_action_type
  END;

  v_content := COALESCE(p_proof_text, 'Action accomplie aujourd''hui');

  INSERT INTO community_feed (
    advertiser_id, subscription_id, action_type, rank,
    content_text, proof_url, platform,
    featured_slot_x, featured_slot_y, featured_name
  ) VALUES (
    v_task.advertiser_id, v_task.subscription_id, v_action, v_sub.rank,
    v_content, p_proof_url, p_proof_platform,
    p_target_slot_x, p_target_slot_y, p_target_name
  );
END;
$$ LANGUAGE plpgsql;

-- ─── BRIQUE 4 : CRON SUSPENSION AUTOMATIQUE ──────────────────

CREATE OR REPLACE FUNCTION run_daily_suspension_check()
RETURNS JSONB AS $$
DECLARE
  v_sub         subscriptions%ROWTYPE;
  v_threshold   INT;
  v_suspended   INT := 0;
  v_reminded    INT := 0;
  v_tasks_today INT;
BEGIN
  FOR v_sub IN
    SELECT * FROM subscriptions WHERE status = 'active' AND rank != 'elu'
  LOOP
    v_threshold := get_suspension_threshold(v_sub.rank);

    -- Vérifier si des tâches ont été faites aujourd'hui
    SELECT COUNT(*) INTO v_tasks_today
    FROM daily_tasks
    WHERE subscription_id = v_sub.id
      AND task_date = CURRENT_DATE
      AND completed = true;

    -- Si aucune tâche faite et que le seuil est dépassé → suspendre
    IF v_tasks_today = 0 THEN
      -- Incrémenter missed_days
      UPDATE subscriptions SET
        tasks_missed_days = tasks_missed_days + 1,
        updated_at = now()
      WHERE id = v_sub.id;

      -- Vérifier le nouveau total
      SELECT tasks_missed_days INTO v_sub.tasks_missed_days
      FROM subscriptions WHERE id = v_sub.id;

      IF v_sub.tasks_missed_days >= v_threshold THEN
        -- SUSPENSION
        UPDATE subscriptions SET
          status = 'suspended',
          suspended_at = now(),
          updated_at = now()
        WHERE id = v_sub.id;

        -- Griser le slot dans les bookings
        UPDATE bookings SET
          status = 'suspended'
        WHERE id = v_sub.booking_id;

        -- Log
        INSERT INTO suspension_log (subscription_id, advertiser_id, reason, missed_days)
        VALUES (v_sub.id, v_sub.advertiser_id, 'tasks_missed_' || v_sub.tasks_missed_days || 'd', v_sub.tasks_missed_days);

        v_suspended := v_suspended + 1;
      ELSE
        v_reminded := v_reminded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'suspended', v_suspended,
    'reminded', v_reminded
  );
END;
$$ LANGUAGE plpgsql;

-- ─── FONCTION : RÉACTIVER UN ABONNEMENT SUSPENDU ─────────────

CREATE OR REPLACE FUNCTION reactivate_subscription(p_subscription_id UUID, p_by TEXT DEFAULT 'user')
RETURNS void AS $$
BEGIN
  UPDATE subscriptions SET
    status = 'active',
    suspended_at = NULL,
    tasks_missed_days = 0,
    updated_at = now()
  WHERE id = p_subscription_id AND status = 'suspended';

  UPDATE bookings SET status = 'active'
  WHERE id = (SELECT booking_id FROM subscriptions WHERE id = p_subscription_id);

  UPDATE suspension_log SET
    reactivated_at = now(),
    reactivated_by = p_by
  WHERE subscription_id = p_subscription_id AND reactivated_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ─── VUE : DASHBOARD MEMBRE ───────────────────────────────────

CREATE OR REPLACE VIEW member_dashboard AS
SELECT
  s.id,
  s.advertiser_id,
  s.slot_x,
  s.slot_y,
  s.tier,
  s.rank,
  s.status,
  s.price_cents_per_day,
  s.tasks_streak,
  s.tasks_missed_days,
  s.last_task_date,
  s.started_at,
  s.suspended_at,
  get_suspension_threshold(s.rank) AS suspension_threshold,
  get_suspension_threshold(s.rank) - s.tasks_missed_days AS days_before_suspension,
  -- Tâches du jour
  (
    SELECT COUNT(*) FROM daily_tasks dt
    WHERE dt.subscription_id = s.id AND dt.task_date = CURRENT_DATE AND dt.completed = true
  ) AS tasks_done_today,
  (
    SELECT COUNT(*) FROM daily_tasks dt
    WHERE dt.subscription_id = s.id AND dt.task_date = CURRENT_DATE
  ) AS tasks_total_today,
  -- Nombre d'amplifications générées
  (SELECT COUNT(*) FROM community_feed cf WHERE cf.subscription_id = s.id) AS total_amplifications,
  a.display_name,
  a.email
FROM subscriptions s
JOIN advertisers a ON a.id = s.advertiser_id;

-- ─── VUE : FIL COMMUNAUTAIRE ENRICHI ─────────────────────────

CREATE OR REPLACE VIEW community_feed_enriched AS
SELECT
  cf.*,
  a.display_name       AS author_name,
  a.logo_url           AS author_logo,
  fa.display_name      AS featured_display_name
FROM community_feed cf
JOIN advertisers a ON a.id = cf.advertiser_id
LEFT JOIN advertisers fa ON fa.id = cf.featured_advertiser_id
ORDER BY cf.created_at DESC;

-- ─── RLS ──────────────────────────────────────────────────────

ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_feed   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspension_log   ENABLE ROW LEVEL SECURITY;

-- Subscriptions : lecture publique, écriture service_role
CREATE POLICY "Subscriptions viewable by all"  ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Subscriptions write service"    ON subscriptions FOR INSERT WITH CHECK (false);
CREATE POLICY "Subscriptions update service"   ON subscriptions FOR UPDATE USING (false);

-- Tâches : visibles par tous, modifiables par le propriétaire via service_role
CREATE POLICY "Tasks viewable by all"   ON daily_tasks FOR SELECT USING (true);
CREATE POLICY "Tasks write service"     ON daily_tasks FOR INSERT WITH CHECK (false);
CREATE POLICY "Tasks update service"    ON daily_tasks FOR UPDATE USING (false);

-- Fil communautaire : lecture publique
CREATE POLICY "Feed viewable by all"    ON community_feed FOR SELECT USING (true);
CREATE POLICY "Feed write service"      ON community_feed FOR INSERT WITH CHECK (false);
CREATE POLICY "Likes viewable by all"   ON community_likes FOR SELECT USING (true);
CREATE POLICY "Likes write service"     ON community_likes FOR INSERT WITH CHECK (false);

-- Suspension log : service_role only
CREATE POLICY "Suspension log service"  ON suspension_log FOR SELECT USING (false);

-- ─── REALTIME ─────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE community_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- ============================================================
-- ✅ MIGRATION 020 TERMINÉE
--
-- Tables créées :
--   • subscriptions       — abonnements journaliers annulables
--   • daily_tasks         — tâches quotidiennes par rang
--   • community_feed      — fil communautaire des amplifications
--   • community_likes     — likes sur le fil
--   • suspension_log      — historique des suspensions
--
-- Fonctions :
--   • get_rank_from_tier()           — tier → rang
--   • get_required_tasks()           — rang → liste de tâches
--   • get_suspension_threshold()     — rang → seuil en jours
--   • create_daily_tasks_for_subscription() — génère les tâches du jour
--   • create_all_daily_tasks()       — cron matin (toutes les subs)
--   • complete_task()                — valider une tâche + publier sur le fil
--   • run_daily_suspension_check()   — cron soir (suspensions)
--   • reactivate_subscription()      — réactiver après suspension
--
-- Vues :
--   • member_dashboard      — cockpit complet du membre
--   • community_feed_enriched — fil enrichi avec noms
-- ============================================================
