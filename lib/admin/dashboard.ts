import { answerToPlain, resolveAnswer, resolveCorrect } from "@/lib/admin/answer-text";
import { assignmentTitle, chapterDisplayName, catalogChapters, catalogConcept, catalogConcepts, gameTitle, hardPrereqs, locateAdminItem } from "@/lib/admin/catalog";
import { formatEtDateTime, pct, ringProgress, streakDays } from "@/lib/admin/format";
import { chapterFullName, targetName } from "@/lib/admin/names";
import { detectHoles } from "@/lib/admin/holes";
import { isUnknownStrategy, strategyDetail, strategyLabel } from "@/lib/admin/strategy-labels";
import { inferPace, inferStrategy, isRapidGuess } from "@/lib/admin/infer";
import {
  DEFAULT_DAILY_MINUTES_GOAL,
  DEFAULT_WEEKLY_XP_GOAL,
  MASTERY_GATE,
  ZONE_HIGH,
  ZONE_LOW,
  isMasteryState,
  subjectLabel,
  type Alert,
  type AssignmentRow,
  type AssignmentsView,
  type ChapterProgressRow,
  type DayPoint,
  type GoalRing,
  type KnowledgeMapView,
  type KnowledgeNode,
  type LearnerGoal,
  type MasteryState,
  type Overview,
  type RushMeter,
  type ProgressView,
  type SessionHistoryRow,
  type SessionHistoryView,
  type SubjectProgress,
  type WrongAnswerRow,
  type WrongAnswerView,
  type NeedsReteachRow,
} from "@/lib/admin/types";
import type { SubjectId } from "@/lib/content/types";
import { HINT_AT_MISS, HINT_LEVEL_HINTED, HINT_LEVEL_REVEALED } from "@/lib/help/ladder";
import type { AdminEventRow, AdminMasteryRow, ChapterGateRecord, PlaySession, ReviewRow } from "@/lib/engine/repo";
import { intervalDays, isDue, isRusty } from "@/lib/engine/scheduler";

/**
 * "Needs a refresh" means overdue by more than two review gaps. Box-0 items come back ~15 minutes
 * after a miss on purpose, so a same-day re-ask is a normal review, never "rusty".
 */
export function overdueForRefresh(dueAt: number | string | Date, box: number, now: Date): boolean {
  if (intervalDays(box) <= 0) return false;
  return isRusty(new Date(dueAt), box, now);
}

export type XpRow = { learnerId: string; sessionId: string; minuteStart: number; xp: number };

export type StoredStrategy = {
  eventId: string;
  learnerId: string;
  conceptId: string | null;
  strategy: string;
  source: string;
  confidence: number | null;
  misconception: string | null;
  isCorrect: boolean | null;
};

export type DashboardSnapshot = {
  learnerId: string;
  nickname: string;
  now: number;
  mastery: AdminMasteryRow[];
  events: AdminEventRow[];
  sessions: PlaySession[];
  reviews: Array<ReviewRow & { learnerId: string }>;
  xp: XpRow[];
  strategies: StoredStrategy[];
  assignments: AssignmentRow[];
  goal: LearnerGoal | null;
  gatedChapterIds: string[];
  /** Chapter star checks, oldest first. Optional so older fixtures still load. */
  chapterGates?: ChapterGateRecord[];
};

const SUBJECTS: SubjectId[] = ["math", "science", "ela", "religion"];

function forLearner<T extends { learnerId: string }>(rows: T[], learnerId: string): T[] {
  return rows.filter((row) => row.learnerId === learnerId);
}

function dayKey(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

function todayKey(now: number): string {
  return dayKey(now);
}

function weekStartKey(now: number): string {
  const today = dayKey(now);
  const [y, m, d] = today.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  noonUtc.setUTCDate(noonUtc.getUTCDate() - ((noonUtc.getUTCDay() + 6) % 7));
  return noonUtc.toISOString().slice(0, 10);
}

function resolveState(args: {
  stored: string | undefined;
  attempts: number;
  reviewDue: boolean;
  rusty: boolean;
}): MasteryState {
  if (args.rusty) return "rusty";
  if (args.reviewDue && args.stored === "mastered") return "review_due";
  if (args.stored && isMasteryState(args.stored)) return args.stored;
  if (args.attempts === 0) return "not_started";
  return "in_progress";
}

function milestoneFrontier(nodes: KnowledgeNode[]): number | null {
  if (nodes.every((node) => node.state === "not_started")) return null;
  const levels = [...new Set(nodes.map((node) => node.milestoneLevel))].sort((a, b) => a - b);
  let frontier: number | null = null;
  for (const level of levels) {
    const upTo = nodes.filter((node) => node.milestoneLevel <= level);
    if (upTo.length === 0) continue;
    const mastered = upTo.filter((node) => node.state === "mastered" || node.state === "review_due").length;
    if (mastered / upTo.length >= MASTERY_GATE) frontier = level;
  }
  return frontier;
}

function gradeBands(nodes: KnowledgeNode[]): SubjectProgress["gradeSpread"] {
  const buckets = new Map<string, { count: number; mastered: number }>();
  for (const node of nodes) {
    const band = String(Math.floor(node.milestoneLevel));
    const cur = buckets.get(band) ?? { count: 0, mastered: 0 };
    cur.count += 1;
    if (node.state === "mastered" || node.state === "review_due") cur.mastered += 1;
    buckets.set(band, cur);
  }
  return [...buckets.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([band, value]) => ({ band: `Grade ${band}`, ...value }));
}

export function buildKnowledgeNodes(snap: DashboardSnapshot): KnowledgeNode[] {
  const mastery = new Map(forLearner(snap.mastery, snap.learnerId).map((row) => [row.conceptId, row]));
  const reviews = forLearner(snap.reviews, snap.learnerId);
  const now = new Date(snap.now);
  return catalogConcepts().map((concept) => {
    const row = mastery.get(concept.id);
    const review = reviews.find((item) => item.targetType === "concept" && item.targetId === concept.id);
    const reviewDue = Boolean(review && isDue(new Date(review.dueAt), now));
    const rusty = Boolean(review && overdueForRefresh(review.dueAt, review.box, now)) || row?.state === "rusty";
    return {
      id: concept.id,
      subject: concept.subject,
      titleKid: concept.titleKid,
      titleAdmin: concept.titleAdmin,
      standardCodes: concept.standardCodes,
      milestoneLevel: concept.milestoneLevel,
      kind: concept.kind,
      state: resolveState({ stored: row?.state, attempts: row?.attempts ?? 0, reviewDue, rusty }),
      pMastery: row?.pMastery ?? 0.15,
      theta: row?.theta ?? 0,
      attempts: row?.attempts ?? 0,
      correctUnhinted: row?.correctUnhinted ?? 0,
      lastPracticedAt: row?.lastPracticedAt ?? null,
      reviewDueAt: review?.dueAt ?? null,
      efficientStrategyRate: null,
    };
  });
}

export function buildKnowledgeMap(snap: DashboardSnapshot): KnowledgeMapView {
  const nodes = buildKnowledgeNodes(snap);
  return {
    nodes,
    edges: hardPrereqs().map((edge) => ({ from: edge.from, to: edge.to, strength: "hard" as const })),
    frontiers: SUBJECTS.map((subject) => ({
      subject,
      domain: subjectLabel(subject),
      frontier: milestoneFrontier(nodes.filter((node) => node.subject === subject)),
    })),
  };
}

function buildDaily(snap: DashboardSnapshot): DayPoint[] {
  const days = new Map<string, DayPoint>();
  const ensure = (day: string): DayPoint => {
    const existing = days.get(day);
    if (existing) return existing;
    const created: DayPoint = { day, minutes: 0, xp: 0, items: 0, firstTry: 0, firstTryCorrect: 0, accuracy: null };
    days.set(day, created);
    return created;
  };
  for (const row of forLearner(snap.xp, snap.learnerId)) {
    const point = ensure(dayKey(row.minuteStart));
    point.xp += row.xp;
    point.minutes += 1;
  }
  for (const event of forLearner(snap.events, snap.learnerId)) {
    if (event.type !== "answer_submitted" || event.isPreview) continue;
    const point = ensure(dayKey(event.serverTs));
    point.items += 1;
    if (event.attemptNo === 1) {
      point.firstTry += 1;
      if (event.isCorrect) point.firstTryCorrect += 1;
    }
  }
  return [...days.values()]
    .map((point) => ({
      ...point,
      accuracy: point.firstTry > 0 ? point.firstTryCorrect / point.firstTry : null,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function buildAlerts(snap: DashboardSnapshot, nodes: KnowledgeNode[], daily: DayPoint[]): Alert[] {
  const alerts: Alert[] = [...detectHoles(nodes, snap.now)];
  const now = new Date(snap.now);
  for (const review of forLearner(snap.reviews, snap.learnerId)) {
    if (review.targetType === "reteach") {
      if (review.lastResult !== "fail") continue;
      alerts.push({
        kind: "review_due",
        title: `Needs re-teaching: ${targetName(review.targetId)}`,
        detail: isDue(new Date(review.dueAt), now)
          ? "Shown to her as \"Let's try this again\" until she gets it right on the first try."
          : `Shows as "Let's try this again" from ${formatEtDateTime(review.dueAt)}.`,
        targetId: review.targetId,
        severity: 2,
      });
      continue;
    }
    if (!isDue(new Date(review.dueAt), now)) continue;
    const concept = review.targetType === "concept" ? catalogConcept(review.targetId) : null;
    const rusty = overdueForRefresh(review.dueAt, review.box, now);
    const soon = intervalDays(review.box) <= 0;
    alerts.push({
      kind: rusty ? "rusty" : "review_due",
      title: rusty
        ? `Needs a refresh: ${concept?.titleAdmin ?? targetName(review.targetId)}`
        : `${soon ? "Coming back for another try" : "Review due"}: ${concept?.titleAdmin ?? targetName(review.targetId)}`,
      detail: rusty
        ? `Not practiced in a while; a quick review was due ${formatEtDateTime(review.dueAt)}.`
        : soon
          ? "Missed recently, so it comes back in her next session. This is normal."
          : `Due ${formatEtDateTime(review.dueAt)}.`,
      targetType: review.targetType === "concept" ? "concept" : undefined,
      targetId: review.targetId,
      severity: rusty ? 3 : 2,
    });
  }
  for (const node of nodes) {
    if (node.state === "rusty" && !alerts.some((alert) => alert.kind === "rusty" && alert.targetId === node.id)) {
      alerts.push({
        kind: "rusty",
        title: `Needs a refresh: ${node.titleAdmin}`,
        detail: "She knew this before but missed it on a later review.",
        targetType: "concept",
        targetId: node.id,
        severity: 3,
      });
    }
  }
  const weekStart = weekStartKey(snap.now);
  const weekEvents = forLearner(snap.events, snap.learnerId).filter(
    (event) => event.type === "answer_submitted" && !event.isPreview && dayKey(event.serverTs) >= weekStart,
  );
  const rushing = weekEvents.filter((event) => isRapidGuess(event.latencyMs, event.isCorrect)).length;
  if (rushing >= 3) {
    alerts.push({
      kind: "rushing",
      title: "Rushing this week",
      detail: `${rushing} answers came in under 1.5 seconds and were wrong.`,
      severity: 2,
    });
  }
  void daily;
  const unique = new Map<string, Alert>();
  for (const alert of alerts) {
    unique.set(`${alert.kind}:${alert.targetId ?? alert.title}`, alert);
  }
  return [...unique.values()].sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title));
}

export function buildOverview(snap: DashboardSnapshot): Overview {
  const daily = buildDaily(snap);
  const nodes = buildKnowledgeNodes(snap);
  const today = todayKey(snap.now);
  const weekStart = weekStartKey(snap.now);
  const xp = forLearner(snap.xp, snap.learnerId);
  const events = forLearner(snap.events, snap.learnerId).filter((event) => event.type === "answer_submitted" && !event.isPreview);
  const first = events.filter((event) => event.attemptNo === 1);
  const xpTotal = xp.reduce((sum, row) => sum + row.xp, 0);
  const xpToday = xp.filter((row) => dayKey(row.minuteStart) === today).reduce((sum, row) => sum + row.xp, 0);
  const xpWeek = xp.filter((row) => dayKey(row.minuteStart) >= weekStart).reduce((sum, row) => sum + row.xp, 0);
  const minutesToday = xp.filter((row) => dayKey(row.minuteStart) === today).length;
  const minutesWeek = xp.filter((row) => dayKey(row.minuteStart) >= weekStart).length;
  const firstTryAccuracy = first.length ? first.filter((event) => event.isCorrect).length / first.length : null;
  const inTargetBand = firstTryAccuracy === null ? null : firstTryAccuracy >= ZONE_LOW && firstTryAccuracy <= ZONE_HIGH;
  const reviewsDue = forLearner(snap.reviews, snap.learnerId).filter((review) => review.targetType !== "reteach" && isDue(new Date(review.dueAt), new Date(snap.now)));
  const reviewsDoneToday = forLearner(snap.reviews, snap.learnerId).filter((review) => {
    if (!review.lastResult) return false;
    // A due review that is no longer due was completed; we approximate with lastResult and dueAt in the future after a pass.
    return review.lastResult === "pass" && review.dueAt > snap.now && dayKey(review.dueAt) !== today;
  }).length;
  const goal = snap.goal ?? {
    learnerId: snap.learnerId,
    weeklyXpGoal: DEFAULT_WEEKLY_XP_GOAL,
    dailyMinutesGoal: DEFAULT_DAILY_MINUTES_GOAL,
    updatedAt: snap.now,
    updatedBy: "default",
  };
  const gated = new Set(snap.gatedChapterIds);
  const chapters = catalogChapters();
  const starred = chapters.filter((chapter) => gated.has(chapter.id)).length;
  const ring = (id: string, label: string, done: number, target: number, unit: string): GoalRing => {
    const r = ringProgress(done, target);
    return { id, label, done, goal: target, pct: r.pct, arcPct: r.arcPct, text: r.label, unit };
  };
  const remainingReviews = reviewsDue.length;
  const rings: GoalRing[] = [
    ring("minutes", "Today's minutes", minutesToday, goal.dailyMinutesGoal, "min"),
    ring("week", "Weekly XP", xpWeek, goal.weeklyXpGoal, "XP"),
    { ...ring("chapters", "Chapter stars", starred, Math.max(1, chapters.length), "chapters"), text: `${pct(starred, chapters.length)}%` },
    remainingReviews === 0
      ? { id: "review", label: "Reviews clear", done: 0, goal: 0, pct: -1, arcPct: 0, text: "—", unit: "" }
      : { id: "review", label: `${remainingReviews} review${remainingReviews === 1 ? "" : "s"} due`, done: 0, goal: remainingReviews, pct: 0, arcPct: 0, text: "0%", unit: "to do" },
  ];
  void reviewsDoneToday;

  const weekBuckets = new Map<string, { correct: number; total: number }>();
  for (const event of first) {
    const week = weekStartKey(event.serverTs);
    const bucket = weekBuckets.get(week) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (event.isCorrect) bucket.correct += 1;
    weekBuckets.set(week, bucket);
  }

  return {
    learnerNickname: snap.nickname,
    asOfEt: formatEtDateTime(snap.now),
    engagedMinutesToday: minutesToday,
    engagedMinutesWeek: minutesWeek,
    xpTotal,
    xpToday,
    xpWeek,
    itemsCompleted: new Set(events.filter((event) => event.isCorrect).map((event) => event.itemId)).size,
    itemsAttempted: new Set(events.map((event) => event.itemId)).size,
    firstTryAccuracy,
    inTargetBand,
    streakDays: streakDays(new Set(xp.map((row) => dayKey(row.minuteStart))), snap.now),
    rings,
    alerts: buildAlerts(snap, nodes, daily),
    daily,
    weeklyAccuracy: [...weekBuckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, bucket]) => ({
        week,
        accuracy: bucket.total ? bucket.correct / bucket.total : null,
        items: bucket.total,
      })),
    rushMeter: buildRushMeter(events, snap.now),
  };
}

/** Rush meter thresholds: share of the last 7 days' answers that were rapid wrong guesses. */
export const RUSH_WATCH = 0.1;
export const RUSH_HIGH = 0.2;

export function buildRushMeter(answers: AdminEventRow[], now: number): RushMeter {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) days.push(dayKey(now - i * 86_400_000));
  const inWindow = answers.filter((event) => dayKey(event.serverTs) >= days[0] && event.serverTs <= now);
  const rushed = (rows: AdminEventRow[]) => rows.filter((event) => isRapidGuess(event.latencyMs, event.isCorrect)).length;
  const rushed7d = rushed(inWindow);
  const rate7d = inWindow.length ? rushed7d / inWindow.length : null;
  const today = todayKey(now);
  return {
    level: rate7d === null ? "none" : rate7d >= RUSH_HIGH ? "rushing" : rate7d >= RUSH_WATCH ? "watch" : "calm",
    rate7d,
    rushed7d,
    answers7d: inWindow.length,
    rushedToday: rushed(inWindow.filter((event) => dayKey(event.serverTs) === today)),
    daily: days.map((day) => {
      const rows = inWindow.filter((event) => dayKey(event.serverTs) === day);
      return { day, rate: rows.length ? rushed(rows) / rows.length : null, answers: rows.length };
    }),
  };
}

/**
 * Items whose most recent first try was right with at most a small hint. This mirrors the chapter
 * star rule (90% first-try right, hint level 1 or less), so a chapter can be 100% "answered right"
 * but still short of a star when some answers only came after retries or big hints.
 */
export type StarInfo = {
  /** How the star came: a passed check, a parent override, or a pass below today's 90% rule. */
  how: "earned" | "parent" | "earlier_rule" | null;
  earnedPct: number | null;
  earnedAt: number | null;
  /** First-try % using the gate's own rule: first answer per question in the current round. */
  roundPct: number | null;
  roundAnswered: number;
  lastCheckPct: number | null;
};

/**
 * Mirrors the engine's chapter gate (lib/engine/service runChapterGate): a round starts after the
 * last star check, and each question's FIRST answer in that round counts (right, hint ≤ 1).
 * The star itself comes from the first passed check and is never recomputed here.
 */
export function chapterStarInfo(
  itemIds: string[],
  events: Pick<AdminEventRow, "itemId" | "isCorrect" | "hintLevel" | "serverTs" | "type" | "isPreview">[],
  gates: ChapterGateRecord[],
  gateMin = 0.9,
): StarInfo {
  const sorted = [...gates].sort((a, b) => a.finishedAt - b.finishedAt);
  const firstPass = sorted.find((g) => g.passed) ?? null;
  const last = sorted.at(-1) ?? null;
  const roundStart = last?.finishedAt ?? 0;
  const ids = new Set(itemIds);
  const first = new Map<string, { ts: number; ok: boolean }>();
  for (const e of events) {
    if (!e.itemId || !ids.has(e.itemId) || e.isPreview || (e.type && e.type !== "answer_submitted")) continue;
    if (e.serverTs <= roundStart) continue;
    const prev = first.get(e.itemId);
    if (prev && prev.ts <= e.serverTs) continue;
    first.set(e.itemId, { ts: e.serverTs, ok: e.isCorrect === true && (e.hintLevel ?? 0) <= 1 });
  }
  const ok = [...first.values()].filter((v) => v.ok).length;
  let how: StarInfo["how"] = null;
  if (firstPass) how = firstPass.override || firstPass.score === null ? "parent" : firstPass.score + 1e-6 < gateMin ? "earlier_rule" : "earned";
  return {
    how,
    earnedPct: firstPass && firstPass.score !== null && !firstPass.override ? Math.round(firstPass.score * 100) : null,
    earnedAt: firstPass?.finishedAt ?? null,
    roundPct: first.size ? Math.round((ok / Math.max(1, itemIds.length)) * 100) : null,
    roundAnswered: first.size,
    lastCheckPct: last && last.score !== null && !last.override ? Math.round(last.score * 100) : null,
  };
}

export function chapterFirstTryCorrect(events: Pick<AdminEventRow, "itemId" | "attemptNo" | "isCorrect" | "hintLevel" | "serverTs">[]): number {
  const latest = new Map<string, { ts: number; ok: boolean }>();
  for (const event of events) {
    if (!event.itemId || event.attemptNo !== 1) continue;
    const prev = latest.get(event.itemId);
    if (prev && prev.ts > event.serverTs) continue;
    latest.set(event.itemId, { ts: event.serverTs, ok: event.isCorrect === true && (event.hintLevel ?? 0) <= 1 });
  }
  return [...latest.values()].filter((v) => v.ok).length;
}

export function buildProgress(snap: DashboardSnapshot): ProgressView {
  const nodes = buildKnowledgeNodes(snap);
  const events = forLearner(snap.events, snap.learnerId).filter((event) => event.type === "answer_submitted" && !event.isPreview);
  const gated = new Set(snap.gatedChapterIds);
  const subjects: SubjectProgress[] = SUBJECTS.map((subject) => {
    const group = nodes.filter((node) => node.subject === subject);
    const mastered = group.filter((node) => node.state === "mastered" || node.state === "review_due").length;
    return {
      subject,
      label: subjectLabel(subject),
      concepts: group.length,
      mastered,
      inProgress: group.filter((node) => node.state === "in_progress").length,
      tried: group.filter((node) => node.attempts > 0).length,
      notSolid: group.filter((node) => node.state === "missing").length,
      missing: group.filter((node) => node.state === "missing" || node.state === "not_started").length,
      reviewDue: group.filter((node) => node.state === "review_due").length,
      rusty: group.filter((node) => node.state === "rusty").length,
      masteryPct: pct(mastered, group.length),
      toward90: pct(mastered, group.length),
      chaptersTotal: catalogChapters().filter((chapter) => chapter.subject === subject).length,
      chaptersStarred: catalogChapters().filter((chapter) => chapter.subject === subject && gated.has(chapter.id)).length,
      avgMilestone: group.length ? group.reduce((sum, node) => sum + node.milestoneLevel, 0) / group.length : null,
      frontier: milestoneFrontier(group),
      gradeSpread: gradeBands(group),
    };
  });

  const chapters: ChapterProgressRow[] = catalogChapters().map((chapter) => {
    const chapterEvents = events.filter((event) => {
      const located = event.itemId ? locateAdminItem(event.itemId) : null;
      const fromPayload = event.payload && typeof event.payload.chapter_id === "string" ? event.payload.chapter_id : null;
      return located?.chapter.id === chapter.id || fromPayload === chapter.id;
    });
    const correctIds = new Set(chapterEvents.filter((event) => event.isCorrect).map((event) => event.itemId));
    const attemptedIds = new Set(chapterEvents.map((event) => event.itemId));
    const last = chapterEvents.reduce<number | null>((max, event) => (max === null || event.serverTs > max ? event.serverTs : max), null);
    const firstTryCorrect = chapterFirstTryCorrect(chapterEvents);
    const star = chapterStarInfo(
      chapter.items.map((item) => item.id),
      chapterEvents,
      (snap.chapterGates ?? []).filter((g) => g.chapterId === chapter.id),
    );
    return {
      chapterId: chapter.id,
      title: chapter.titleKid,
      subject: chapter.subject,
      book: chapter.book,
      number: chapter.number,
      itemsTotal: chapter.items.length,
      itemsCorrect: correctIds.size,
      itemsAttempted: attemptedIds.size,
      masteryPct: pct(correctIds.size, chapter.items.length),
      firstTryCorrect,
      firstTryPct: star.roundPct ?? pct(firstTryCorrect, chapter.items.length),
      gated: gated.has(chapter.id),
      star,
      lastSeenAt: last,
    };
  });

  const daily = buildDaily(snap);
  let masteredRunning = 0;
  const masteredByDay = new Map<string, number>();
  const history = [...forLearner(snap.mastery, snap.learnerId)].sort(
    (a, b) => (a.gatePassedAt ?? a.lastPracticedAt ?? 0) - (b.gatePassedAt ?? b.lastPracticedAt ?? 0),
  );
  for (const row of history) {
    if (row.state !== "mastered" && row.state !== "review_due") continue;
    const when = row.gatePassedAt ?? row.lastPracticedAt;
    if (when === null) continue;
    masteredRunning += 1;
    masteredByDay.set(dayKey(when), masteredRunning);
  }

  const trend = daily.map((point) => ({
    day: point.day,
    mastered: masteredByDay.get(point.day) ?? 0,
    accuracy: point.accuracy,
  }));
  let lastMastered = 0;
  for (const point of trend) {
    if (point.mastered > 0) lastMastered = point.mastered;
    else point.mastered = lastMastered;
  }

  return { subjects, chapters, trend };
}

export function buildWrongAnswers(snap: DashboardSnapshot): WrongAnswerView {
  const strategies = new Map<string, StoredStrategy>();
  for (const row of forLearner(snap.strategies, snap.learnerId)) strategies.set(row.eventId, row);
  const rows: WrongAnswerRow[] = forLearner(snap.events, snap.learnerId)
    .filter((event) => event.type === "answer_submitted" && event.isCorrect === false && !event.isPreview)
    .sort((a, b) => b.serverTs - a.serverTs)
    .map((event) => {
      const located = event.itemId ? locateAdminItem(event.itemId) : null;
      const stored = strategies.get(event.id);
      const inferred = inferStrategy({
        itemId: event.itemId,
        latencyMs: event.latencyMs,
        correct: event.isCorrect,
        hintLevel: event.hintLevel,
        response: event.response,
      });
      // The live engine writes a placeholder "unknown" guess on every answer; only trust a stored
      // label when it says something (a parent label, her own report, or a real inference).
      const trusted = stored && !(stored.source === "inferred_rules" && isUnknownStrategy(stored.strategy)) ? stored : null;
      const payload = event.payload ?? {};
      const itemText =
        (typeof payload.item_stem === "string" && payload.item_stem) || located?.item.stem || event.itemId || "Unknown item";
      const correctResolved = resolveCorrect(payload.correct_answer, located);
      const herResolved = resolveAnswer(event.response, located, located ? located.item.answer : payload.correct_answer);
      const correctAnswer = answerToPlain(correctResolved);
      const conceptId =
        stored?.conceptId ||
        (typeof payload.concept_id === "string" ? payload.concept_id : null) ||
        located?.item.conceptId ||
        "unknown";
      return {
        eventId: event.id,
        ts: event.serverTs,
        subject: located?.chapter.subject ?? (typeof payload.subject === "string" ? (payload.subject as SubjectId) : "unknown"),
        chapterId: located?.chapter.id ?? (typeof payload.chapter_id === "string" ? payload.chapter_id : null),
        conceptId,
        conceptTitle: catalogConcept(conceptId)?.titleAdmin ?? conceptId,
        itemId: event.itemId ?? "",
        itemText,
        response: event.response,
        responseText: answerToPlain(herResolved),
        herAnswer: herResolved,
        correct: correctResolved,
        correctAnswer,
        chapterLabel: located ? chapterDisplayName(located.chapter) : null,
        attemptNo: event.attemptNo,
        hintLevel: event.hintLevel,
        latencyMs: event.latencyMs,
        strategy: trusted?.strategy ?? inferred.strategy,
        strategySource: trusted?.source ?? inferred.source,
        strategyConfidence: trusted?.confidence ?? inferred.confidence,
        misconception: stored?.misconception ?? inferred.misconception,
        firstAttempt: event.attemptNo === 1,
      };
    });

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.misconception) counts.set(`mis:${row.misconception}`, (counts.get(`mis:${row.misconception}`) ?? 0) + 1);
    if (row.strategy) counts.set(`str:${row.strategy}`, (counts.get(`str:${row.strategy}`) ?? 0) + 1);
  }
  const patterns = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({
      key,
      label: key.startsWith("mis:") ? key.slice(4) : strategyLabel(key.slice(4)),
      count,
      detail: key.startsWith("mis:") ? "Mix-up" : strategyDetail(key.slice(4)),
    }));

  return { rows, patterns, needsReteach: buildNeedsReteach(forLearner(snap.events, snap.learnerId)) };
}

/**
 * Items that reached the stuck-help ladder (HINT_AT_MISS wrong tries, Show me, or Skip), newest first.
 * Chapter items come from answer events (hintLevel 3 = answered after Show me) and item_skipped;
 * the Watch it check from hint_requested (source watch_check); games from game_event details.
 */
export function buildNeedsReteach(events: AdminEventRow[]): NeedsReteachRow[] {
  const rows = new Map<string, NeedsReteachRow>();
  const missesBySitting = new Map<string, number>();
  const ensure = (key: string, init: () => Omit<NeedsReteachRow, "key" | "maxMisses" | "hints" | "reveals" | "skips" | "lastTs" | "cleared">) => {
    let row = rows.get(key);
    if (!row) {
      row = { key, ...init(), maxMisses: 0, hints: 0, reveals: 0, skips: 0, lastTs: 0, cleared: false };
      rows.set(key, row);
    }
    return row;
  };
  const chapterInit = (itemId: string, payload: Record<string, unknown>) => () => {
    const located = locateAdminItem(itemId);
    return {
      source: "chapter" as const,
      label: located?.item.stem ?? (typeof payload.item_stem === "string" ? payload.item_stem : itemId),
      chapterId: located?.chapter.id ?? (typeof payload.chapter_id === "string" ? payload.chapter_id : null),
      conceptId: located?.item.conceptId ?? (typeof payload.concept_id === "string" ? payload.concept_id : null),
    };
  };
  const sorted = events.filter((e) => !e.isPreview).sort((a, b) => a.serverTs - b.serverTs);
  for (const event of sorted) {
    const payload = event.payload ?? {};
    const detail = typeof payload.detail === "string" ? payload.detail : "";
    const misses = typeof payload.misses === "number" ? payload.misses : 0;
    if (event.type === "answer_submitted" && event.itemId) {
      const stuckAnswer = (event.isCorrect === false && (event.attemptNo ?? 0) >= HINT_AT_MISS) || (event.hintLevel ?? 0) >= HINT_LEVEL_HINTED;
      const existing = rows.get(`item:${event.itemId}`);
      if (!stuckAnswer) {
        if (existing && event.isCorrect && event.attemptNo === 1 && (event.hintLevel ?? 0) <= 1) existing.cleared = true;
        continue;
      }
      const row = ensure(`item:${event.itemId}`, chapterInit(event.itemId, payload));
      const sitting = `${event.sessionId}:${event.itemId}`;
      const n = event.isCorrect === false ? (event.attemptNo ?? 0) : (missesBySitting.get(sitting) ?? 0);
      missesBySitting.set(sitting, n);
      row.maxMisses = Math.max(row.maxMisses, n);
      if (event.isCorrect === false && event.attemptNo === HINT_AT_MISS) row.hints += 1;
      if (event.hintLevel === HINT_LEVEL_REVEALED && event.isCorrect) row.reveals += 1;
      row.lastTs = event.serverTs;
      row.cleared = false;
    } else if (event.type === "item_skipped" && event.itemId) {
      const row = ensure(`item:${event.itemId}`, chapterInit(event.itemId, payload));
      row.skips += 1;
      row.maxMisses = Math.max(row.maxMisses, event.attemptNo ?? 0);
      row.lastTs = event.serverTs;
      row.cleared = false;
    } else if (event.type === "hint_requested" && payload.source === "watch_check") {
      const chapterId = event.activityId ?? "";
      const row = ensure(`watch:${chapterId}`, () => ({ source: "watch_check", label: "Quick check after the video", chapterId, conceptId: null }));
      if (detail === "hint_shown") row.hints += 1;
      if (detail === "revealed") row.reveals += 1;
      if (detail === "skipped") row.skips += 1;
      row.maxMisses = Math.max(row.maxMisses, misses);
      row.lastTs = event.serverTs;
    } else if (event.type === "game_event" && ["stuck", "revealed", "skipped"].includes(detail)) {
      const game = typeof payload.game_id === "string" ? payload.game_id : "game";
      const item = typeof payload.item === "string" ? payload.item : "";
      const row = ensure(`game:${game}:${item}`, () => ({ source: "game", label: item ? `${gameTitle(game)} · ${item}` : gameTitle(game), chapterId: null, conceptId: null }));
      if (detail === "stuck") row.hints += 1;
      if (detail === "revealed") row.reveals += 1;
      if (detail === "skipped") row.skips += 1;
      row.maxMisses = Math.max(row.maxMisses, misses);
      row.lastTs = event.serverTs;
    }
  }
  return [...rows.values()].sort((a, b) => b.lastTs - a.lastTs);
}

export function buildSessions(snap: DashboardSnapshot): SessionHistoryView {
  const events = forLearner(snap.events, snap.learnerId);
  const xp = forLearner(snap.xp, snap.learnerId);
  const sessions = forLearner(
    snap.sessions.map((session) => ({ ...session, learnerId: session.learnerId })),
    snap.learnerId,
  )
    .filter((session) => !session.isPreview)
    .sort((a, b) => b.startedAt - a.startedAt);

  const rows: SessionHistoryRow[] = sessions.map((session) => {
    const sessionEvents = events.filter((event) => event.sessionId === session.id && event.type === "answer_submitted");
    const first = sessionEvents.filter((event) => event.attemptNo === 1);
    const stems: string[] = [];
    const latencies: number[] = [];
    for (const event of sessionEvents) {
      const located = event.itemId ? locateAdminItem(event.itemId) : null;
      const stem = (event.payload && typeof event.payload.item_stem === "string" && event.payload.item_stem) || located?.item.stem || "";
      if (event.latencyMs !== null) {
        stems.push(stem);
        latencies.push(event.latencyMs);
      }
    }
    const rapid = sessionEvents.filter((event) => isRapidGuess(event.latencyMs, event.isCorrect)).length;
    const pace = inferPace({ latencies, stems, rapidCount: rapid, items: sessionEvents.length });
    const minutes = xp.filter((row) => row.sessionId === session.id).length;
    const allTs = events.filter((event) => event.sessionId === session.id).map((event) => event.serverTs);
    const lastActivityAt = Math.max(session.lastEventAt, ...allTs);
    return {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      lastActivityAt,
      firstQuestionAt: sessionEvents.length ? Math.min(...sessionEvents.map((event) => event.serverTs)) : null,
      entryPoint: session.entryPoint,
      engagedMinutes: minutes,
      idleMinutes: Math.max(0, Math.round(((session.endedAt ?? session.lastEventAt) - session.startedAt) / 60000) - minutes),
      items: sessionEvents.length,
      firstTryAccuracy: first.length ? first.filter((event) => event.isCorrect).length / first.length : null,
      xp: minutes * 10,
      pace: pace.pace,
      paceNote: pace.note,
      rollingSuccess: session.rollingSuccess,
      neededHelp: buildNeedsReteach(events.filter((event) => event.sessionId === session.id)).length,
    };
  });

  return { sessions: rows };
}

export function buildAssignments(snap: DashboardSnapshot): AssignmentsView {
  const nodes = buildKnowledgeNodes(snap);
  const goal: LearnerGoal = snap.goal ?? {
    learnerId: snap.learnerId,
    weeklyXpGoal: DEFAULT_WEEKLY_XP_GOAL,
    dailyMinutesGoal: DEFAULT_DAILY_MINUTES_GOAL,
    updatedAt: snap.now,
    updatedBy: "default",
  };
  return {
    assignments: snap.assignments
      .filter((row) => row.learnerId === snap.learnerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        ...row,
        title: row.title || assignmentTitle(row.targetType, row.targetId),
      })),
    suggestedHoles: detectHoles(nodes, snap.now),
    goal,
    concepts: catalogConcepts()
      .map((concept) => ({ id: concept.id, title: concept.titleAdmin, subject: concept.subject }))
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title, undefined, { numeric: true })),
    // Full names keep look-alikes apart ("Christ Our Life Ch 4: Unit 1 looking back" vs "… Ch 9: Unit 2 looking back").
    chapters: catalogChapters()
      .map((chapter) => ({ id: chapter.id, title: chapterFullName(chapter), subject: chapter.subject, n: chapter.number }))
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title, undefined, { numeric: true }))
      .map(({ id, title, subject }) => ({ id, title, subject })),
    gatedChapterIds: [...snap.gatedChapterIds].sort(),
  };
}

export function suggestedHoleAssignments(snap: DashboardSnapshot, createdBy: string): Array<Omit<AssignmentRow, "id" | "createdAt" | "completedAt">> {
  const open = new Set(
    snap.assignments
      .filter((row) => row.learnerId === snap.learnerId && row.status === "open")
      .map((row) => `${row.targetType}:${row.targetId}`),
  );
  return detectHoles(buildKnowledgeNodes(snap), snap.now)
    .filter((alert) => alert.targetType && alert.targetId && !open.has(`${alert.targetType}:${alert.targetId}`))
    .map((alert) => ({
      learnerId: snap.learnerId,
      kind: "hole_fill" as const,
      targetType: alert.targetType ?? "concept",
      targetId: alert.targetId ?? "",
      title: assignmentTitle(alert.targetType ?? "concept", alert.targetId ?? ""),
      reason: alert.detail,
      status: "open" as const,
      createdBy,
    }));
}
