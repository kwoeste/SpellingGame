-- 014: Social studies test (The 13 Original Colonies) on Tue Nov 24 2026. Safe to re-run.
INSERT INTO planner.upcoming_test (id, kind, ref_id, title, start_date, test_date) VALUES
  ('ss.colonies-2026-11-24', 'practice-test', 'ss.colonies', 'Social Studies: The 13 Original Colonies', '2026-11-18', '2026-11-24')
ON CONFLICT (id) DO NOTHING;
