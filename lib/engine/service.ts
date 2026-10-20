import type { AppRole } from "@/lib/auth/allowlist";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import type { ChapterItem, ChapterPack } from "@/lib/content/types";
import { DEFAULT_BKT, evidenceWeight, guessFromOptions, updateBkt } from "@/lib/engine/bkt";
import { hintWeightedOutcome, updateElo } from "@/lib/engine/elo";
import { chapterGatePassed, conceptGatePassed, masteryState } from "@/lib/engine/gating";
import type { EngineRepo, LearnerTx, LikeRow, MasteryRow, PlaySession, ResumeState } from "@/lib/engine/repo";
import { dueAt, etDateKey, nextBoxOnPass, onFail } from "@/lib/engine/scheduler";
import { scoreItem } from "@/lib/engine/scoring";
import { classifyGuess } from "@/lib/engine/strategy";
import { ringPercent, truncateMinute, xpForMinute } from "@/lib/engine/xp";
import { ewma, targetSuccess, zoneAction } from "@/lib/engine/zone";

export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const ZONE_MIN_SCORED = 5;
const RAPID_GUESS_MS = 1500;
const WEEKLY_XP_GOAL = 600;
const MAX_HINT_LEVEL = 3;
const MAX_EVENTS_PER_BATCH = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Client-reported event types. Answers only arrive through `submitAnswer`, which scores them. */
export const CLIENT_EVENT_TYPES = ["read_done", "hint_requested", "item_shown", "heartbeat", "game_event"] as const;
type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export class EngineError extends Error {
  constructor(
    readonly status: 400 | 403 | 404,
    readonly code: string,
  ) {
    super(code);
  }
}

export type EngineActor = { role: AppRole; learnerId: string | null };

export type ChapterProgress = {
  chapterId: string;
  readDone: boolean;
  nextStep: number;
  totalSteps: number;
  starEarned: boolean;
  lastTry: "passed" | "not_yet" | null;
};

type ChapterState = ChapterProgress & { attemptSince: number };

export type GateOutcome = { passed: boolean; correct: number; total: number; needPct: number };

export type AnswerFeedback = {
  correct: boolean;
  explanation: string;
  proving_sentence?: string;
  proving_sentence_id?: string;
  read_aloud_text: string;
  session_id: string | null;
  preview: boolean;
  chapter: ChapterProgress | null;
  gate: GateOutcome | null;
};

type Located = { chapter: ChapterPack; item: ChapterItem };

let itemIndex: Map<string, Located> | null = null;

export function locateItem(itemId: string): Located | null {
  if (!itemIndex) {
    itemIndex = new Map();
    for (const chapter of listChapters()) {
      for (const item of chapter.items) itemIndex.set(item.id, { chapter, item });
    }
  }
  return itemIndex.get(itemId) ?? null;
}

export function visibleChapter(chapterId: string, role: AppRole): ChapterPack {
  const chapter = getChapter(chapterId);
  if (!chapter) throw new EngineError(404, "chapter_not_found");
  if (!chapterVisibleTo(chapter, role)) throw new EngineError(403, "chapter_not_available");
  return chapter;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

function emptyResume(): ResumeState {
  return { chapterId: null, activityId: null, itemId: null, scaffoldLevel: 0 };
}

function newSession(learnerId: string, entryPoint: string, now: number, resume: ResumeState): PlaySession {
  return {
    id: crypto.randomUUID(),
    learnerId,
    startedAt: now,
    lastEventAt: now,
    endedAt: null,
    entryPoint,
    resumeState: resume,
    isPreview: false,
    rollingSuccess: 0.82,
    scoredCount: 0,
    consecutiveHigh: 0,
    outOfBand: 0,
  };
}

/**
 * The learner's current session: the requested one if it is theirs and still live, otherwise the
 * latest live one, otherwise a new one that carries the previous resume point. Sessions idle for
 * 30 minutes are closed.
 */
async function currentSession(tx: LearnerTx, requestedId: string | null, entryPoint: string, now: number): Promise<PlaySession> {
  const requested = requestedId && UUID_RE.test(requestedId) ? await tx.getSession(requestedId) : null;
  const candidate = requested && !requested.endedAt && !requested.isPreview ? requested : await tx.latestOpenSession();
  if (candidate && now - candidate.lastEventAt <= SESSION_IDLE_MS) return candidate;
  let carried = emptyResume();
  if (candidate) {
    carried = { ...candidate.resumeState, scaffoldLevel: 0 };
    await tx.updateSession({ ...candidate, endedAt: candidate.lastEventAt });
  }
  const session = newSession(tx.learnerId, entryPoint, now, carried);
  await tx.insertSession(session);
  return session;
}

async function chapterState(tx: LearnerTx, chapter: ChapterPack): Promise<ChapterState> {
  const last = await tx.lastGateAttempt("chapter", chapter.id);
  const attemptSince = last?.finishedAt ?? 0;
  const correct = await tx.correctItemsSince(
    chapter.items.map((item) => item.id),
    attemptSince,
  );
  const readDone = (await tx.lastEventOfType("read_done", chapter.id, attemptSince)) !== null;
  const firstOpen = chapter.items.findIndex((item) => !correct.has(item.id));
  const starEarned = last?.passed || (await tx.passedGateScopeIds("chapter")).includes(chapter.id);
  return {
    chapterId: chapter.id,
    readDone,
    nextStep: firstOpen === -1 ? chapter.items.length : firstOpen,
    totalSteps: chapter.items.length,
    starEarned: Boolean(starEarned),
    lastTry: last ? (last.passed ? "passed" : "not_yet") : null,
    attemptSince,
  };
}

function publicProgress(state: ChapterState): ChapterProgress {
  const { attemptSince: _internal, ...rest } = state;
  return rest;
}

function defaultMastery(conceptId: string): MasteryRow {
  return {
    conceptId,
    pMastery: DEFAULT_BKT.pL0,
    theta: 0,
    thetaN: 0,
    state: "not_started",
    attempts: 0,
    correctUnhinted: 0,
    gatePassedAt: null,
    lastPracticedAt: null,
  };
}

function guessRate(item: ChapterItem): number {
  return item.options?.length ? guessFromOptions(item.options.length) : 0.05;
}

async function applyAnswer(
  tx: LearnerTx,
  session: PlaySession,
  item: ChapterItem,
  args: { correct: boolean; hintLevel: number; firstAttempt: boolean; rapidGuess: boolean; now: number },
): Promise<void> {
  const { correct, hintLevel, firstAttempt, rapidGuess, now } = args;
  const row = (await tx.getMastery(item.conceptId)) ?? defaultMastery(item.conceptId);
  const g = guessRate(item);
  const weight = evidenceWeight({ firstAttempt, hintLevel, rapidGuess });
  if (weight > 0) row.pMastery = updateBkt(row.pMastery, correct, { ...DEFAULT_BKT, g }, weight).pNext;

  if (firstAttempt && !rapidGuess) {
    const rating = (await tx.getItemRating(item.id)) ?? { itemId: item.id, difficulty: 0, seed: 0, n: 0 };
    const elo = updateElo({
      theta: row.theta,
      difficulty: rating.difficulty,
      outcome: hintWeightedOutcome(correct, hintLevel),
      nLearner: row.thetaN,
      nItem: rating.n,
      guess: g,
      seed: rating.seed,
    });
    row.theta = elo.theta;
    row.thetaN += 1;
    await tx.upsertItemRating({ ...rating, difficulty: elo.difficulty, n: rating.n + 1 });
  }

  row.attempts += 1;
  if (firstAttempt && correct && hintLevel <= 1) row.correctUnhinted += 1;
  row.lastPracticedAt = now;

  let rusty = false;
  if (firstAttempt) {
    const passed = correct && hintLevel <= 1;
    const review = await tx.getReview("item", item.id);
    if (!review) {
      const box = passed ? 1 : 0;
      await tx.upsertReview({ targetType: "item", targetId: item.id, box, dueAt: dueAt(new Date(now), box).getTime(), lastResult: passed ? "pass" : "fail", lapses: 0 });
    } else if (review.dueAt <= now) {
      if (passed) {
        const box = nextBoxOnPass(review.box);
        await tx.upsertReview({ ...review, box, dueAt: dueAt(new Date(now), box).getTime(), lastResult: "pass" });
      } else {
        const fail = onFail();
        rusty = true;
        row.pMastery = Math.max(0.05, row.pMastery * fail.pMasteryFactor);
        await tx.upsertReview({ ...review, box: fail.box, dueAt: dueAt(new Date(now), fail.box).getTime(), lastResult: "fail", lapses: review.lapses + 1 });
      }
    }
  }

  row.state = masteryState({ pMastery: row.pMastery, gated: row.gatePassedAt !== null, rusty, attempts: row.attempts, reviewDue: false });
  await tx.upsertMastery(row);

  if (firstAttempt && !rapidGuess) await applyZone(tx, session, correct && hintLevel <= 1);
}

/** EWMA zone controller with a 5-answer warm-up and 3-answer hysteresis before acting. */
async function applyZone(tx: LearnerTx, session: PlaySession, success: boolean): Promise<void> {
  session.rollingSuccess = ewma(session.rollingSuccess, success ? 1 : 0);
  session.scoredCount += 1;
  session.consecutiveHigh = session.rollingSuccess > 0.95 ? session.consecutiveHigh + 1 : 0;
  if (session.scoredCount < ZONE_MIN_SCORED) return;
  const outOfBand = session.rollingSuccess < 0.7 || session.rollingSuccess > 0.95;
  session.outOfBand = outOfBand ? session.outOfBand + 1 : 0;
  const action = zoneAction(session.rollingSuccess, session.consecutiveHigh, session.outOfBand);
  if (action === "none") return;
  const scaffold = session.resumeState.scaffoldLevel;
  session.resumeState.scaffoldLevel = action === "zone_down" ? Math.min(3, scaffold + 1) : Math.max(0, scaffold - 1);
  session.outOfBand = 0;
  await tx.insertDecision(session.id, action, action === "zone_down" ? "rolling_below_0.70" : "rolling_above_0.95", {
    rolling: session.rollingSuccess,
    target: targetSuccess(session.rollingSuccess, session.consecutiveHigh),
    scored_count: session.scoredCount,
    scaffold_level: session.resumeState.scaffoldLevel,
  });
}

/**
 * Chapter gate: first tries this round must be at least 90% right without big hints, and every
 * concept in the chapter at least 80%. Either way a new round starts afterwards.
 */
async function runChapterGate(tx: LearnerTx, chapter: ChapterPack, since: number, now: number): Promise<GateOutcome> {
  const itemIds = chapter.items.map((item) => item.id);
  const first = new Map((await tx.firstAnswersSince(itemIds, since)).map((row) => [row.itemId, row]));
  const success = (itemId: string) => {
    const row = first.get(itemId);
    return Boolean(row && row.isCorrect && row.hintLevel <= 1);
  };
  const correct = itemIds.filter(success).length;
  const score = correct / Math.max(1, itemIds.length);
  const byConcept = new Map<string, string[]>();
  for (const item of chapter.items) byConcept.set(item.conceptId, [...(byConcept.get(item.conceptId) ?? []), item.id]);
  const conceptScores = new Map([...byConcept].map(([concept, ids]) => [concept, ids.filter(success).length / ids.length]));
  const passed = chapterGatePassed({ chapterScore: score, coreConceptScores: [...conceptScores.values()] });
  await tx.insertGateAttempt({ scope: "chapter", scopeId: chapter.id, itemIds, score, passed, startedAt: since, finishedAt: now });

  if (passed) {
    for (const [conceptId, conceptScore] of conceptScores) {
      const row = await tx.getMastery(conceptId);
      if (!row || row.gatePassedAt !== null) continue;
      if (conceptGatePassed({ pMastery: row.pMastery, gateScore: conceptScore, rapidGuessOnGate: false })) {
        row.gatePassedAt = now;
        row.state = masteryState({ pMastery: row.pMastery, gated: true, rusty: false, attempts: row.attempts, reviewDue: false });
        await tx.upsertMastery(row);
      }
    }
  }
  return { passed, correct, total: itemIds.length, needPct: 90 };
}

async function awardMinute(tx: LearnerTx, sessionId: string, now: number, rapidGuess: boolean): Promise<void> {
  const xp = xpForMinute({ qualifyingActions: 1, idleGapMs: 0, majorityRapidGuess: rapidGuess, videoHidden: false });
  if (xp > 0) await tx.awardXp(sessionId, truncateMinute(now), xp);
}

export async function startSession(
  repo: EngineRepo,
  actor: EngineActor,
  args: { entryPoint: string; chapterId?: string | null; now?: number },
): Promise<{ sessionId: string | null; preview: boolean; chapter: ChapterProgress | null }> {
  const now = args.now ?? Date.now();
  const chapter = args.chapterId ? visibleChapter(args.chapterId, actor.role) : null;
  if (!actor.learnerId) {
    const chapterProgress = chapter
      ? { chapterId: chapter.id, readDone: false, nextStep: 0, totalSteps: chapter.items.length, starEarned: false, lastTry: null }
      : null;
    return { sessionId: null, preview: true, chapter: chapterProgress };
  }
  return repo.withLearner(actor.learnerId, async (tx) => {
    const session = await currentSession(tx, null, args.entryPoint, now);
    session.lastEventAt = now;
    if (chapter && session.resumeState.chapterId !== chapter.id) {
      session.resumeState = { ...session.resumeState, chapterId: chapter.id, activityId: null, itemId: null };
    }
    await tx.updateSession(session);
    return { sessionId: session.id, preview: false, chapter: chapter ? publicProgress(await chapterState(tx, chapter)) : null };
  });
}

export async function submitAnswer(
  repo: EngineRepo,
  actor: EngineActor,
  input: { sessionId?: string | null; itemId: string; response: unknown; hintLevel?: unknown; latencyMs?: unknown; eventId?: string | null; now?: number },
): Promise<AnswerFeedback> {
  const now = input.now ?? Date.now();
  const located = locateItem(input.itemId);
  if (!located) throw new EngineError(404, "item_not_found");
  const { chapter, item } = located;
  if (!chapterVisibleTo(chapter, actor.role)) throw new EngineError(403, "chapter_not_available");
  const scored = scoreItem(chapter, item, input.response);
  const base = {
    correct: scored.correct,
    explanation: scored.explanation,
    proving_sentence: scored.proving?.text,
    proving_sentence_id: scored.proving?.id,
    read_aloud_text: scored.explanation,
  };
  if (!actor.learnerId) return { ...base, session_id: null, preview: true, chapter: null, gate: null };

  const hintLevel = clampInt(input.hintLevel, 0, MAX_HINT_LEVEL, 0);
  const latencyMs = typeof input.latencyMs === "number" ? clampInt(input.latencyMs, 0, 3_600_000, 0) : null;
  const eventId = input.eventId && UUID_RE.test(input.eventId) ? input.eventId : crypto.randomUUID();

  return repo.withLearner(actor.learnerId, async (tx) => {
    const session = await currentSession(tx, input.sessionId ?? null, "study", now);
    const attemptNo = (await tx.countAnswers(session.id, item.id)) + 1;
    const inserted = await tx.insertEvent({
      id: eventId,
      sessionId: session.id,
      learnerId: tx.learnerId,
      seq: Math.min(2 ** 31 - 1, Math.max(0, now - session.startedAt)),
      clientTs: null,
      serverTs: now,
      type: "answer_submitted",
      itemId: item.id,
      activityId: item.activityId,
      attemptNo,
      response: input.response ?? null,
      isCorrect: scored.correct,
      latencyMs,
      hintLevel,
      payload: {
        chapter_id: chapter.id,
        item_stem: item.stem,
        correct_answer: typeof item.answer === "string" ? item.answer : JSON.stringify(item.answer),
        subject: chapter.subject,
        concept_id: item.conceptId,
      },
      isPreview: false,
    });
    if (!inserted) {
      return { ...base, session_id: session.id, preview: false, chapter: publicProgress(await chapterState(tx, chapter)), gate: null };
    }

    const rapidGuess = latencyMs !== null && latencyMs < RAPID_GUESS_MS && !scored.correct;
    await applyAnswer(tx, session, item, { correct: scored.correct, hintLevel, firstAttempt: attemptNo === 1, rapidGuess, now });
    const guessed = latencyMs !== null && classifyGuess(latencyMs, 8000, scored.correct, 0);
    await tx.insertStrategy({
      eventId,
      conceptId: item.conceptId,
      strategy: guessed ? "guess" : scored.correct ? "unknown" : "unknown",
      source: "inferred_rules",
      confidence: guessed ? 0.7 : 0.3,
      misconception: null,
      isCorrect: scored.correct,
    });
    await awardMinute(tx, session.id, now, rapidGuess);

    let state = await chapterState(tx, chapter);
    let gate: GateOutcome | null = null;
    if (state.nextStep >= chapter.items.length) {
      gate = await runChapterGate(tx, chapter, state.attemptSince, now);
      state = await chapterState(tx, chapter);
    }
    session.lastEventAt = now;
    session.resumeState = {
      ...session.resumeState,
      chapterId: chapter.id,
      activityId: item.activityId,
      itemId: chapter.items[state.nextStep]?.id ?? null,
    };
    await tx.updateSession(session);
    return { ...base, session_id: session.id, preview: false, chapter: publicProgress(state), gate };
  });
}

export type ClientEvent = {
  id?: unknown;
  type?: unknown;
  activityId?: unknown;
  itemId?: unknown;
  clientTs?: unknown;
  payload?: unknown;
};

function asClientType(value: unknown): ClientEventType | null {
  return (CLIENT_EVENT_TYPES as readonly string[]).includes(String(value)) ? (value as ClientEventType) : null;
}

function smallPayload(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const json = JSON.stringify(value);
  return json.length <= 2000 ? (JSON.parse(json) as Record<string, unknown>) : null;
}

/** Non-answer events. Unknown types, oversized payloads, and client-claimed answers are dropped. */
export async function recordEvents(
  repo: EngineRepo,
  actor: EngineActor,
  input: { sessionId?: string | null; events: ClientEvent[]; entryPoint?: string; now?: number },
): Promise<{ accepted: number; rejected: number; session_id: string | null }> {
  const now = input.now ?? Date.now();
  const batch = input.events.slice(0, MAX_EVENTS_PER_BATCH);
  const overflow = input.events.length - batch.length;
  if (!actor.learnerId) return { accepted: 0, rejected: input.events.length, session_id: null };
  return repo.withLearner(actor.learnerId, async (tx) => {
    const session = await currentSession(tx, input.sessionId ?? null, input.entryPoint ?? "study", now);
    let accepted = 0;
    let rejected = overflow;
    for (const raw of batch) {
      const type = asClientType(raw.type);
      const activityId = typeof raw.activityId === "string" ? raw.activityId.slice(0, 80) : null;
      const itemId = typeof raw.itemId === "string" && locateItem(raw.itemId) ? raw.itemId : null;
      const payload = smallPayload(raw.payload);
      if (!type) {
        rejected += 1;
        continue;
      }
      if (type === "read_done") {
        const chapter = activityId ? getChapter(activityId) : null;
        if (!chapter || !chapterVisibleTo(chapter, actor.role)) {
          rejected += 1;
          continue;
        }
        session.resumeState = { ...session.resumeState, chapterId: chapter.id };
      }
      const clientTs = typeof raw.clientTs === "number" && Number.isFinite(raw.clientTs) ? raw.clientTs : null;
      const inserted = await tx.insertEvent({
        id: typeof raw.id === "string" && UUID_RE.test(raw.id) ? raw.id : crypto.randomUUID(),
        sessionId: session.id,
        learnerId: tx.learnerId,
        seq: Math.min(2 ** 31 - 1, Math.max(0, now - session.startedAt)),
        clientTs,
        serverTs: now,
        type,
        itemId,
        activityId,
        attemptNo: null,
        response: null,
        isCorrect: null,
        latencyMs: null,
        hintLevel: type === "hint_requested" ? clampInt(payload?.level, 1, MAX_HINT_LEVEL, 1) : null,
        payload,
        isPreview: false,
      });
      if (!inserted) continue;
      accepted += 1;
      const engaged = type === "read_done" || type === "game_event" || (type === "heartbeat" && payload?.visible === true);
      if (engaged) await awardMinute(tx, session.id, now, false);
    }
    session.lastEventAt = now;
    await tx.updateSession(session);
    return { accepted, rejected, session_id: session.id };
  });
}

export async function chapterProgressFor(repo: EngineRepo, actor: EngineActor, chapterId: string): Promise<ChapterProgress | null> {
  const chapter = visibleChapter(chapterId, actor.role);
  if (!actor.learnerId) return null;
  return repo.withLearner(actor.learnerId, async (tx) => publicProgress(await chapterState(tx, chapter)));
}

export type ResumePoint = { chapterId: string; titleKid: string; progress: ChapterProgress };

export async function resumePoint(repo: EngineRepo, actor: EngineActor): Promise<ResumePoint | null> {
  if (!actor.learnerId) return null;
  return repo.withLearner(actor.learnerId, async (tx) => {
    const session = await tx.latestOpenSession();
    const chapterId = session?.resumeState.chapterId;
    const chapter = chapterId ? getChapter(chapterId) : null;
    if (!chapter || !chapterVisibleTo(chapter, actor.role)) return null;
    return { chapterId: chapter.id, titleKid: chapter.titleKid, progress: publicProgress(await chapterState(tx, chapter)) };
  });
}

export type ProgressSummary = {
  rings: { id: string; label: string; pct: number }[];
  xp_total: number;
  xp_today: number;
  streak_days: number;
  badges: string[];
};

function etWeekStartKey(now: Date): string {
  const today = etDateKey(now);
  const [y, m, d] = today.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
  const daysSinceMonday = (noonUtc.getUTCDay() + 6) % 7;
  noonUtc.setUTCDate(noonUtc.getUTCDate() - daysSinceMonday);
  return noonUtc.toISOString().slice(0, 10);
}

function streakDays(dayKeys: Set<string>, now: Date): number {
  const cursor = new Date(`${etDateKey(now)}T12:00:00Z`);
  if (!dayKeys.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function progressSummary(repo: EngineRepo, actor: EngineActor, nowMs = Date.now()): Promise<ProgressSummary> {
  const chapters = listChapters().filter((chapter) => chapterVisibleTo(chapter, actor.role));
  if (!actor.learnerId) return { rings: [], xp_total: 0, xp_today: 0, streak_days: 0, badges: [] };
  const now = new Date(nowMs);
  return repo.withLearner(actor.learnerId, async (tx) => {
    const passed = new Set(await tx.passedGateScopeIds("chapter"));
    const everCorrect = await tx.correctItemsSince(
      chapters.flatMap((chapter) => chapter.items.map((item) => item.id)),
      0,
    );
    const rings = chapters.map((chapter) => {
      const done = chapter.items.filter((item) => everCorrect.has(item.id)).length;
      const pct = passed.has(chapter.id) ? 100 : Math.min(95, ringPercent(done, chapter.items.length));
      return { id: chapter.id, label: chapter.titleKid, pct };
    });
    for (const subject of [...new Set(chapters.map((chapter) => chapter.subject))]) {
      const group = chapters.filter((chapter) => chapter.subject === subject);
      rings.push({ id: `subject:${subject}`, label: subject, pct: ringPercent(group.filter((c) => passed.has(c.id)).length, group.length) });
    }
    const xp = await tx.xpRows();
    const todayKey = etDateKey(now);
    const weekStart = etWeekStartKey(now);
    const dayKeys = new Set<string>();
    let xpTotal = 0;
    let xpToday = 0;
    let xpWeek = 0;
    for (const row of xp) {
      const key = etDateKey(new Date(row.minuteStart));
      dayKeys.add(key);
      xpTotal += row.xp;
      if (key === todayKey) xpToday += row.xp;
      if (key >= weekStart) xpWeek += row.xp;
    }
    rings.push({ id: "week", label: "This week", pct: ringPercent(xpWeek, WEEKLY_XP_GOAL) });
    return {
      rings,
      xp_total: xpTotal,
      xp_today: xpToday,
      streak_days: streakDays(dayKeys, now),
      badges: chapters.filter((chapter) => passed.has(chapter.id)).map((chapter) => `${chapter.id}-star`),
    };
  });
}

const TAG_RE = /^[a-z0-9][a-z0-9 _-]{0,39}$/i;

export async function saveLikes(repo: EngineRepo, actor: EngineActor, tags: unknown): Promise<LikeRow[]> {
  if (!actor.learnerId) throw new EngineError(403, "no_learner");
  const rows = (Array.isArray(tags) ? tags : [])
    .slice(0, 50)
    .filter((row): row is { tag: string; liked: boolean } => typeof row?.tag === "string" && TAG_RE.test(row.tag) && typeof row?.liked === "boolean")
    .map((row) => ({ interestTag: row.tag.toLowerCase(), liked: row.liked }));
  return repo.withLearner(actor.learnerId, async (tx) => {
    if (rows.length) await tx.saveLikes(rows);
    return tx.getLikes();
  });
}

export async function getLikes(repo: EngineRepo, actor: EngineActor): Promise<LikeRow[]> {
  if (!actor.learnerId) return [];
  return repo.withLearner(actor.learnerId, (tx) => tx.getLikes());
}

export type DailyXpEntry = { date: string; xp: number };

export async function dailyXpCalendar(
  repo: EngineRepo,
  actor: EngineActor,
  daysBack = 60,
  nowMs = Date.now(),
): Promise<DailyXpEntry[]> {
  if (!actor.learnerId) return [];
  const cutoff = nowMs - daysBack * 24 * 60 * 60 * 1000;
  return repo.withLearner(actor.learnerId, async (tx) => {
    const xp = await tx.xpRows();
    const byDay = new Map<string, number>();
    for (const row of xp) {
      if (row.minuteStart < cutoff) continue;
      const key = etDateKey(new Date(row.minuteStart));
      byDay.set(key, (byDay.get(key) ?? 0) + row.xp);
    }
    return [...byDay.entries()]
      .map(([date, xp]) => ({ date, xp }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}

export type StudentProgress = {
  starsEarned: number;
  chaptersCompleted: string[];
  totalChapters: number;
  xpTotal: number;
  streakDays: number;
  badges: { id: string; label: string; earnedAt: string }[];
  dailyXp: DailyXpEntry[];
};

export async function studentProgress(
  repo: EngineRepo,
  actor: EngineActor,
  nowMs = Date.now(),
): Promise<StudentProgress> {
  const chapters = listChapters().filter((chapter) => chapterVisibleTo(chapter, actor.role));
  if (!actor.learnerId) {
    return {
      starsEarned: 0,
      chaptersCompleted: [],
      totalChapters: chapters.length,
      xpTotal: 0,
      streakDays: 0,
      badges: [],
      dailyXp: [],
    };
  }
  const now = new Date(nowMs);
  return repo.withLearner(actor.learnerId, async (tx) => {
    const passed = new Set(await tx.passedGateScopeIds("chapter"));
    const xp = await tx.xpRows();
    const dayKeys = new Set<string>();
    let xpTotal = 0;
    const cutoff = nowMs - 60 * 24 * 60 * 60 * 1000;
    const byDay = new Map<string, number>();

    for (const row of xp) {
      const key = etDateKey(new Date(row.minuteStart));
      dayKeys.add(key);
      xpTotal += row.xp;
      if (row.minuteStart >= cutoff) {
        byDay.set(key, (byDay.get(key) ?? 0) + row.xp);
      }
    }

    const completedChapters = chapters.filter((c) => passed.has(c.id));
    const badges = completedChapters.map((chapter) => ({
      id: `${chapter.id}-star`,
      label: `${chapter.titleKid} Star`,
      earnedAt: etDateKey(now),
    }));

    return {
      starsEarned: completedChapters.length,
      chaptersCompleted: completedChapters.map((c) => c.id),
      totalChapters: chapters.length,
      xpTotal,
      streakDays: streakDays(dayKeys, now),
      badges,
      dailyXp: [...byDay.entries()]
        .map(([date, xp]) => ({ date, xp }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  });
}
