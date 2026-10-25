import type { AppRole } from "@/lib/auth/allowlist";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import type { ChapterPack } from "@/lib/content/types";
import type { EngineRepo, LearnerTx, SessionPlanRecord } from "@/lib/engine/repo";
import { etDayStart } from "@/lib/engine/plan-time";
import { etDateKey } from "@/lib/engine/scheduler";
import { RAPID_GUESS_MS, RETEACH_TARGET, locateItem } from "@/lib/engine/service";
import { warmupQueue } from "@/lib/engine/warmup";
import { aiOrderPlan, type PlannerFacts, type AiPlanResult } from "@/lib/engine/ai-planner";

export const DEFAULT_DAILY_MINUTES = 15;
/** Safety cap on AI planner calls per learner per ET day (guards against sign-in loops). */
export const AI_PLAN_DAILY_CAP = 10;

export type PlanBlockKind = "reteach" | "warmup" | "assignment" | "chapter" | "game";

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
export async function liveCandidates(tx: LearnerTx, role: AppRole, nowMs: number, random = Math.random): Promise<Live> {
  const dayStart = etDayStart(nowMs);
  const blocks: PlanBlock[] = [];
  const visible = listChapters().filter((c) => chapterVisibleTo(c, role));
  const passed = new Set(await tx.passedGateScopeIds("chapter"));

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

  // 4. Current chapter: the resume chapter if unfinished, else the first unpassed one.
  const session = await tx.latestOpenSession();
  const resumeId = session?.resumeState.chapterId;
  const current =
    (resumeId && !passed.has(resumeId) ? visible.find((c) => c.id === resumeId) : undefined) ?? visible.find((c) => !passed.has(c.id));
  if (current && !blocks.some((b) => b.href === chapterHref(current.id))) {
    blocks.push({
      id: `chapter:${current.id}`,
      kind: "chapter",
      title: current.titleKid,
      href: chapterHref(current.id),
      minutes: 10,
      done: false,
      locked: false,
      conceptIds: [...new Set(current.items.map((i) => i.conceptId))],
    });
  }

  // 5. A game.
  blocks.push({
    id: "game",
    kind: "game",
    title: "Game time",
    href: "/games",
    minutes: 5,
    done: today.some((e) => e.type === "game_event"),
    locked: false,
    conceptIds: [],
  });

  const goal = await tx.getGoal();
  const goalMinutes = goal?.dailyMinutesGoal ?? DEFAULT_DAILY_MINUTES;
  const minutesToday = (await tx.xpRows()).filter((r) => r.minuteStart >= dayStart).length;

  // De-identified facts for the AI planner.
  const week = await tx.eventsSince(nowMs - 7 * 86_400_000, ["answer_submitted"]);
  const firstTries = week.filter((e) => e.attemptNo === 1);
  const rushed = week.filter((e) => e.latencyMs !== null && e.latencyMs < RAPID_GUESS_MS && e.isCorrect === false);
  const candidates = [];
  for (const b of blocks.filter((x) => !x.done)) {
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
    });
  }
  const facts: PlannerFacts = {
    minutes_goal: goalMinutes,
    minutes_today: minutesToday,
    recent_accuracy: firstTries.length ? Math.round((firstTries.filter((e) => e.isCorrect).length / firstTries.length) * 100) / 100 : null,
    recent_answers: firstTries.length,
    rush_rate: week.length ? Math.round((rushed.length / week.length) * 100) / 100 : 0,
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

export type PlanDeps = { ai?: (facts: PlannerFacts) => Promise<AiPlanResult | null>; random?: () => number };

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
  return repo.withLearner(actor.learnerId, async (tx) => {
    const live = await liveCandidates(tx, actor.role, nowMs, deps.random);
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
    let note = "Deterministic plan: re-teach, warm-up, Dad's picks, chapter, game.";
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
