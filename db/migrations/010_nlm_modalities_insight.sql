-- 010: NotebookLM modalities (video, podcast, flashcards) in the modality chooser, first-teach
-- episodes, follow-up timing / rush flags on every episode, and a weekly Grok "how Mae learns best"
-- insight. The insight row holds only aggregated, de-identified stats and the model's short
-- summary (no names, emails, or anything she typed). Apply after 009 with the owner. Safe to re-run.

BEGIN;

ALTER TABLE engine.modality_episode DROP CONSTRAINT IF EXISTS modality_episode_context_check;
ALTER TABLE engine.modality_episode ADD CONSTRAINT modality_episode_context_check CHECK (context IN ('reteach', 'first_teach'));
ALTER TABLE engine.modality_episode DROP CONSTRAINT IF EXISTS modality_episode_modality_check;
ALTER TABLE engine.modality_episode ADD CONSTRAINT modality_episode_modality_check
  CHECK (modality IN ('watch', 'read', 'retry', 'nlm_video', 'nlm_podcast', 'nlm_flashcards'));
ALTER TABLE engine.modality_episode DROP CONSTRAINT IF EXISTS modality_episode_chosen_by_check;
ALTER TABLE engine.modality_episode ADD CONSTRAINT modality_episode_chosen_by_check CHECK (chosen_by IN ('thompson', 'explore', 'only_option'));
ALTER TABLE engine.modality_episode ADD COLUMN IF NOT EXISTS followup_latency_ms integer;
ALTER TABLE engine.modality_episode ADD COLUMN IF NOT EXISTS followup_rushed boolean;

CREATE TABLE IF NOT EXISTS engine.learning_insight (
  id uuid PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES engine.learner(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  trigger text NOT NULL CHECK (trigger IN ('weekly', 'admin')),
  source text NOT NULL CHECK (source IN ('ai', 'deterministic')),
  model text,
  stats jsonb NOT NULL,
  summary text NOT NULL CHECK (length(summary) <= 800),
  confidence text NOT NULL CHECK (length(confidence) <= 300),
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by text
);

CREATE INDEX IF NOT EXISTS learning_insight_latest_idx ON engine.learning_insight (learner_id, created_at DESC);

ALTER TABLE engine.learning_insight ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_own_rows ON engine.learning_insight;
DROP POLICY IF EXISTS admin_all_rows ON engine.learning_insight;
CREATE POLICY student_own_rows ON engine.learning_insight FOR SELECT TO app_student
  USING (learner_id = NULLIF(current_setting('app.learner_id', true), '')::uuid);
CREATE POLICY admin_all_rows ON engine.learning_insight TO app_admin USING (true) WITH CHECK (true);

-- Students only read the latest weights (chooser prior, planner hint); admins write.
GRANT SELECT ON engine.learning_insight TO app_student;
GRANT SELECT, INSERT ON engine.learning_insight TO app_admin;

CREATE OR REPLACE VIEW admin_api.modality_episodes AS SELECT * FROM engine.modality_episode;
CREATE OR REPLACE VIEW admin_api.learning_insights AS SELECT * FROM engine.learning_insight;
GRANT SELECT ON admin_api.learning_insights TO app_admin, assistant_ro;

COMMIT;
