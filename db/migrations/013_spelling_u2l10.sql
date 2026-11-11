-- 013: Middle Ages spelling list (CKLA Grade 4 Unit 2 Lesson 10).
-- No test date yet: test_date may be null, and a null date keeps the list pinned
-- until an admin sets one at /admin/upcoming-tests or /admin/spelling.
-- Apply with the owner (DATABASE_URL). Safe to re-run.

BEGIN;

ALTER TABLE planner.upcoming_test ALTER COLUMN test_date DROP NOT NULL;

ALTER TABLE planner.upcoming_test DROP CONSTRAINT IF EXISTS upcoming_test_check;
ALTER TABLE planner.upcoming_test DROP CONSTRAINT IF EXISTS upcoming_test_dates;
ALTER TABLE planner.upcoming_test
  ADD CONSTRAINT upcoming_test_dates CHECK (test_date IS NULL OR start_date <= test_date);

INSERT INTO planner.upcoming_test (id, kind, ref_id, title, start_date, test_date, updated_by) VALUES
  ('spelling-u2l10', 'spelling', 'spelling-u2l10', 'Spelling: Middle Ages words (Unit 2, Lesson 10)', '2026-11-11', NULL, 'migration')
ON CONFLICT (id) DO NOTHING;

COMMIT;
