-- P7: a parent can give a chapter's star without the 90% gate. Recorded as a passed gate attempt
-- with who and why, so history shows it was an override and not a score.
ALTER TABLE engine.gate_attempt ADD COLUMN IF NOT EXISTS override_by text;
ALTER TABLE engine.gate_attempt ADD COLUMN IF NOT EXISTS override_reason text;

CREATE OR REPLACE VIEW admin_api.gate_history AS
SELECT * FROM engine.gate_attempt;

GRANT SELECT ON admin_api.gate_history TO app_admin, assistant_ro;
GRANT SELECT, INSERT ON engine.gate_attempt TO app_admin;
