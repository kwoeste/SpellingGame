-- 003: make runtime persistence work with the role-scoped connections.
-- Apply after 001 and 002 with the owner (DATABASE_URL). Safe to re-run.
--
-- Access model after this migration:
--   app_student (DATABASE_URL_STUDENT): learner-scoped rows only. RLS policies key on the
--     transaction-local setting app.learner_id, which the API sets from the signed-in session.
--     Append-only on events; no DELETE anywhere; no access to app_user, auth_session,
--     engine_config, or admin_api. Can INSERT (not read) audit_log.
--   app_admin (DATABASE_URL_ADMIN): every learner's rows (explicit admin policies).
--   assistant_ro (DATABASE_URL_ASSISTANT): admin_api views only (unchanged).
--   Owner (DATABASE_URL): migrations only; bypasses RLS as table owner.

BEGIN;

-- Content items and concepts are authored in code (lib/content), so their ids are text, not FKs.
DROP VIEW IF EXISTS admin_api.wrong_answers;
DROP VIEW IF EXISTS admin_api.gate_history;
ALTER TABLE engine.interaction_event ALTER COLUMN item_id TYPE text USING item_id::text;
ALTER TABLE engine.gate_attempt ALTER COLUMN item_ids TYPE text[] USING item_ids::text[];
ALTER TABLE engine.mastery_estimate DROP CONSTRAINT IF EXISTS mastery_estimate_concept_id_fkey;
ALTER TABLE engine.strategy_observation DROP CONSTRAINT IF EXISTS strategy_observation_concept_id_fkey;

CREATE INDEX IF NOT EXISTS interaction_event_session_item ON engine.interaction_event (session_id, item_id);

-- Zone controller state survives across serverless invocations.
ALTER TABLE engine.session
  ADD COLUMN IF NOT EXISTS rolling_success real NOT NULL DEFAULT 0.82,
  ADD COLUMN IF NOT EXISTS scored_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_high int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS out_of_band int NOT NULL DEFAULT 0;

ALTER TABLE engine.adaptation_decision
  ADD COLUMN IF NOT EXISTS learner_id uuid REFERENCES engine.learner(id);
ALTER TABLE engine.adaptation_decision ENABLE ROW LEVEL SECURITY;

-- Elo item difficulty (shared across learners, bounded to seed +/- 1 in code).
CREATE TABLE IF NOT EXISTS engine.item_rating (
  item_id text PRIMARY KEY,
  difficulty real NOT NULL,
  seed real NOT NULL,
  n int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Policies: learner isolation applies to app_student only; admins see every learner.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'session', 'interaction_event', 'mastery_estimate', 'review_schedule', 'interest_signal',
    'xp_ledger', 'strategy_observation', 'affect_signal', 'gate_attempt', 'mastery_history',
    'adaptation_decision'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS learner_isolation_%s ON engine.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS student_own_rows ON engine.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_all_rows ON engine.%I', t);
    EXECUTE format(
      'CREATE POLICY student_own_rows ON engine.%I TO app_student '
      'USING (learner_id = NULLIF(current_setting(''app.learner_id'', true), '''')::uuid) '
      'WITH CHECK (learner_id = NULLIF(current_setting(''app.learner_id'', true), '''')::uuid)',
      t
    );
    EXECUTE format('CREATE POLICY admin_all_rows ON engine.%I TO app_admin USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
-- 001's policy names (other than session's) don't follow the table names.
DROP POLICY IF EXISTS learner_isolation_events ON engine.interaction_event;
DROP POLICY IF EXISTS learner_isolation_mastery ON engine.mastery_estimate;
DROP POLICY IF EXISTS learner_isolation_review ON engine.review_schedule;
DROP POLICY IF EXISTS learner_isolation_interest ON engine.interest_signal;
DROP POLICY IF EXISTS learner_isolation_xp ON engine.xp_ledger;
DROP POLICY IF EXISTS learner_isolation_strategy ON engine.strategy_observation;
DROP POLICY IF EXISTS learner_isolation_affect ON engine.affect_signal;
DROP POLICY IF EXISTS learner_isolation_gate ON engine.gate_attempt;
DROP POLICY IF EXISTS learner_isolation_history ON engine.mastery_history;

-- Grants for the student role (all subject to the policies above).
GRANT USAGE ON SCHEMA engine TO app_student;
GRANT SELECT, INSERT, UPDATE ON engine.session TO app_student;
GRANT SELECT, INSERT ON engine.interaction_event TO app_student;
GRANT SELECT, INSERT, UPDATE ON engine.mastery_estimate TO app_student;
GRANT INSERT ON engine.mastery_history TO app_student;
GRANT SELECT, INSERT, UPDATE ON engine.review_schedule TO app_student;
GRANT SELECT, INSERT ON engine.interest_signal TO app_student;
GRANT SELECT, INSERT ON engine.xp_ledger TO app_student;
GRANT SELECT, INSERT ON engine.gate_attempt TO app_student;
GRANT INSERT ON engine.adaptation_decision TO app_student;
GRANT SELECT, INSERT, UPDATE ON engine.item_rating TO app_student;
GRANT SELECT ON engine.chapter TO app_student;
GRANT INSERT ON engine.audit_log TO app_student;
REVOKE ALL ON engine.app_user, engine.auth_session, engine.engine_config FROM app_student;

GRANT SELECT, INSERT, UPDATE, DELETE ON engine.item_rating TO app_admin;

-- Identity lookup without granting app_user to the runtime roles.
CREATE OR REPLACE FUNCTION student_api.resolve_user(p_email text)
RETURNS TABLE (id uuid, email text, role engine.app_role, learner_id uuid, display_name text, disabled_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = engine, pg_temp
AS $$
  SELECT u.id, lower(u.email::text), u.role, u.learner_id, u.display_name, u.disabled_at
  FROM engine.app_user u
  WHERE lower(u.email::text) = lower(trim(p_email));
$$;
REVOKE ALL ON FUNCTION student_api.resolve_user(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA student_api TO app_admin;
GRANT EXECUTE ON FUNCTION student_api.resolve_user(text) TO app_student, app_admin;

-- Student views run with the caller's rights so RLS scopes them to the signed-in learner.
DROP VIEW IF EXISTS student_api.progress_rings;

CREATE OR REPLACE VIEW student_api.xp_summary WITH (security_invoker = true) AS
SELECT
  learner_id,
  SUM(xp) AS xp_total,
  SUM(xp) FILTER (WHERE minute_start >= date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York') AS xp_today,
  COUNT(DISTINCT date_trunc('day', minute_start AT TIME ZONE 'America/New_York')) AS days_streak
FROM engine.xp_ledger
GROUP BY learner_id;

CREATE OR REPLACE VIEW student_api.my_likes WITH (security_invoker = true) AS
SELECT DISTINCT ON (learner_id, interest_tag) learner_id, interest_tag, (value > 0) AS liked
FROM engine.interest_signal
WHERE signal_type IN ('picker_like', 'picker_unlike')
ORDER BY learner_id, interest_tag, ts DESC;

CREATE OR REPLACE VIEW student_api.resume_point WITH (security_invoker = true) AS
SELECT learner_id, resume_state->>'activity_id' AS activity_id, resume_state->>'title_kid' AS title_kid
FROM engine.session
WHERE ended_at IS NULL;

GRANT SELECT ON ALL TABLES IN SCHEMA student_api TO app_student;

-- Admin views stay owner-rights so assistant_ro can read them without base-table grants.
CREATE OR REPLACE VIEW admin_api.wrong_answers AS
SELECT
  e.server_ts AS ts,
  e.learner_id,
  e.session_id,
  e.item_id,
  e.response,
  e.is_correct,
  e.attempt_no,
  e.hint_level,
  e.latency_ms,
  so.strategy,
  so.source AS strategy_source,
  so.confidence AS strategy_confidence,
  so.misconception
FROM engine.interaction_event e
LEFT JOIN engine.strategy_observation so ON so.event_id = e.id
WHERE e.type = 'answer_submitted' AND e.is_correct = false AND NOT e.is_preview;

CREATE OR REPLACE VIEW admin_api.gate_history AS
SELECT * FROM engine.gate_attempt;

CREATE OR REPLACE VIEW admin_api.decisions AS
SELECT * FROM engine.adaptation_decision;

REVOKE ALL ON SCHEMA admin_api FROM app_student;
GRANT SELECT ON ALL TABLES IN SCHEMA admin_api TO app_admin, assistant_ro;

COMMIT;
