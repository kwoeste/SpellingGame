#!/usr/bin/env node
/**
 * DEV / PREVIEW ONLY — synthetic admin-dashboard rows.
 *
 * This script is the only place demo parent-dashboard data is created.
 * It must never run against production Mae data.
 *
 * Required:
 *   MAE_ALLOW_DEMO_SEED=1
 *   DATABASE_URL  (owner connection; apply migrations 001-004 first)
 *
 * Refuses when:
 *   VERCEL_ENV=production
 *   MAE_ALLOW_DEMO_SEED is not exactly 1
 *   DATABASE_URL is missing
 *   the URL mentions maewoeste.com
 */
import pg from "pg";

const LEARNER = "11111111-1111-1111-1111-111111111111";

function refuse(reason) {
  console.error(`Refusing to seed: ${reason}`);
  process.exit(2);
}

if (process.env.VERCEL_ENV === "production") refuse("VERCEL_ENV=production");
if (process.env.MAE_ALLOW_DEMO_SEED !== "1") refuse("MAE_ALLOW_DEMO_SEED is not 1");
const url = process.env.DATABASE_URL;
if (!url) refuse("DATABASE_URL is missing");
if (/maewoeste\.com/i.test(url)) refuse("connection string mentions maewoeste.com");

const sql = `
DELETE FROM engine.strategy_observation
 WHERE event_id IN ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2');

INSERT INTO engine.session (id, learner_id, started_at, last_event_at, ended_at, entry_point, is_preview, rolling_success, scored_count)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '${LEARNER}',
  now() - interval '2 days',
  now() - interval '2 days' + interval '12 minutes',
  now() - interval '2 days' + interval '12 minutes',
  'study',
  false,
  0.74,
  6
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO engine.interaction_event (
  id, session_id, learner_id, seq, server_ts, type, item_id, activity_id, attempt_no, response, is_correct, latency_ms, hint_level, payload, is_preview
) VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '${LEARNER}',
  1,
  now() - interval '2 days' + interval '3 minutes',
  'answer_submitted',
  'savvas.ch1.q1',
  'savvas.ch1.check',
  1,
  '"A tool you buy"'::jsonb,
  false,
  1100,
  0,
  '{"chapter_id":"savvas.ch1","item_stem":"What is an observation?","correct_answer":"Something you notice with your senses","subject":"science","concept_id":"savvas.ch1.knowledge"}'::jsonb,
  false
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '${LEARNER}',
  2,
  now() - interval '2 days' + interval '6 minutes',
  'answer_submitted',
  'savvas.ch1.q2',
  'savvas.ch1.check',
  1,
  '"So the test is fair"'::jsonb,
  true,
  9000,
  0,
  '{"chapter_id":"savvas.ch1","item_stem":"Why change only one variable?","subject":"science"}'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO engine.mastery_estimate (learner_id, concept_id, p_mastery, theta, theta_n, state, attempts, correct_unhinted, last_practiced_at)
VALUES
  ('${LEARNER}', 'math.nf.compare_unlike', 0.42, -0.3, 5, 'in_progress', 5, 1, now() - interval '1 day'),
  ('${LEARNER}', 'math.nf.equivalence_n_times', 0.28, -0.6, 4, 'missing', 4, 0, now() - interval '3 days'),
  ('${LEARNER}', 'savvas.ch1.knowledge', 0.96, 0.5, 8, 'mastered', 8, 7, now() - interval '4 days')
ON CONFLICT (learner_id, concept_id) DO UPDATE SET p_mastery = EXCLUDED.p_mastery, state = EXCLUDED.state, attempts = EXCLUDED.attempts;

INSERT INTO engine.xp_ledger (learner_id, session_id, minute_start, xp, reason)
VALUES
  ('${LEARNER}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', date_trunc('minute', now() - interval '2 days' + interval '3 minutes'), 10, 'engaged_minute'),
  ('${LEARNER}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', date_trunc('minute', now() - interval '2 days' + interval '6 minutes'), 10, 'engaged_minute')
ON CONFLICT (session_id, minute_start) DO NOTHING;

INSERT INTO engine.strategy_observation (event_id, learner_id, concept_id, strategy, source, confidence, is_correct)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '${LEARNER}',
  'savvas.ch1.knowledge',
  'guess',
  'inferred_rules',
  0.7,
  false
);

INSERT INTO engine.review_schedule (learner_id, target_type, target_id, box, due_at, last_result, lapses)
VALUES ('${LEARNER}', 'concept', 'savvas.ch1.knowledge', 2, now() - interval '1 minute', 'pass', 0)
ON CONFLICT (learner_id, target_type, target_id) DO UPDATE SET due_at = EXCLUDED.due_at;
`;

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log("Demo seed applied on this non-production database.");
} finally {
  await client.end();
}
