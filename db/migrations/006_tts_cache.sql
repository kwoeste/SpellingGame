-- 006: Grok (xAI) text-to-speech cache and per-user daily character tally.
-- Lives in its own schema so app_student (which has no access to engine.*) can use it.
-- The cache holds only lesson text audio, keyed by sha256(model|voice|speed|text); no personal data.
-- Usage rows key users by a truncated sha256 of their email. Apply with the owner (DATABASE_URL). Safe to re-run.

BEGIN;

CREATE SCHEMA IF NOT EXISTS tts;
REVOKE ALL ON SCHEMA tts FROM PUBLIC;
GRANT USAGE ON SCHEMA tts TO app_student, app_admin;

CREATE TABLE IF NOT EXISTS tts.tts_cache (
  cache_key text PRIMARY KEY,
  voice text NOT NULL,
  speed numeric(3,2) NOT NULL,
  chars int NOT NULL,
  content_type text NOT NULL DEFAULT 'audio/mpeg',
  audio bytea NOT NULL,
  words jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tts.tts_usage (
  user_key text NOT NULL,
  day date NOT NULL,
  chars int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);

ALTER TABLE tts.tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts.tts_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_rw ON tts.tts_cache;
CREATE POLICY app_rw ON tts.tts_cache TO app_student, app_admin USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS app_rw ON tts.tts_usage;
CREATE POLICY app_rw ON tts.tts_usage TO app_student, app_admin USING (true) WITH CHECK (true);

-- Cache rows are insert-only (no UPDATE/DELETE for app roles).
GRANT SELECT, INSERT ON tts.tts_cache TO app_student, app_admin;
GRANT SELECT, INSERT, UPDATE ON tts.tts_usage TO app_student, app_admin;

COMMIT;
