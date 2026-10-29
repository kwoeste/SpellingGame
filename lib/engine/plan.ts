import type { AppRole } from "@/lib/auth/allowlist";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import type { ChapterPack } from "@/lib/content/types";
import type { EngineRepo, LearnerTx, SessionPlanRecord } from "@/lib/engine/repo";
import { etDayStart } from "@/lib/engine/plan-time";
import { etDateKey } from "@/lib/engine/scheduler";
import { RAPID_GUESS_MS, RETEACH_TARGET, locateItem } from "@/lib/engine/service";
import { warmupQueue } from "@/lib/engine/warmup";
import { preferredBySubject } from "@/lib/engine/learning-insight";
import { eligibleArms } from "@/lib/engine/modality";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { DEFAULT_UPCOMING, activeUpcomingTests, practiceTestHref, upcomingHref, type UpcomingTest } from "@/lib/practice/upcoming";
import { daysUntil, masteredCount } from "@/lib/spelling/engine";
import { D2_WORDS, LIST_ID, LIST_SHORT_TITLE } from "@/lib/spelling/list-d2";
import { learnerSpellingStats, SPELLING_EVENT } from "@/lib/spelling/service";
import type { SubjectId } from "@/lib/content/types";
import { aiOrderPlan, type PlannerFacts, type AiPlanResult } from "@/lib/engine/ai-planner";

export const DEFAULT_DAILY_MINUTES = 15;
/** Safety cap on AI planner calls per learner per ET day (guards against sign-in loops). */
export const AI_PLAN_DAILY_CAP = 10;

export type PlanBlockKind = "reteach" | "warmup" | "assignment" | "chapter" | "game" | "spelling" | "test";

export type PlanBlock = {
  id: string;
  kind: PlanBlockKind;
  title: string;
  href: string;
  minutes: number;
  done: boolean;
  /** Re-teach and warm-up stay first in that order; the AI planner may only reorder the rest. */
  locked: boolean;
  conceptIds: string[];
  due?: number;
  /** Short status line under the title (e.g. "8 days left · 14 of 25 mastered"). */
  detail?: string;
};

export type TodayPlan = {
  blocks: PlanBlock[];
  goalMinutes: number;
  minutesToday: number;
  timeBack: boolean;
  whyKid: string;
  /** Admin-only one-liner (never rendered to the student). */
  adminNote: string;
  source: "deterministic" | "ai";
};

type Live = { blocks: PlanBlock[]; goalMinutes: number; minutesToday: number; facts: PlannerFacts };

function chapterHref(id: string): string {
  return `/study/${encodeURIComponent(id)}`;
}

function chapterForConcept(conceptId: string, role: AppRole): ChapterPack | null {
  return listChapters().find((c) => chapterVisibleTo(c, role) && c.items.some((i) => i.conceptId === conceptId)) ?? null;
}

/** Deterministic candidate blocks with live done flags. Never calls the network. */
/** Subjects in the order they rotate when she's never touched any (reading first). */
export const SUBJECT_ROTATION: SubjectId[] = ["ela", "science", "religion", "math"];
export const ROTATION_SLOTS = 2;
const ROTATION_LOOKBACK_MS = 60 * 86_400_000;

/** Last time she worked in each subject, from answers, reads and watches in the database. */
export async function subjectLastWorked(tx: LearnerTx, nowMs: number): Promise<Partial<Record<SubjectId, number>>> {
  const events = await tx.eventsSince(nowMs - ROTATION_LOOKBACK_MS, ["answer_submitted", "read_done", "watch_done"]);
  const out: Partial<Record<SubjectId, number>> = {};
  for (const e of events) {
    const ch = (e.itemId ? locateItem(e.itemId)?.chapter : null) ?? (e.activityId ? getChapter(e.activityId) : null);
    if (ch) out[ch.subject] = Math.max(out[ch.subject] ?? 0, e.serverTs);
  }
  return out;
}

/** Pure ordering: least recently worked subject first; never-worked subjects first, in SUBJECT_ROTATION order. */
export function rotateSubjects(subjects: SubjectId[], last: Partial<Record<SubjectId, number>>): SubjectId[] {
  const rank = (s: SubjectId) => (SUBJECT_ROTATION.indexOf(s) + 99) % 99;
  return [...new Set(subjects)].sort((a, b) => (last[a] ?? 0) - (last[b] ?? 0) || rank(a) - rank(b));
}

async function rotationPicks(tx: LearnerTx, visible: ChapterPack[], passed: Set<string>, resumeId: string | null, nowMs: number): Promise<ChapterPack[]> {
  const open = visible.filter((c) => !passed.has(c.id));
  const order = rotateSubjects(open.map((c) => c.subject), await subjectLastWorked(tx, nowMs));
  return order.slice(0, ROTATION_SLOTS).map((subject) => open.find((c) => c.id === resumeId && c.subject === subject) ?? open.find((c) => c.subject === subject)!);
}

export async function liveCandidates(tx: LearnerTx, role: AppRole, nowMs: number, random = Math.random, upcoming: UpcomingTest[] = DEFAULT_UPCOMING): Promise<Live> {
  const dayStart = etDayStart(nowMs);
  const blocks: PlanBlock[] = [];
  const visible = listChapters().filter((c) => chapterVisibleTo(c, role));
  const passed = new Set(await tx.passedGateScopeIds("chapter"));

  // 0. Dated items (class tests, spelling lists) go first, soonest test first, until their date passes.
  const goalRow = await tx.getGoal();
  const sessionGoal = goalRow?.dailyMinutesGoal ?? DEFAULT_DAILY_MINUTES;
  const active = activeUpcomingTests(nowMs, upcoming);
  const todayDated = active.length ? await tx.eventsSince(dayStart - 1, ["game_event", SPELLING_EVENT]) : [];
  /** Within a day of a test, dated items may fill the whole session (subject rotation steps aside). */
  let crunch = false;
  const coveredChapters = new Set<string>();
  for (const t of active) {
    const days = daysUntil(t.testDate, nowMs);
    const daysText = t.isTestDay ? "Test today!" : days === 1 ? "Test tomorrow!" : `${days} days left`;
    if (t.kind === "spelling") {
      if (t.refId !== LIST_ID) continue;
      const stats = await learnerSpellingStats(tx);
      const mastered = masteredCount(stats);
      const today = todayDated.filter((e) => e.activityId === LIST_ID);
      const firstTryRight = today.filter((e) => e.type === SPELLING_EVENT && e.isCorrect && e.payload?.first_try === true).length;
      const mockDone = today.some((e) => e.type === "game_event" && e.payload?.game_id === LIST_ID && e.payload?.detail === "finished" && e.payload?.mode === "mock");
      if (days <= 1) crunch = true;
      blocks.push({
        id: `upcoming:${t.id}`,
        kind: "spelling",
        title: t.isTestDay ? `${LIST_SHORT_TITLE}: test today! One last mock test` : LIST_SHORT_TITLE,
        href: upcomingHref(t),
        minutes: days <= 1 ? sessionGoal : 10,
        done: mastered === D2_WORDS.length ? firstTryRight >= 5 || mockDone : firstTryRight >= 15 || (mockDone && firstTryRight >= 25),
        locked: true,
        conceptIds: [],
        detail: `${daysText} · ${mastered} of ${D2_WORDS.length} mastered`,
      });
      continue;
    }
    const chapter = getChapter(t.refId);
    if (!chapter || !chapterVisibleTo(chapter, role)) continue;
    coveredChapters.add(chapter.id);
    if (days <= 1) crunch = true;
    if (t.kind === "practice-test") {
      const finished = todayDated.filter((e) => e.type === "game_event" && e.payload?.game_id === "practice-test" && e.payload?.detail === "finished" && e.payload?.chapter_id === t.refId);
      const fullDone = finished.some((e) => e.payload?.mode !== "retry");
      blocks.push({
        id: `practice-test:${t.id}`,
        kind: "assignment",
        title: t.isTestDay ? "Test today! Retry missed, then 1 full practice test" : `Test prep: Learn it + full practice test (${chapter.titleKid})`,
        href: practiceTestHref(t.refId, t.isTestDay ? "retry" : undefined),
        minutes: t.isTestDay ? 10 : 20,
        done: t.isTestDay ? fullDone && finished.some((e) => e.payload?.mode === "retry") || (fullDone && finished.length >= 2) : fullDone,
        locked: true,
        conceptIds: [...new Set(chapter.items.map((i) => i.conceptId))],
        detail: daysText,
      });
    } else {
      blocks.push({
        id: `upcoming:${t.id}`,
        kind: "test",
        title: `Test prep: ${t.title}`,
        href: upcomingHref(t),
        minutes: days <= 1 ? sessionGoal : 10,
        done: false,
        locked: true,
        conceptIds: [...new Set(chapter.items.map((i) => i.conceptId))],
        detail: daysText,
      });
    }
  }

  // 1. Re-teach (open flags whose time has come).
  const reteach = (await tx.listReviews(RETEACH_TARGET)).filter((r) => r.lastResult === "fail" && r.dueAt <= nowMs);
  for (const row of reteach.sort((a, b) => a.dueAt - b.dueAt).slice(0, 3)) {
    const located = locateItem(row.targetId);
    if (!located || !chapterVisibleTo(located.chapter, role)) continue;
    blocks.push({
      id: `reteach:${located.item.id}`,
      kind: "reteach",
      title: `Fix-it: ${located.chapter.titleKid}`,
      href: `${chapterHref(located.chapter.id)}?reteach=${encodeURIComponent(located.item.id)}`,
      minutes: 3,
      done: false,
      locked: true,
      conceptIds: [located.item.conceptId],
    });
  }

  // 2. Warm-up: due spaced reviews.
  const today = await tx.eventsSince(dayStart - 1, ["answer_submitted", "game_event"]);
  const warm = await warmupQueue(tx, role, nowMs, random);
  const reviewedToday = today.some((e) => e.type === "answer_submitted" && e.payload?.mode === "review");
  if (warm.length || reviewedToday) {
    blocks.push({
      id: "warmup",
      kind: "warmup",
      title: warm.length ? `Warm-up: ${warm.length} quick review${warm.length === 1 ? "" : "s"}` : "Warm-up",
      href: "/study/warmup",
      minutes: Math.max(2, Math.ceil(warm.length * 0.5)),
      done: warm.length === 0,
      locked: true,
      conceptIds: [...new Set(warm.map((w) => w.conceptId))],
      due: warm.length,
    });
  }

  // 3. Dad's assignments (titles come from the catalog, not the free-text assignment row).
  for (const a of (await tx.openAssignments()).slice(0, 3)) {
    let chapter: ChapterPack | null = null;
    if (a.targetType === "chapter") chapter = getChapter(a.targetId);
    if (a.targetType === "concept") chapter = chapterForConcept(a.targetId, role);
    if (a.targetType === "game") {
      blocks.push({ id: `assignment:${a.id}`, kind: "assignment", title: "Dad's pick: a game", href: "/games", minutes: 5, done: false, locked: false, conceptIds: [] });
      continue;
    }
    if (!chapter || !chapterVisibleTo(chapter, role)) continue;
    if (a.targetType === "chapter" && coveredChapters.has(chapter.id)) continue; // covered by the dated block
    blocks.push({
      id: `assignment:${a.id}`,
      kind: "assignment",
      title: `Dad's pick: ${chapter.titleKid}`,
      href: chapterHref(chapter.id),
      minutes: 8,
      done: false,
      locked: false,
      conceptIds: a.targetType === "concept" ? [a.targetId] : [...new Set(chapter.items.map((i) => i.conceptId))],
    });
  }

  // 4. Subject rotation: the subjects she worked on least recently go next (from her real history),
  //    each at its current chapter, so every subject makes slow, steady progress. Locked so the order holds.
  if (!crunch) {
    const session = await tx.latestOpenSession();
    for (const pick of await rotationPicks(tx, visible, passed, session?.resumeState.chapterId ?? null, nowMs)) {
      if (blocks.some((b) => b.href === chapterHref(pick.id))) continue;
      const first = !blocks.some((b) => b.id.startsWith("chapter:"));
      blocks.push({
        id: `chapter:${pick.id}`,
        kind: "chapter",
        title: pick.titleKid,
        href: chapterHref(pick.id),
        minutes: first ? 10 : 8,
        done: false,
        // The least-recent subject is pinned right after dated items; the rest stay orderable by the AI planner.
        locked: first,
        conceptIds: [...new Set(pick.items.map((i) => i.conceptId))],
      });
    }
  }

  // 5. A game.
  blocks.push({
    id: "game",
    kind: "game",
    title: "Game time",
    href: "/games",
    minutes: 5,
    done: today.some((e) => e.type === "game_event" && e.payload?.game_id !== "practice-test" && e.payload?.game_id !== LIST_ID),
    locked: false,
    conceptIds: [],
  });

  const goalMinutes = sessionGoal;
  const minutesToday = (await tx.xpRows()).filter((r) => r.minuteStart >= dayStart).length;

  // De-identified facts for the AI planner.
  const week = await tx.eventsSince(nowMs - 7 * 86_400_000, ["answer_submitted"]);
  const firstTries = week.filter((e) => e.attemptNo === 1);
  const rushed = week.filter((e) => e.latencyMs !== null && e.latencyMs < RAPID_GUESS_MS && e.isCorrect === false);
  const hint = preferredBySubject((await tx.latestInsight().catch(() => null))?.weights);
  const candidates = [];
  for (const b of blocks.filter((x) => !x.done)) {
    const m = /^\/study\/([^/?#]+)/.exec(b.href);
    const ch = m ? getChapter(decodeURIComponent(m[1])) : null;
    const pref = ch ? hint[ch.subject] : undefined;
    const suggested = ch && pref && eligibleArms(ch.id, b.kind === "reteach" ? "reteach" : "first_teach").includes(pref) ? pref : undefined;
    const ms = [];
    for (const c of b.conceptIds.slice(0, 6)) {
      const row = await tx.getMastery(c);
      if (row) ms.push(row.pMastery);
    }
    candidates.push({
      id: b.id,
      kind: b.kind,
      title: b.title,
      locked: b.locked,
      minutes: b.minutes,
      concept_ids: b.conceptIds.slice(0, 6),
      mastery: ms.length ? Math.round((ms.reduce((s, v) => s + v, 0) / ms.length) * 100) / 100 : null,
      due_reviews: b.due ?? 0,
      ...(suggested ? { suggested_start: suggested } : {}),
    });
  }
  const facts: PlannerFacts = {
    minutes_goal: goalMinutes,
    minutes_today: minutesToday,
    recent_accuracy: firstTries.length ? Math.round((firstTries.filter((e) => e.isCorrect).length / firstTries.length) * 100) / 100 : null,
    recent_answers: firstTries.length,
    rush_rate: week.length ? Math.round((rushed.length / week.length) * 100) / 100 : 0,
    ...(Object.keys(hint).length ? { learning_hint: hint } : {}),
    candidates,
  };
  return { blocks, goalMinutes, minutesToday, facts };
}

function deterministicOrder(blocks: PlanBlock[]): string[] {
  return blocks.map((b) => b.id);
}

function defaultWhy(blocks: PlanBlock[]): string {
  if (blocks.some((b) => b.kind === "reteach" && !b.done)) return "First we fix one tricky spot, then new stuff!";
  if (blocks.some((b) => b.kind === "warmup" && !b.done)) return "A quick warm-up wakes up what you already know.";
  return "Finish your minutes and the rest of the day is yours!";
}

type CachedPlan = { order: string[]; whyKid: string; adminNote: string; snapshot: PlanBlock[] };

/** Cached order + live state: progress updates checkmarks without a new AI call. */
export function applyCached(cached: CachedPlan, live: PlanBlock[]): PlanBlock[] {
  const byId = new Map(live.map((b) => [b.id, b]));
  const snap = new Map(cached.snapshot.map((b) => [b.id, b]));
  const out: PlanBlock[] = [];
  for (const id of cached.order) {
    const now = byId.get(id);
    if (now) out.push(now);
    else if (snap.has(id)) out.push({ ...snap.get(id)!, done: true });
  }
  for (const b of live) if (!cached.order.includes(b.id)) out.push(b);
  // Locked blocks (re-teach, warm-up) stay at the top whatever the cache says.
  return [...out.filter((b) => b.locked), ...out.filter((b) => !b.locked)];
}

function toPlan(blocks: PlanBlock[], live: Live, why: string, note: string, source: TodayPlan["source"]): TodayPlan {
  return {
    blocks,
    goalMinutes: live.goalMinutes,
    minutesToday: live.minutesToday,
    timeBack: live.minutesToday >= live.goalMinutes,
    whyKid: why,
    adminNote: note,
    source,
  };
}

export type PlanDeps = { ai?: (facts: PlannerFacts) => Promise<AiPlanResult | null>; random?: () => number; upcoming?: UpcomingTest[] };

/**
 * Today's plan. With a sign-in id, the first request of that sign-in builds the plan (AI-ordered
 * when allowed) and caches it; every later page load in the same sign-in reuses the cached order.
 */
export async function todayPlan(
  repo: EngineRepo,
  actor: { role: AppRole; learnerId: string | null },
  loginId: string | null,
  nowMs = Date.now(),
  deps: PlanDeps = {},
): Promise<TodayPlan | null> {
  if (!actor.learnerId) return null;
  const ai = deps.ai ?? aiOrderPlan;
  const upcoming = deps.upcoming ?? (await loadUpcomingTests());
  return repo.withLearner(actor.learnerId, async (tx) => {
    const live = await liveCandidates(tx, actor.role, nowMs, deps.random, upcoming);
    if (loginId) {
      const cached = await tx.getSessionPlan(loginId);
      if (cached) {
        const p = cached.plan as unknown as CachedPlan;
        return toPlan(applyCached(p, live.blocks), live, p.whyKid, p.adminNote, cached.source);
      }
    }
    const day = etDateKey(new Date(nowMs));
    let order = deterministicOrder(live.blocks);
    let why = defaultWhy(live.blocks);
    let note = "Deterministic plan: dated tests, re-teach, warm-up, subject rotation (least recent first), Dad's picks, game.";
    let source: TodayPlan["source"] = "deterministic";
    let attempted = false;
    const orderable = live.facts.candidates.filter((c) => !c.locked);
    if (loginId && actor.role === "student" && orderable.length > 1 && (await tx.aiPlanAttempts(day)) < AI_PLAN_DAILY_CAP) {
      attempted = true;
      const result = await ai(live.facts).catch(() => null);
      const checked = result && validateAiPlan(result, live.blocks);
      if (checked) {
        order = checked.order;
        why = checked.whyKid;
        note = checked.adminNote;
        source = "ai";
      } else {
        note = "AI planner unavailable or invalid; used the deterministic plan.";
      }
    }
    const blocks = applyCached({ order, whyKid: why, adminNote: note, snapshot: live.blocks }, live.blocks);
    if (loginId) {
      const row: SessionPlanRecord = {
        loginId,
        day,
        plan: { order, whyKid: why, adminNote: note, snapshot: live.blocks } as unknown as Record<string, unknown>,
        source,
        aiAttempted: attempted,
        createdAt: nowMs,
      };
      await tx.saveSessionPlan(row);
    }
    return toPlan(blocks, live, why, note, source);
  });
}

/** Sign-in ids for a parent previewing Mae's plan are namespaced so they never collide with hers. */
export const PREVIEW_LOGIN_PREFIX = "preview:";

/**
 * A parent viewing /study sees the plan Mae would get: same learner, student visibility, same
 * builder. Cached under a "preview:" sign-in id so it never replaces or reuses Mae's own row.
 */
export async function previewPlanForLearner(
  repo: EngineRepo,
  learnerId: string,
  loginId: string | null,
  nowMs = Date.now(),
  deps: PlanDeps = {},
): Promise<TodayPlan | null> {
  const previewId = loginId ? `${PREVIEW_LOGIN_PREFIX}${loginId}`.slice(0, 64) : null;
  return todayPlan(repo, { role: "student", learnerId }, previewId, nowMs, deps);
}

const SAFE_TEXT = /^[\p{L}\p{N}\p{P}\p{Zs}\p{Emoji_Presentation}'’]+$/u;

function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  if (!t || t.length > max || /https?:|www\.|<|>|@/i.test(t) || !SAFE_TEXT.test(t)) return null;
  return t;
}

/**
 * Server-side check of the model's answer. The order must be a permutation of the unfinished,
 * unlocked candidate ids (nothing invented, nothing dropped); lines must be short plain text.
 * Returns the full order (locked blocks first) or null to fall back.
 */
export function validateAiPlan(result: AiPlanResult, blocks: PlanBlock[]): { order: string[]; whyKid: string; adminNote: string } | null {
  if (!result || !Array.isArray(result.order)) return null;
  const orderable = blocks.filter((b) => !b.locked && !b.done).map((b) => b.id);
  const ids = result.order;
  if (ids.length !== orderable.length || new Set(ids).size !== ids.length) return null;
  if (!ids.every((id) => typeof id === "string" && orderable.includes(id))) return null;
  const whyKid = cleanLine(result.why_kid, 120);
  const adminNote = cleanLine(result.admin_note, 200);
  if (!whyKid || !adminNote) return null;
  const locked = blocks.filter((b) => b.locked).map((b) => b.id);
  const rest = blocks.filter((b) => !b.locked && b.done).map((b) => b.id);
  return { order: [...locked, ...ids, ...rest], whyKid, adminNote };
}
