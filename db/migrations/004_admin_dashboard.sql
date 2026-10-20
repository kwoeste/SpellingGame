-- 004: parent-dashboard tables and admin_api views.
-- Apply after 003 with the owner (DATABASE_URL). Safe to re-run.
--
-- Adds assignments (manual + auto hole-fill), per-learner goals, and
-- analytics views used by /admin and /api/admin. RLS matches 003:
--   app_student sees only rows for app.learner_id
--   app_admin sees every learner
--   assistant_ro stays SELECT-only on admin_api
--   app_student has no privileges on admin_api

BEGIN;

CREATE TABLE IF NOT EXISTS engine.assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  kind text NOT NULL CHECK (kind IN ('manual', 'hole_fill')),
  target_type text NOT NULL CHECK (target_type IN ('concept', 'chapter', 'game')),
  target_id text NOT NULL,
  title text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused', 'done', 'cancelled')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS assignment_one_open
  ON engine.assignment (learner_id, kind, target_type, target_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS assignment_learner_status ON engine.assignment (learner_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS engine.learner_goal (
  learner_id uuid PRIMARY KEY REFERENCES engine.learner(id),
  weekly_xp_goal int NOT NULL DEFAULT 600 CHECK (weekly_xp_goal BETWEEN 60 AND 3000),
  daily_minutes_goal int NOT NULL DEFAULT 15 CHECK (daily_minutes_goal BETWEEN 5 AND 180),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL
);

ALTER TABLE engine.assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.learner_goal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_own_rows ON engine.assignment;
DROP POLICY IF EXISTS admin_all_rows ON engine.assignment;
CREATE POLICY student_own_rows ON engine.assignment TO app_student
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid)
  WITH CHECK (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);
CREATE POLICY admin_all_rows ON engine.assignment TO app_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS student_own_rows ON engine.learner_goal;
DROP POLICY IF EXISTS admin_all_rows ON engine.learner_goal;
CREATE POLICY student_own_rows ON engine.learner_goal TO app_student
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid)
  WITH CHECK (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);
CREATE POLICY admin_all_rows ON engine.learner_goal TO app_admin USING (true) WITH CHECK (true);

GRANT SELECT ON engine.assignment TO app_student;
GRANT SELECT, INSERT, UPDATE ON engine.assignment TO app_admin;
GRANT SELECT ON engine.learner_goal TO app_student;
GRANT SELECT, INSERT, UPDATE ON engine.learner_goal TO app_admin;
GRANT SELECT, INSERT ON engine.strategy_observation TO app_student;

-- Richer admin projections (owner-rights so assistant_ro can read them).
CREATE OR REPLACE VIEW admin_api.mastery_map AS
SELECT
  m.learner_id,
  m.concept_id,
  m.p_mastery,
  m.theta,
  m.theta_n,
  m.state,
  m.attempts,
  m.correct_unhinted,
  m.gate_passed_at,
  m.last_practiced_at,
  m.efficient_strategy_rate,
  m.updated_at,
  r.due_at AS review_due_at,
  r.box AS review_box,
  r.lapses AS review_lapses,
  r.last_result AS review_last_result
FROM engine.mastery_estimate m
LEFT JOIN engine.review_schedule r
  ON r.learner_id = m.learner_id
 AND r.target_type = 'concept'
 AND r.target_id = m.concept_id;

-- Column order/types differ from 003; CREATE OR REPLACE cannot change them.
DROP VIEW IF EXISTS admin_api.wrong_answers;
CREATE OR REPLACE VIEW admin_api.wrong_answers AS
SELECT
  e.id AS event_id,
  e.server_ts AS ts,
  e.learner_id,
  e.session_id,
  e.item_id,
  e.response,
  e.is_correct,
  e.attempt_no,
  e.hint_level,
  e.latency_ms,
  e.payload,
  so.strategy,
  so.source AS strategy_source,
  so.confidence AS strategy_confidence,
  so.misconception
FROM engine.interaction_event e
LEFT JOIN LATERAL (
  SELECT s.strategy, s.source, s.confidence, s.misconception
  FROM engine.strategy_observation s
  WHERE s.event_id = e.id
  ORDER BY CASE s.source WHEN 'admin_label' THEN 0 ELSE 1 END, s.id DESC
  LIMIT 1
) so ON true
WHERE e.type = 'answer_submitted' AND e.is_correct = false AND NOT e.is_preview;

CREATE OR REPLACE VIEW admin_api.strategy_log AS
SELECT
  so.id,
  so.event_id,
  so.learner_id,
  so.concept_id,
  so.strategy,
  so.source,
  so.confidence,
  so.misconception,
  so.features,
  so.is_correct,
  e.server_ts AS ts,
  e.item_id,
  e.hint_level,
  e.latency_ms
FROM engine.strategy_observation so
LEFT JOIN engine.interaction_event e ON e.id = so.event_id;

CREATE OR REPLACE VIEW admin_api.session_history AS
SELECT
  s.id,
  s.learner_id,
  s.started_at,
  s.last_event_at,
  s.ended_at,
  s.entry_point,
  s.engaged_seconds,
  s.idle_seconds,
  s.is_preview,
  s.rolling_success,
  s.scored_count,
  (
    SELECT count(*)::int FROM engine.interaction_event e
    WHERE e.session_id = s.id AND e.type = 'answer_submitted' AND NOT e.is_preview
  ) AS items_answered,
  (
    SELECT count(*)::int FROM engine.interaction_event e
    WHERE e.session_id = s.id AND e.type = 'answer_submitted' AND e.attempt_no = 1 AND NOT e.is_preview
  ) AS first_try_total,
  (
    SELECT count(*)::int FROM engine.interaction_event e
    WHERE e.session_id = s.id AND e.type = 'answer_submitted' AND e.attempt_no = 1 AND e.is_correct AND NOT e.is_preview
  ) AS first_try_correct
FROM engine.session s
WHERE NOT s.is_preview;

CREATE OR REPLACE VIEW admin_api.accuracy_daily AS
SELECT
  learner_id,
  date_trunc('day', server_ts AT TIME ZONE 'America/New_York') AS day_et,
  count(*) FILTER (WHERE attempt_no = 1)::int AS first_try,
  count(*) FILTER (WHERE attempt_no = 1 AND is_correct)::int AS first_try_correct
FROM engine.interaction_event
WHERE type = 'answer_submitted' AND NOT is_preview
GROUP BY 1, 2;

CREATE OR REPLACE VIEW admin_api.xp_daily AS
SELECT
  learner_id,
  date_trunc('day', minute_start AT TIME ZONE 'America/New_York') AS day_et,
  sum(xp)::int AS xp,
  count(*)::int AS engaged_minutes
FROM engine.xp_ledger
GROUP BY 1, 2;

CREATE OR REPLACE VIEW admin_api.holes_open AS
SELECT *
FROM engine.assignment
WHERE kind = 'hole_fill' AND status = 'open';

CREATE OR REPLACE VIEW admin_api.assignments AS
SELECT * FROM engine.assignment;

CREATE OR REPLACE VIEW admin_api.learner_goals AS
SELECT * FROM engine.learner_goal;

-- Column order/types differ from 003; CREATE OR REPLACE cannot change them.
DROP VIEW IF EXISTS admin_api.time_daily;
CREATE OR REPLACE VIEW admin_api.time_daily AS
SELECT
  learner_id,
  date_trunc('day', started_at AT TIME ZONE 'America/New_York') AS day_et,
  sum(engaged_seconds)::int AS engaged,
  sum(idle_seconds)::int AS idle
FROM engine.session
WHERE NOT is_preview
GROUP BY 1, 2;

REVOKE ALL ON SCHEMA admin_api FROM PUBLIC;
REVOKE ALL ON SCHEMA admin_api FROM app_student;
GRANT USAGE ON SCHEMA admin_api TO app_admin, assistant_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA admin_api TO app_admin, assistant_ro;

COMMIT;
