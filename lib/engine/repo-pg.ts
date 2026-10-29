import { withTransaction, type DbClient } from "@/lib/db/client";
import type {
  AdminRepo,
  AssignmentRecord,
  EngineRepo,
  FirstAnswer,
  GateAttempt,
  ItemRating,
  SessionPlanRecord,
  ModalityEpisode,
  Modality,
  EpisodeOutcome,
  LearningInsight,
  LearnerGoalRecord,
  LearnerTx,
  LikeRow,
  MasteryRow,
  PlaySession,
  ReviewRow,
  StoredEvent,
  StrategyRow,
} from "@/lib/engine/repo";
import type { ReviewBox } from "@/lib/engine/scheduler";

type Row = Record<string, unknown>;

const ms = (value: unknown): number => (value instanceof Date ? value.getTime() : new Date(String(value)).getTime());
const msOrNull = (value: unknown): number | null => (value === null || value === undefined ? null : ms(value));
const iso = (value: number): string => new Date(value).toISOString();
const isoOrNull = (value: number | null): string | null => (value === null ? null : iso(value));

function toSession(row: Row): PlaySession {
  const resume = (row.resume_state ?? {}) as Partial<PlaySession["resumeState"]>;
  return {
    id: String(row.id),
    learnerId: String(row.learner_id),
    startedAt: ms(row.started_at),
    lastEventAt: ms(row.last_event_at),
    endedAt: msOrNull(row.ended_at),
    entryPoint: String(row.entry_point ?? ""),
    resumeState: {
      chapterId: resume.chapterId ?? null,
      activityId: resume.activityId ?? null,
      itemId: resume.itemId ?? null,
      scaffoldLevel: Number(resume.scaffoldLevel ?? 0),
    },
    isPreview: Boolean(row.is_preview),
    rollingSuccess: Number(row.rolling_success),
    scoredCount: Number(row.scored_count),
    consecutiveHigh: Number(row.consecutive_high),
    outOfBand: Number(row.out_of_band),
  };
}

function toEvent(row: Row): StoredEvent {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    learnerId: String(row.learner_id),
    seq: Number(row.seq),
    clientTs: msOrNull(row.client_ts),
    serverTs: ms(row.server_ts),
    type: String(row.type),
    itemId: (row.item_id as string | null) ?? null,
    activityId: (row.activity_id as string | null) ?? null,
    attemptNo: row.attempt_no === null ? null : Number(row.attempt_no),
    response: row.response ?? null,
    isCorrect: (row.is_correct as boolean | null) ?? null,
    latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
    hintLevel: row.hint_level === null ? null : Number(row.hint_level),
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    isPreview: Boolean(row.is_preview),
  };
}

function toMastery(row: Row): MasteryRow {
  return {
    conceptId: String(row.concept_id),
    pMastery: Number(row.p_mastery),
    theta: Number(row.theta),
    thetaN: Number(row.theta_n),
    state: String(row.state),
    attempts: Number(row.attempts),
    correctUnhinted: Number(row.correct_unhinted),
    gatePassedAt: msOrNull(row.gate_passed_at),
    lastPracticedAt: msOrNull(row.last_practiced_at),
  };
}

function toGate(row: Row): GateAttempt {
  return {
    scope: row.scope as GateAttempt["scope"],
    scopeId: String(row.scope_id),
    itemIds: (row.item_ids as string[] | null) ?? [],
    score: Number(row.score),
    passed: Boolean(row.passed),
    startedAt: ms(row.started_at),
    finishedAt: ms(row.finished_at),
    overrideBy: row.override_by ? String(row.override_by) : null,
  };
}

class PgLearnerTx implements LearnerTx {
  constructor(
    readonly learnerId: string,
    private readonly db: DbClient,
  ) {}

  private async rows(text: string, params: unknown[] = []): Promise<Row[]> {
    return (await this.db.query<Row>(text, params)).rows;
  }

  async getSession(id: string) {
    const [row] = await this.rows("SELECT * FROM engine.session WHERE id = $1 AND learner_id = $2", [id, this.learnerId]);
    return row ? toSession(row) : null;
  }

  async latestOpenSession() {
    const [row] = await this.rows(
      "SELECT * FROM engine.session WHERE learner_id = $1 AND ended_at IS NULL AND NOT is_preview ORDER BY last_event_at DESC LIMIT 1",
      [this.learnerId],
    );
    return row ? toSession(row) : null;
  }

  async insertSession(s: PlaySession) {
    await this.db.query(
      `INSERT INTO engine.session (id, learner_id, started_at, last_event_at, ended_at, entry_point, resume_state, is_preview,
         rolling_success, scored_count, consecutive_high, out_of_band)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        s.id, this.learnerId, iso(s.startedAt), iso(s.lastEventAt), isoOrNull(s.endedAt), s.entryPoint,
        JSON.stringify(s.resumeState), s.isPreview, s.rollingSuccess, s.scoredCount, s.consecutiveHigh, s.outOfBand,
      ],
    );
  }

  async updateSession(s: PlaySession) {
    await this.db.query(
      `UPDATE engine.session SET last_event_at = $3, ended_at = $4, resume_state = $5, rolling_success = $6,
         scored_count = $7, consecutive_high = $8, out_of_band = $9
       WHERE id = $1 AND learner_id = $2`,
      [
        s.id, this.learnerId, iso(s.lastEventAt), isoOrNull(s.endedAt), JSON.stringify(s.resumeState),
        s.rollingSuccess, s.scoredCount, s.consecutiveHigh, s.outOfBand,
      ],
    );
  }

  async insertEvent(e: StoredEvent) {
    const result = await this.db.query(
      `INSERT INTO engine.interaction_event (id, session_id, learner_id, seq, client_ts, server_ts, type, item_id, activity_id,
         attempt_no, response, is_correct, latency_ms, hint_level, payload, is_preview)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO NOTHING`,
      [
        e.id, e.sessionId, this.learnerId, e.seq, isoOrNull(e.clientTs), iso(e.serverTs), e.type, e.itemId, e.activityId,
        e.attemptNo, e.response === undefined ? null : JSON.stringify(e.response), e.isCorrect, e.latencyMs, e.hintLevel,
        e.payload ? JSON.stringify(e.payload) : null, e.isPreview,
      ],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async countAnswers(sessionId: string, itemId: string) {
    const [row] = await this.rows(
      "SELECT count(*)::int AS n FROM engine.interaction_event WHERE learner_id = $1 AND session_id = $2 AND item_id = $3 AND type = 'answer_submitted'",
      [this.learnerId, sessionId, itemId],
    );
    return Number(row?.n ?? 0);
  }

  async missStreak(itemId: string) {
    const [row] = await this.rows(
      `SELECT count(*)::int AS n FROM engine.interaction_event e
       WHERE e.learner_id = $1 AND e.item_id = $2 AND e.type = 'answer_submitted' AND NOT e.is_preview AND e.is_correct = false
         AND e.server_ts > COALESCE((
           SELECT max(r.server_ts) FROM engine.interaction_event r
           WHERE r.learner_id = $1 AND r.item_id = $2 AND NOT r.is_preview
             AND ((r.type = 'answer_submitted' AND r.is_correct) OR r.type = 'item_skipped')
         ), '-infinity'::timestamptz)`,
      [this.learnerId, itemId],
    );
    return Number(row?.n ?? 0);
  }

  async firstAnswersSince(itemIds: string[], since: number): Promise<FirstAnswer[]> {
    const rows = await this.rows(
      `SELECT DISTINCT ON (item_id) item_id, is_correct, hint_level
       FROM engine.interaction_event
       WHERE learner_id = $1 AND type = 'answer_submitted' AND NOT is_preview AND item_id = ANY($2) AND server_ts > $3
       ORDER BY item_id, server_ts, seq`,
      [this.learnerId, itemIds, iso(since)],
    );
    return rows.map((r) => ({ itemId: String(r.item_id), isCorrect: Boolean(r.is_correct), hintLevel: Number(r.hint_level ?? 0) }));
  }

  async correctItemsSince(itemIds: string[], since: number) {
    const rows = await this.rows(
      `SELECT DISTINCT item_id FROM engine.interaction_event
       WHERE learner_id = $1 AND type = 'answer_submitted' AND NOT is_preview AND is_correct AND item_id = ANY($2) AND server_ts > $3`,
      [this.learnerId, itemIds, iso(since)],
    );
    return new Set(rows.map((r) => String(r.item_id)));
  }

  async lastEventOfType(type: string, activityId: string, since: number) {
    const [row] = await this.rows(
      "SELECT max(server_ts) AS ts FROM engine.interaction_event WHERE learner_id = $1 AND type = $2 AND activity_id = $3 AND server_ts > $4",
      [this.learnerId, type, activityId, iso(since)],
    );
    return msOrNull(row?.ts ?? null);
  }

  async answeredItemIds() {
    const rows = await this.rows(
      "SELECT DISTINCT item_id FROM engine.interaction_event WHERE learner_id = $1 AND type = 'answer_submitted' AND NOT is_preview AND item_id IS NOT NULL",
      [this.learnerId],
    );
    return new Set(rows.map((r) => String(r.item_id)));
  }

  async getMastery(conceptId: string) {
    const [row] = await this.rows("SELECT * FROM engine.mastery_estimate WHERE learner_id = $1 AND concept_id = $2", [this.learnerId, conceptId]);
    return row ? toMastery(row) : null;
  }

  async upsertMastery(m: MasteryRow) {
    await this.db.query(
      `INSERT INTO engine.mastery_estimate (learner_id, concept_id, p_mastery, theta, theta_n, state, attempts, correct_unhinted,
         gate_passed_at, last_practiced_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT (learner_id, concept_id) DO UPDATE SET p_mastery = EXCLUDED.p_mastery, theta = EXCLUDED.theta,
         theta_n = EXCLUDED.theta_n, state = EXCLUDED.state, attempts = EXCLUDED.attempts,
         correct_unhinted = EXCLUDED.correct_unhinted, gate_passed_at = EXCLUDED.gate_passed_at,
         last_practiced_at = EXCLUDED.last_practiced_at, updated_at = now()`,
      [
        this.learnerId, m.conceptId, m.pMastery, m.theta, m.thetaN, m.state, m.attempts, m.correctUnhinted,
        isoOrNull(m.gatePassedAt), isoOrNull(m.lastPracticedAt),
      ],
    );
    await this.db.query("INSERT INTO engine.mastery_history (learner_id, concept_id, snapshot) VALUES ($1, $2, $3)", [
      this.learnerId,
      m.conceptId,
      JSON.stringify({ p_mastery: m.pMastery, theta: m.theta, state: m.state }),
    ]);
  }

  async getReview(targetType: string, targetId: string) {
    const [row] = await this.rows(
      "SELECT * FROM engine.review_schedule WHERE learner_id = $1 AND target_type = $2 AND target_id = $3",
      [this.learnerId, targetType, targetId],
    );
    if (!row) return null;
    return {
      targetType: String(row.target_type),
      targetId: String(row.target_id),
      box: Number(row.box) as ReviewBox,
      dueAt: ms(row.due_at),
      lastResult: (row.last_result as ReviewRow["lastResult"]) ?? null,
      lapses: Number(row.lapses),
    };
  }

  async upsertReview(r: ReviewRow) {
    await this.db.query(
      `INSERT INTO engine.review_schedule (learner_id, target_type, target_id, box, due_at, last_result, lapses)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (learner_id, target_type, target_id) DO UPDATE SET box = EXCLUDED.box, due_at = EXCLUDED.due_at,
         last_result = EXCLUDED.last_result, lapses = EXCLUDED.lapses`,
      [this.learnerId, r.targetType, r.targetId, r.box, iso(r.dueAt), r.lastResult, r.lapses],
    );
  }

  async getGoal() {
    const [row] = await this.rows("SELECT * FROM engine.learner_goal WHERE learner_id = $1", [this.learnerId]);
    return row ? toGoal(row) : null;
  }

  async openAssignments() {
    const rows = await this.rows("SELECT * FROM engine.assignment WHERE learner_id = $1 AND status = 'open' ORDER BY created_at", [this.learnerId]);
    return rows.map(toAssignment);
  }

  async eventsSince(since: number, types: string[]) {
    const rows = await this.rows(
      "SELECT * FROM engine.interaction_event WHERE learner_id = $1 AND server_ts > $2 AND type = ANY($3::text[]) AND NOT is_preview ORDER BY server_ts",
      [this.learnerId, iso(since), types],
    );
    return rows.map(toEvent);
  }

  async getSessionPlan(loginId: string) {
    const [row] = await this.rows("SELECT * FROM engine.session_plan WHERE learner_id = $1 AND login_id = $2", [this.learnerId, loginId]);
    return row ? toSessionPlan(row) : null;
  }

  async saveSessionPlan(r: SessionPlanRecord) {
    await this.db.query(
      `INSERT INTO engine.session_plan (learner_id, login_id, day, plan, source, ai_attempted, created_at)
       VALUES ($1, $2, $3::date, $4::jsonb, $5, $6, $7) ON CONFLICT (learner_id, login_id) DO NOTHING`,
      [this.learnerId, r.loginId, r.day, JSON.stringify(r.plan), r.source, r.aiAttempted, iso(r.createdAt)],
    );
  }

  async insertEpisode(e: ModalityEpisode) {
    await this.db.query(
      `INSERT INTO engine.modality_episode (id, learner_id, item_id, concept_id, subject, context, modality, chosen_by, samples, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) ON CONFLICT (id) DO NOTHING`,
      [e.id, this.learnerId, e.itemId, e.conceptId, e.subject, e.context, e.modality, e.chosenBy, JSON.stringify(e.samples), iso(e.startedAt)],
    );
  }

  async openEpisode(itemId: string) {
    const [row] = await this.rows(
      "SELECT * FROM engine.modality_episode WHERE learner_id = $1 AND item_id = $2 AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1",
      [this.learnerId, itemId],
    );
    return row ? toEpisode(row) : null;
  }

  async resolveEpisode(id: string, outcome: EpisodeOutcome, at: number) {
    await this.db.query(
      `UPDATE engine.modality_episode SET success = $3, resolved_at = $4, followup_latency_ms = $5, followup_rushed = $6
       WHERE id = $1 AND learner_id = $2 AND resolved_at IS NULL`,
      [id, this.learnerId, outcome.success, iso(at), outcome.latencyMs, outcome.rushed],
    );
  }

  async latestInsight() {
    const [row] = await this.rows("SELECT * FROM engine.learning_insight WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 1", [this.learnerId]);
    return row ? toInsight(row) : null;
  }

  async listEpisodes() {
    const rows = await this.rows("SELECT * FROM engine.modality_episode WHERE learner_id = $1 ORDER BY started_at", [this.learnerId]);
    return rows.map(toEpisode);
  }

  async aiPlanAttempts(day: string) {
    const [row] = await this.rows("SELECT count(*)::int AS n FROM engine.session_plan WHERE learner_id = $1 AND day = $2::date AND ai_attempted", [this.learnerId, day]);
    return Number(row?.n ?? 0);
  }

  async listReviews(targetType: string) {
    const rows = await this.rows(
      "SELECT * FROM engine.review_schedule WHERE learner_id = $1 AND target_type = $2 ORDER BY due_at",
      [this.learnerId, targetType],
    );
    return rows.map((row) => ({
      targetType: String(row.target_type),
      targetId: String(row.target_id),
      box: Number(row.box) as ReviewBox,
      dueAt: ms(row.due_at),
      lastResult: (row.last_result as ReviewRow["lastResult"]) ?? null,
      lapses: Number(row.lapses),
    }));
  }

  async getItemRating(itemId: string) {
    const [row] = await this.rows("SELECT * FROM engine.item_rating WHERE item_id = $1", [itemId]);
    return row ? { itemId, difficulty: Number(row.difficulty), seed: Number(row.seed), n: Number(row.n) } : null;
  }

  async upsertItemRating(r: ItemRating) {
    await this.db.query(
      `INSERT INTO engine.item_rating (item_id, difficulty, seed, n, updated_at) VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (item_id) DO UPDATE SET difficulty = EXCLUDED.difficulty, n = EXCLUDED.n, updated_at = now()`,
      [r.itemId, r.difficulty, r.seed, r.n],
    );
  }

  async insertDecision(sessionId: string, decision: string, reasonCode: string, inputs: Record<string, unknown>) {
    await this.db.query(
      "INSERT INTO engine.adaptation_decision (session_id, learner_id, decision, reason_code, inputs, config_version) VALUES ($1, $2, $3, $4, $5, 'v1')",
      [sessionId, this.learnerId, decision, reasonCode, JSON.stringify(inputs)],
    );
  }

  async lastGateAttempt(scope: GateAttempt["scope"], scopeId: string) {
    const [row] = await this.rows(
      "SELECT * FROM engine.gate_attempt WHERE learner_id = $1 AND scope = $2 AND scope_id = $3 ORDER BY finished_at DESC NULLS LAST LIMIT 1",
      [this.learnerId, scope, scopeId],
    );
    return row ? toGate(row) : null;
  }

  async insertGateAttempt(g: GateAttempt) {
    await this.db.query(
      `INSERT INTO engine.gate_attempt (learner_id, scope, scope_id, item_ids, score, passed, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [this.learnerId, g.scope, g.scopeId, g.itemIds, g.score, g.passed, iso(g.startedAt), iso(g.finishedAt)],
    );
  }

  async passedGateScopeIds(scope: GateAttempt["scope"]) {
    const rows = await this.rows("SELECT DISTINCT scope_id FROM engine.gate_attempt WHERE learner_id = $1 AND scope = $2 AND passed", [
      this.learnerId,
      scope,
    ]);
    return rows.map((r) => String(r.scope_id));
  }

  async firstPassedAt(scope: GateAttempt["scope"]) {
    const rows = await this.rows(
      "SELECT scope_id, MIN(COALESCE(finished_at, started_at)) AS t FROM engine.gate_attempt WHERE learner_id = $1 AND scope = $2 AND passed GROUP BY scope_id",
      [this.learnerId, scope],
    );
    return new Map(rows.map((r) => [String(r.scope_id), new Date(r.t as string | Date).getTime()] as [string, number]));
  }

  async awardXp(sessionId: string, minuteStart: number, xp: number) {
    const result = await this.db.query(
      `INSERT INTO engine.xp_ledger (learner_id, session_id, minute_start, xp, reason) VALUES ($1, $2, $3, $4, 'engaged_minute')
       ON CONFLICT (session_id, minute_start) DO NOTHING`,
      [this.learnerId, sessionId, iso(minuteStart), xp],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async xpRows() {
    const rows = await this.rows("SELECT minute_start, xp FROM engine.xp_ledger WHERE learner_id = $1", [this.learnerId]);
    return rows.map((r) => ({ minuteStart: ms(r.minute_start), xp: Number(r.xp) }));
  }

  async saveLikes(tags: LikeRow[]) {
    for (const tag of tags) {
      await this.db.query(
        "INSERT INTO engine.interest_signal (learner_id, interest_tag, signal_type, value) VALUES ($1, $2, $3, $4)",
        [this.learnerId, tag.interestTag, tag.liked ? "picker_like" : "picker_unlike", tag.liked ? 3 : -3],
      );
    }
  }

  async getLikes() {
    const rows = await this.rows("SELECT interest_tag, liked FROM student_api.my_likes WHERE learner_id = $1", [this.learnerId]);
    return rows.map((r) => ({ interestTag: String(r.interest_tag), liked: Boolean(r.liked) }));
  }

  async insertStrategy(row: StrategyRow) {
    await this.db.query(
      `INSERT INTO engine.strategy_observation (event_id, learner_id, concept_id, strategy, source, confidence, misconception, features, is_correct)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.eventId,
        this.learnerId,
        row.conceptId,
        row.strategy,
        row.source,
        row.confidence,
        row.misconception,
        null,
        row.isCorrect,
      ],
    );
  }
}

export const pgEngineRepo: EngineRepo = {
  withLearner(learnerId, work) {
    return withTransaction("student", learnerId, (db) => work(new PgLearnerTx(learnerId, db)));
  },
};

function adminRows(text: string, params: unknown[] = []): Promise<Row[]> {
  return withTransaction("admin", null, async (db) => (await db.query<Row>(text, params)).rows);
}

export const pgAdminRepo: AdminRepo = {
  async mastery() {
    const rows = await adminRows("SELECT * FROM admin_api.mastery_map ORDER BY updated_at DESC");
    return rows.map((r) => ({ ...toMastery(r), learnerId: String(r.learner_id) }));
  },
  async wrongAnswers(limit) {
    const rows = await adminRows(
      `SELECT * FROM engine.interaction_event WHERE type = 'answer_submitted' AND is_correct = false AND NOT is_preview
       ORDER BY server_ts DESC LIMIT $1`,
      [limit],
    );
    return rows.map(toEvent);
  },
  async events(limit) {
    const rows = await adminRows("SELECT * FROM engine.interaction_event ORDER BY server_ts DESC LIMIT $1", [limit]);
    return rows.map(toEvent);
  },
  async eventsOfType(type, limit) {
    const rows = await adminRows("SELECT * FROM engine.interaction_event WHERE type = $1 ORDER BY server_ts DESC LIMIT $2", [type, limit]);
    return rows.map(toEvent);
  },
  async decisions(limit) {
    return adminRows("SELECT * FROM admin_api.decisions ORDER BY ts DESC LIMIT $1", [limit]);
  },
  async likes() {
    const rows = await adminRows(
      `SELECT DISTINCT ON (learner_id, interest_tag) learner_id, interest_tag, (value > 0) AS liked
       FROM engine.interest_signal WHERE signal_type IN ('picker_like', 'picker_unlike')
       ORDER BY learner_id, interest_tag, ts DESC`,
    );
    return rows.map((r) => ({ learnerId: String(r.learner_id), interestTag: String(r.interest_tag), liked: Boolean(r.liked) }));
  },
  async engagedMinutesByDay() {
    const rows = await adminRows(
      `SELECT to_char(date_trunc('day', minute_start AT TIME ZONE 'America/New_York'), 'YYYY-MM-DD') AS day, count(*)::int AS minutes
       FROM engine.xp_ledger GROUP BY 1 ORDER BY 1 DESC LIMIT 60`,
    );
    return rows.map((r) => ({ day: String(r.day), minutes: Number(r.minutes) }));
  },
  async counts() {
    const [row] = await adminRows(
      `SELECT (SELECT count(*) FROM engine.interaction_event)::int AS events,
              (SELECT count(*) FROM engine.mastery_estimate)::int AS mastery,
              (SELECT count(*) FROM engine.review_schedule)::int AS reviews`,
    );
    return { events: Number(row?.events ?? 0), mastery: Number(row?.mastery ?? 0), reviews: Number(row?.reviews ?? 0) };
  },
  async activeConfig() {
    const [row] = await adminRows("SELECT json FROM engine.engine_config WHERE active ORDER BY created_at DESC LIMIT 1");
    return (row?.json as Record<string, unknown> | undefined) ?? null;
  },
  async saveConfig(config, createdBy) {
    const version = `v${Date.now()}`;
    await withTransaction("admin", null, async (db) => {
      await db.query("UPDATE engine.engine_config SET active = false WHERE active");
      await db.query("INSERT INTO engine.engine_config (version, json, created_by, active) VALUES ($1, $2, $3, true)", [
        version,
        JSON.stringify(config),
        createdBy,
      ]);
    });
    return version;
  },
  async sessions(limit) {
    const rows = await adminRows("SELECT * FROM engine.session WHERE NOT is_preview ORDER BY started_at DESC LIMIT $1", [limit]);
    return rows.map(toSession);
  },
  async reviews() {
    const rows = await adminRows("SELECT * FROM engine.review_schedule");
    return rows.map((r) => ({
      learnerId: String(r.learner_id),
      targetType: String(r.target_type),
      targetId: String(r.target_id),
      box: Number(r.box) as ReviewBox,
      dueAt: ms(r.due_at),
      lastResult: (r.last_result as ReviewRow["lastResult"]) ?? null,
      lapses: Number(r.lapses),
    }));
  },
  async xpLedger() {
    const rows = await adminRows("SELECT learner_id, session_id, minute_start, xp FROM engine.xp_ledger");
    return rows.map((r) => ({
      learnerId: String(r.learner_id),
      sessionId: String(r.session_id),
      minuteStart: ms(r.minute_start),
      xp: Number(r.xp),
    }));
  },
  async strategies(limit) {
    const rows = await adminRows("SELECT * FROM engine.strategy_observation ORDER BY id DESC LIMIT $1", [limit]);
    return rows.map((r) => ({
      eventId: String(r.event_id),
      learnerId: String(r.learner_id),
      conceptId: r.concept_id ? String(r.concept_id) : null,
      strategy: String(r.strategy),
      source: String(r.source),
      confidence: r.confidence === null ? null : Number(r.confidence),
      misconception: r.misconception ? String(r.misconception) : null,
      isCorrect: (r.is_correct as boolean | null) ?? null,
    }));
  },
  async gatedChapterIds(learnerId) {
    const rows = await adminRows(
      "SELECT DISTINCT scope_id FROM engine.gate_attempt WHERE learner_id = $1 AND scope = 'chapter' AND passed",
      [learnerId],
    );
    return rows.map((r) => String(r.scope_id));
  },
  async chapterGateAttempts(learnerId) {
    const rows = await adminRows(
      `SELECT scope_id, score, passed, finished_at, (override_by IS NOT NULL) AS override
       FROM engine.gate_attempt WHERE learner_id = $1 AND scope = 'chapter' ORDER BY finished_at NULLS FIRST`,
      [learnerId],
    );
    return rows.map((r) => ({
      chapterId: String(r.scope_id),
      score: r.score === null || r.score === undefined ? null : Number(r.score),
      passed: Boolean(r.passed),
      finishedAt: ms(r.finished_at),
      override: Boolean(r.override),
    }));
  },
  async overrideChapterGate({ learnerId, chapterId, by, reason, at }) {
    await withTransaction("admin", null, async (db) => {
      await db.query(
        `INSERT INTO engine.gate_attempt (learner_id, scope, scope_id, item_ids, score, passed, started_at, finished_at, override_by, override_reason)
         VALUES ($1, 'chapter', $2, '{}', NULL, true, $3, $3, $4, $5)`,
        [learnerId, chapterId, iso(at), by, reason],
      );
    });
  },
  async assignments() {
    const rows = await adminRows("SELECT * FROM admin_api.assignments ORDER BY created_at DESC");
    return rows.map(toAssignment);
  },
  async createAssignment(row) {
    const [created] = await adminRows(
      `INSERT INTO engine.assignment (learner_id, kind, target_type, target_id, title, reason, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [row.learnerId, row.kind, row.targetType, row.targetId, row.title, row.reason, row.status, row.createdBy],
    );
    return toAssignment(created);
  },
  async updateAssignment(id, patch) {
    const [row] = await adminRows(
      `UPDATE engine.assignment
       SET status = COALESCE($2, status), completed_at = COALESCE($3, completed_at)
       WHERE id = $1
       RETURNING *`,
      [id, patch.status ?? null, patch.completedAt !== undefined ? isoOrNull(patch.completedAt) : null],
    );
    return row ? toAssignment(row) : null;
  },
  async modalityEpisodes() {
    const rows = await adminRows("SELECT * FROM admin_api.modality_episodes ORDER BY started_at");
    return rows.map((row) => ({ ...toEpisode(row), learnerId: String(row.learner_id) }));
  },
  async firstTryAnswers(learnerId: string, since: number) {
    const rows = await adminRows(
      `SELECT payload->>'concept_id' AS concept_id, is_correct, server_ts FROM engine.interaction_event
       WHERE learner_id = $1 AND type = 'answer_submitted' AND attempt_no = 1 AND NOT is_preview AND server_ts > $2 ORDER BY server_ts`,
      [learnerId, iso(since)],
    );
    return rows.map((r) => ({ conceptId: String(r.concept_id ?? ""), isCorrect: r.is_correct === true, serverTs: ms(r.server_ts) }));
  },
  async insights(learnerId: string, limit: number) {
    const rows = await adminRows("SELECT * FROM admin_api.learning_insights WHERE learner_id = $1 ORDER BY created_at DESC LIMIT $2", [learnerId, limit]);
    return rows.map(toInsight);
  },
  async insertInsight(learnerId: string, r: LearningInsight) {
    await adminRows(
      `INSERT INTO engine.learning_insight (id, learner_id, created_at, trigger, source, model, stats, summary, confidence, weights, requested_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11)`,
      [r.id, learnerId, iso(r.createdAt), r.trigger, r.source, r.model, JSON.stringify(r.stats), r.summary, r.confidence, JSON.stringify(r.weights), r.requestedBy],
    );
  },
  async sessionPlans(sinceDay: string) {
    const rows = await adminRows("SELECT * FROM admin_api.session_plans WHERE day >= $1::date ORDER BY created_at DESC", [sinceDay]);
    return rows.map((row) => ({ ...toSessionPlan(row), learnerId: String(row.learner_id) }));
  },
  async goals() {
    const rows = await adminRows("SELECT * FROM engine.learner_goal");
    return rows.map(toGoal);
  },
  async upsertGoal(goal) {
    await withTransaction("admin", null, async (db) => {
      await db.query(
        `INSERT INTO engine.learner_goal (learner_id, weekly_xp_goal, daily_minutes_goal, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (learner_id) DO UPDATE SET weekly_xp_goal = EXCLUDED.weekly_xp_goal,
           daily_minutes_goal = EXCLUDED.daily_minutes_goal, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by`,
        [goal.learnerId, goal.weeklyXpGoal, goal.dailyMinutesGoal, iso(goal.updatedAt), goal.updatedBy],
      );
    });
  },
  async relabelStrategy(eventId, learnerId, strategy, createdBy) {
    await withTransaction("admin", null, async (db) => {
      await db.query(
        `INSERT INTO engine.strategy_observation (event_id, learner_id, concept_id, strategy, source, confidence, misconception, features, is_correct)
         VALUES ($1, $2, NULL, $3, 'admin_label', 1, NULL, $4, NULL)`,
        [eventId, learnerId, strategy, JSON.stringify({ labeled_by: createdBy })],
      );
    });
  },
};

function toAssignment(row: Row): AssignmentRecord {
  return {
    id: String(row.id),
    learnerId: String(row.learner_id),
    kind: row.kind as AssignmentRecord["kind"],
    targetType: row.target_type as AssignmentRecord["targetType"],
    targetId: String(row.target_id),
    title: String(row.title),
    reason: row.reason ? String(row.reason) : null,
    status: row.status as AssignmentRecord["status"],
    createdBy: String(row.created_by),
    createdAt: ms(row.created_at),
    completedAt: msOrNull(row.completed_at),
  };
}

function toGoal(row: Row): LearnerGoalRecord {
  return {
    learnerId: String(row.learner_id),
    weeklyXpGoal: Number(row.weekly_xp_goal),
    dailyMinutesGoal: Number(row.daily_minutes_goal),
    updatedAt: ms(row.updated_at),
    updatedBy: String(row.updated_by),
  };
}

function toEpisode(row: Row): ModalityEpisode {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    conceptId: String(row.concept_id),
    subject: String(row.subject),
    context: row.context === "first_teach" ? "first_teach" : "reteach",
    modality: String(row.modality) as Modality,
    chosenBy: String(row.chosen_by) as ModalityEpisode["chosenBy"],
    samples: (row.samples ?? {}) as Record<string, number>,
    startedAt: ms(row.started_at),
    resolvedAt: row.resolved_at ? ms(row.resolved_at) : null,
    success: row.success === null || row.success === undefined ? null : Boolean(row.success),
    followupLatencyMs: row.followup_latency_ms === null || row.followup_latency_ms === undefined ? null : Number(row.followup_latency_ms),
    followupRushed: row.followup_rushed === null || row.followup_rushed === undefined ? null : Boolean(row.followup_rushed),
  };
}

function toInsight(row: Row): LearningInsight {
  return {
    id: String(row.id),
    createdAt: ms(row.created_at),
    trigger: row.trigger === "weekly" ? "weekly" : "admin",
    source: row.source === "ai" ? "ai" : "deterministic",
    model: row.model ? String(row.model) : null,
    stats: (row.stats ?? {}) as Record<string, unknown>,
    summary: String(row.summary ?? ""),
    confidence: String(row.confidence ?? ""),
    weights: (row.weights ?? {}) as LearningInsight["weights"],
    requestedBy: row.requested_by ? String(row.requested_by) : null,
  };
}

function toSessionPlan(row: Row): SessionPlanRecord {
  const day = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10);
  return {
    loginId: String(row.login_id),
    day,
    plan: (row.plan ?? {}) as Record<string, unknown>,
    source: row.source === "ai" ? "ai" : "deterministic",
    aiAttempted: row.ai_attempted === true,
    createdAt: ms(row.created_at),
  };
}
