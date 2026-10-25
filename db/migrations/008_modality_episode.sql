-- 008: one row per re-teach "modality episode": which way Mae was re-taught an item (watch recap,
-- careful read, or straight retry), how it was chosen (Thompson sample or exploration), and whether
-- the next answer on that item was a first-try, unhinted success. Feeds "How Mae learns best".
-- Apply after 007 with the owner (DATABASE_URL). Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS engine.modality_episode (
  id uuid PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  item_id text NOT NULL,
  concept_id text NOT NULL,
  subject text NOT NULL,
  context text NOT NULL CHECK (context IN ('reteach')),
  modality text NOT NULL CHECK (modality IN ('watch', 'read', 'retry')),
  chosen_by text NOT NULL CHECK (chosen_by IN ('thompson', 'explore', 'only_option')),
  samples jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  success boolean
);

CREATE INDEX IF NOT EXISTS modality_episode_open_idx ON engine.modality_episode (learner_id, item_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS modality_episode_subject_idx ON engine.modality_episode (learner_id, subject, modality);

ALTER TABLE engine.modality_episode ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_own_rows ON engine.modality_episode;
DROP POLICY IF EXISTS admin_all_rows ON engine.modality_episode;
CREATE POLICY student_own_rows ON engine.modality_episode TO app_student
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid)
  WITH CHECK (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);
CREATE POLICY admin_all_rows ON engine.modality_episode TO app_admin USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON engine.modality_episode TO app_student;
GRANT SELECT ON engine.modality_episode TO app_admin;

CREATE OR REPLACE VIEW admin_api.modality_episodes AS SELECT * FROM engine.modality_episode;
GRANT SELECT ON admin_api.modality_episodes TO app_admin, assistant_ro;

COMMIT;
