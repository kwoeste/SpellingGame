-- 012: Social studies open-book test (Ohio's Native American tribes) on Tue Nov 3 2026. Safe to re-run.
INSERT INTO planner.upcoming_test (id, kind, ref_id, title, start_date, test_date) VALUES
  ('ss.ohio-tribes-2026-11-03', 'practice-test', 'ss.ohio-tribes', 'Social Studies: Ohio''s Native American Tribes', '2026-11-02', '2026-11-03')
ON CONFLICT (id) DO NOTHING;
