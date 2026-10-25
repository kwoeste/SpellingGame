-- 007: one cached "Today's plan" per learner per sign-in (login_id), deterministic or AI-ordered.
-- The plan is regenerated only on a new sign-in; ai_calls per ET day are capped in code (10).
-- Holds only candidate ids, kid-facing lines, and call counts; no names or free text from the learner.
-- Apply after 006 with the owner (DATABASE_URL). Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS engine.session_plan (
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  login_id text NOT NULL CHECK (length(login_id) <= 64),
  day date NOT NULL,
  plan jsonb NOT NULL,
  source text NOT NULL CHECK (source IN ('deterministic', 'ai')),
  ai_attempted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, login_id)
);

CREATE INDEX IF NOT EXISTS session_plan_day_idx ON engine.session_plan (learner_id, day);

ALTER TABLE engine.session_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_own_rows ON engine.session_plan;
DROP POLICY IF EXISTS admin_all_rows ON engine.session_plan;
CREATE POLICY student_own_rows ON engine.session_plan TO app_student
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid)
  WITH CHECK (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);
CREATE POLICY admin_all_rows ON engine.session_plan TO app_admin USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON engine.session_plan TO app_student;
GRANT SELECT ON engine.session_plan TO app_admin;

CREATE OR REPLACE VIEW admin_api.session_plans AS SELECT * FROM engine.session_plan;
GRANT SELECT ON admin_api.session_plans TO app_admin, assistant_ro;

COMMIT;
