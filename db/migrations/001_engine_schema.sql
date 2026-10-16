-- Mae Site engine schema, roles, RLS, and projections.
-- Apply with the migrator role. Never use migrator at runtime.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS engine;
CREATE SCHEMA IF NOT EXISTS student_api;
CREATE SCHEMA IF NOT EXISTS admin_api;

DO $$ BEGIN
  CREATE TYPE engine.app_role AS ENUM ('student', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engine.mastery_state AS ENUM ('not_started', 'missing', 'in_progress', 'mastered', 'review_due', 'rusty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS engine.learner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  grade_enrolled smallint,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine.app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  role engine.app_role NOT NULL,
  learner_id uuid REFERENCES engine.learner(id),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

CREATE TABLE IF NOT EXISTS engine.auth_session (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES engine.app_user(id),
  role engine.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent_hash text,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS engine.subject (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS engine.concept (
  id text PRIMARY KEY,
  subject_id text NOT NULL REFERENCES engine.subject(id),
  title_kid text NOT NULL,
  title_admin text,
  standard_codes text[] NOT NULL DEFAULT '{}',
  milestone_level numeric(3,1) NOT NULL,
  kind text NOT NULL,
  bkt_params jsonb,
  mastery_rule jsonb,
  efficient_strategies text[],
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS engine.prerequisite_edge (
  from_concept text NOT NULL REFERENCES engine.concept(id),
  to_concept text NOT NULL REFERENCES engine.concept(id),
  strength text NOT NULL CHECK (strength IN ('hard', 'soft')),
  weight real NOT NULL DEFAULT 1,
  cross_subject boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_concept, to_concept)
);

CREATE TABLE IF NOT EXISTS engine.chapter (
  id text PRIMARY KEY,
  book text NOT NULL,
  number int NOT NULL,
  title_kid text NOT NULL,
  unit text,
  ordering int NOT NULL,
  media_key text,
  is_review_chapter boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS engine.activity (
  id text PRIMARY KEY,
  type text NOT NULL,
  chapter_id text REFERENCES engine.chapter(id),
  game_id text,
  content_ref text,
  est_minutes real
);

CREATE TABLE IF NOT EXISTS engine.item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  activity_id text REFERENCES engine.activity(id),
  response_type text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer_key jsonb NOT NULL,
  distractor_map jsonb,
  difficulty_elo real NOT NULL DEFAULT 0,
  n_options smallint,
  time_ref_sec real,
  theme text,
  retired boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS engine.session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  device text,
  entry_point text,
  resume_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  engaged_seconds int NOT NULL DEFAULT 0,
  idle_seconds int NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS engine.interaction_event (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES engine.session(id),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  seq int NOT NULL,
  client_ts timestamptz,
  server_ts timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  item_id uuid,
  activity_id text,
  attempt_no smallint,
  response jsonb,
  is_correct boolean,
  latency_ms int,
  hint_level smallint,
  payload jsonb,
  is_preview boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS interaction_event_learner_ts ON engine.interaction_event (learner_id, server_ts);
CREATE INDEX IF NOT EXISTS interaction_event_item ON engine.interaction_event (item_id);

CREATE TABLE IF NOT EXISTS engine.strategy_observation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES engine.interaction_event(id),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  concept_id text REFERENCES engine.concept(id),
  strategy text NOT NULL,
  source text NOT NULL,
  confidence real,
  misconception text,
  features jsonb,
  is_correct boolean
);

CREATE TABLE IF NOT EXISTS engine.mastery_estimate (
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  concept_id text NOT NULL REFERENCES engine.concept(id),
  p_mastery real NOT NULL,
  theta real NOT NULL,
  theta_n int NOT NULL DEFAULT 0,
  state engine.mastery_state NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  correct_unhinted int NOT NULL DEFAULT 0,
  gate_passed_at timestamptz,
  last_practiced_at timestamptz,
  efficient_strategy_rate real,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, concept_id)
);

CREATE TABLE IF NOT EXISTS engine.mastery_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  concept_id text NOT NULL,
  snapshot jsonb NOT NULL,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine.review_schedule (
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  target_type text NOT NULL,
  target_id text NOT NULL,
  box smallint NOT NULL,
  due_at timestamptz NOT NULL,
  last_result text,
  lapses int NOT NULL DEFAULT 0,
  PRIMARY KEY (learner_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS engine.interest_signal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  interest_tag text NOT NULL,
  signal_type text NOT NULL,
  value real,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine.xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  session_id uuid NOT NULL,
  minute_start timestamptz NOT NULL,
  xp int NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, minute_start)
);

CREATE TABLE IF NOT EXISTS engine.adaptation_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL,
  reason_code text NOT NULL,
  inputs jsonb,
  config_version text
);

CREATE TABLE IF NOT EXISTS engine.affect_signal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  session_id uuid,
  ts timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  severity smallint NOT NULL,
  evidence jsonb
);

CREATE TABLE IF NOT EXISTS engine.engine_config (
  version text PRIMARY KEY,
  json jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS engine.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  role text NOT NULL,
  route text NOT NULL,
  method text NOT NULL,
  status int NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  detail text
);

CREATE TABLE IF NOT EXISTS engine.gate_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  scope text NOT NULL,
  scope_id text NOT NULL,
  item_ids uuid[],
  score real,
  passed boolean,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- Student-safe projections
CREATE OR REPLACE VIEW student_api.progress_rings AS
SELECT
  s.learner_id,
  c.id AS chapter_id,
  (ROUND(5 * FLOOR(COALESCE((s.resume_state->>'ring_pct')::numeric, 0) / 5)))::int AS ring_pct,
  COALESCE((s.resume_state->>'review_done_today')::boolean, false) AS review_done_today
FROM engine.session s
LEFT JOIN engine.chapter c ON c.id = s.resume_state->>'chapter_id';

CREATE OR REPLACE VIEW student_api.xp_summary AS
SELECT
  learner_id,
  SUM(xp) AS xp_total,
  SUM(xp) FILTER (WHERE minute_start >= date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York') AS xp_today,
  COUNT(DISTINCT date_trunc('day', minute_start AT TIME ZONE 'America/New_York')) AS days_streak
FROM engine.xp_ledger
GROUP BY learner_id;

CREATE OR REPLACE VIEW student_api.my_likes AS
SELECT learner_id, interest_tag, (value > 0) AS liked
FROM engine.interest_signal
WHERE signal_type IN ('picker_like', 'picker_unlike');

CREATE OR REPLACE VIEW student_api.resume_point AS
SELECT learner_id, resume_state->>'activity_id' AS activity_id, resume_state->>'title_kid' AS title_kid
FROM engine.session
WHERE ended_at IS NULL;

CREATE OR REPLACE VIEW admin_api.mastery_map AS
SELECT * FROM engine.mastery_estimate;

CREATE OR REPLACE VIEW admin_api.wrong_answers AS
SELECT
  e.server_ts AS ts,
  e.learner_id,
  e.item_id,
  e.response,
  e.is_correct,
  e.hint_level,
  e.latency_ms,
  so.strategy,
  so.source AS strategy_source,
  so.confidence AS strategy_confidence,
  so.misconception
FROM engine.interaction_event e
LEFT JOIN engine.strategy_observation so ON so.event_id = e.id
WHERE e.type = 'answer_submitted' AND e.is_correct = false;

CREATE OR REPLACE VIEW admin_api.time_daily AS
SELECT learner_id, date_trunc('day', started_at AT TIME ZONE 'America/New_York') AS day_et, SUM(engaged_seconds) AS engaged, SUM(idle_seconds) AS idle
FROM engine.session
GROUP BY 1, 2;

CREATE OR REPLACE VIEW admin_api.trend_weekly AS
SELECT learner_id, date_trunc('week', updated_at AT TIME ZONE 'America/New_York') AS week_et, AVG(p_mastery) AS avg_p
FROM engine.mastery_estimate
GROUP BY 1, 2;

CREATE OR REPLACE VIEW admin_api.affect_daily AS
SELECT learner_id, date_trunc('day', ts AT TIME ZONE 'America/New_York') AS day_et, kind, COUNT(*) AS n
FROM engine.affect_signal
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW admin_api.interest_graph AS
SELECT learner_id, interest_tag, SUM(value) AS score
FROM engine.interest_signal
GROUP BY 1, 2;

CREATE OR REPLACE VIEW admin_api.gate_history AS
SELECT * FROM engine.gate_attempt;

CREATE OR REPLACE VIEW admin_api.decisions AS
SELECT * FROM engine.adaptation_decision;

CREATE OR REPLACE VIEW admin_api.strategy_log AS
SELECT * FROM engine.strategy_observation;

-- Roles
DO $$ BEGIN
  CREATE ROLE app_student LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE app_admin LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE app_writer_events LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE assistant_ro LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE migrator LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER ROLE assistant_ro SET default_transaction_read_only = on;
ALTER ROLE assistant_ro SET statement_timeout = '10s';

REVOKE ALL ON SCHEMA engine FROM PUBLIC;
REVOKE ALL ON SCHEMA student_api FROM PUBLIC;
REVOKE ALL ON SCHEMA admin_api FROM PUBLIC;
REVOKE ALL ON SCHEMA admin_api FROM app_student;
REVOKE ALL ON SCHEMA engine FROM app_student;

GRANT USAGE ON SCHEMA student_api TO app_student;
GRANT SELECT ON ALL TABLES IN SCHEMA student_api TO app_student;
GRANT USAGE ON SCHEMA admin_api TO app_admin, assistant_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA admin_api TO app_admin, assistant_ro;
GRANT USAGE ON SCHEMA engine TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA engine TO app_admin;
GRANT INSERT ON engine.interaction_event TO app_writer_events;

REVOKE ALL ON engine.auth_session FROM assistant_ro;
REVOKE ALL ON engine.app_user FROM assistant_ro;
REVOKE ALL ON SCHEMA engine FROM assistant_ro;

-- RLS
ALTER TABLE engine.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.interaction_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.mastery_estimate ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.interest_signal ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.strategy_observation ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.affect_signal ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.gate_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.mastery_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learner_isolation_session ON engine.session;
CREATE POLICY learner_isolation_session ON engine.session
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_events ON engine.interaction_event;
CREATE POLICY learner_isolation_events ON engine.interaction_event
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_mastery ON engine.mastery_estimate;
CREATE POLICY learner_isolation_mastery ON engine.mastery_estimate
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_review ON engine.review_schedule;
CREATE POLICY learner_isolation_review ON engine.review_schedule
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_interest ON engine.interest_signal;
CREATE POLICY learner_isolation_interest ON engine.interest_signal
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_xp ON engine.xp_ledger;
CREATE POLICY learner_isolation_xp ON engine.xp_ledger
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_strategy ON engine.strategy_observation;
CREATE POLICY learner_isolation_strategy ON engine.strategy_observation
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_affect ON engine.affect_signal;
CREATE POLICY learner_isolation_affect ON engine.affect_signal
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_gate ON engine.gate_attempt;
CREATE POLICY learner_isolation_gate ON engine.gate_attempt
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

DROP POLICY IF EXISTS learner_isolation_history ON engine.mastery_history;
CREATE POLICY learner_isolation_history ON engine.mastery_history
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);

CREATE OR REPLACE FUNCTION student_api.record_events(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = engine, pg_temp
AS $$
BEGIN
  -- Placeholder body; the Node API writes through role-scoped connections.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION student_api.next_item()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = engine, pg_temp
AS $$
BEGIN
  RETURN '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION student_api.save_likes(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = engine, pg_temp
AS $$
BEGIN
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION student_api.record_events(jsonb) TO app_student;
GRANT EXECUTE ON FUNCTION student_api.next_item() TO app_student;
GRANT EXECUTE ON FUNCTION student_api.save_likes(jsonb) TO app_student;
