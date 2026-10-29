-- 011: Dated items (class tests, spelling lists) that go first in Mae's Today plan from start_date
-- through test_date. Admin edits dates at /admin/upcoming-tests. No personal data, so its own schema
-- that app_student can read. Apply with the owner (DATABASE_URL). Safe to re-run.

BEGIN;

CREATE SCHEMA IF NOT EXISTS planner;
REVOKE ALL ON SCHEMA planner FROM PUBLIC;
GRANT USAGE ON SCHEMA planner TO app_student, app_admin;

CREATE TABLE IF NOT EXISTS planner.upcoming_test (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('practice-test', 'spelling', 'chapter')),
  ref_id text NOT NULL,
  title text NOT NULL,
  start_date date NOT NULL,
  test_date date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'migration',
  CHECK (start_date <= test_date)
);

ALTER TABLE planner.upcoming_test ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_read ON planner.upcoming_test;
CREATE POLICY student_read ON planner.upcoming_test FOR SELECT TO app_student USING (true);
DROP POLICY IF EXISTS admin_all ON planner.upcoming_test;
CREATE POLICY admin_all ON planner.upcoming_test TO app_admin USING (true) WITH CHECK (true);
GRANT SELECT ON planner.upcoming_test TO app_student;
GRANT SELECT, INSERT, UPDATE, DELETE ON planner.upcoming_test TO app_admin;

INSERT INTO planner.upcoming_test (id, kind, ref_id, title, start_date, test_date) VALUES
  ('savvas.ch3-2026-10-28', 'practice-test', 'savvas.ch3', 'Science test: Living things and adaptations', '2026-10-26', '2026-10-28'),
  ('spelling-d2', 'spelling', 'spelling-d2', 'Spelling List D-2', '2026-10-29', '2026-11-06')
ON CONFLICT (id) DO NOTHING;

COMMIT;
