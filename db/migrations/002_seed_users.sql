-- Seed allowlisted users. Learner nickname only — no last name, DOB, or school ID.

INSERT INTO engine.subject (id, name) VALUES
  ('math', 'Math'),
  ('science', 'Science'),
  ('ela', 'Reading'),
  ('religion', 'Religion')
ON CONFLICT (id) DO NOTHING;

INSERT INTO engine.learner (id, nickname, grade_enrolled)
VALUES ('11111111-1111-1111-1111-111111111111', 'Mae', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO engine.app_user (email, role, learner_id, display_name)
VALUES
  ('mae.woeste@gmail.com', 'student', '11111111-1111-1111-1111-111111111111', 'Mae'),
  ('kevinw@mcsteen.com', 'admin', NULL, 'Kevin'),
  ('woeste.kevin@gmail.com', 'admin', NULL, 'Kevin'),
  ('molly.woeste@gmail.com', 'admin', NULL, 'Molly')
ON CONFLICT (email) DO NOTHING;

INSERT INTO engine.engine_config (version, json, created_by, active)
VALUES (
  'v1',
  '{"mastery_threshold":0.9,"zone_low":0.7,"zone_high":0.95,"set_point":0.82,"weekly_xp_goal":600,"bible_translation":"NABRE"}'::jsonb,
  'seed',
  true
)
ON CONFLICT (version) DO NOTHING;
