import { assignmentTitle, catalogChapters, catalogConcept, catalogConcepts, hardPrereqs, locateAdminItem } from "@/lib/admin/catalog";
import { formatAnswer, formatEtDateTime, pct, ringPct, streakDays } from "@/lib/admin/format";
import { detectHoles } from "@/lib/admin/holes";
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
  type ProgressView,
  type SessionHistoryRow,
  type SessionHistoryView,
  type SubjectProgress,
  type WrongAnswerRow,
  type WrongAnswerView,
} from "@/lib/admin/types";
import type { SubjectId } from "@/lib/content/types";
import type { AdminEventRow, AdminMasteryRow, PlaySession, ReviewRow } from "@/lib/engine/repo";
import { isDue, isRusty } from "@/lib/engine/scheduler";

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
    const rusty = Boolean(review && isRusty(new Date(review.dueAt), review.box, now)) || row?.state === "rusty";
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
    if (!isDue(new Date(review.dueAt), now)) continue;
    const concept = review.targetType === "concept" ? catalogConcept(review.targetId) : null;
    const rusty = isRusty(new Date(review.dueAt), review.box, now);
    alerts.push({
      kind: rusty ? "rusty" : "review_due",
      title: rusty ? `Rusty: ${concept?.titleAdmin ?? review.targetId}` : `Review due: ${concept?.titleAdmin ?? review.targetId}`,
      detail: rusty
        ? `Overdue by more than twice the box interval (box ${review.box}).`
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
        title: `Rusty: ${node.titleAdmin}`,
        detail: "Mastery slipped after a missed review.",
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
      title: "Rushing signals this week",
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
  const reviewsDue = forLearner(snap.reviews, snap.learnerId).filter((review) => isDue(new Date(review.dueAt), new Date(snap.now)));
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
  const rings: GoalRing[] = [
    {
      id: "minutes",
      label: "Today's minutes",
      done: minutesToday,
      goal: goal.dailyMinutesGoal,
      pct: ringPct(minutesToday, goal.dailyMinutesGoal),
      unit: "min",
    },
    {
      id: "week",
      label: "Weekly XP",
      done: xpWeek,
      goal: goal.weeklyXpGoal,
      pct: ringPct(xpWeek, goal.weeklyXpGoal),
      unit: "XP",
    },
    {
      id: "chapters",
      label: "Chapters gated",
      done: chapters.filter((chapter) => gated.has(chapter.id)).length,
      goal: Math.max(1, chapters.length),
      pct: ringPct(chapters.filter((chapter) => gated.has(chapter.id)).length, chapters.length),
      unit: "chapters",
    },
    {
      id: "review",
      label: "Reviews due",
      done: Math.max(0, reviewsDue.length - reviewsDoneToday),
      goal: Math.max(1, reviewsDue.length),
      pct: reviewsDue.length === 0 ? 100 : ringPct(reviewsDue.length - Math.min(reviewsDue.length, reviewsDue.length), reviewsDue.length),
      unit: "due",
    },
  ];
  // Review ring: remaining due items. Show dash when none are due.
  const reviewRing = rings.find((ring) => ring.id === "review");
  if (reviewRing) {
    const remaining = reviewsDue.length;
    if (remaining === 0) {
      reviewRing.done = 0;
      reviewRing.goal = 0;
      reviewRing.pct = -1;
      reviewRing.label = "Reviews clear";
      reviewRing.unit = "";
    } else {
      reviewRing.done = 0;
      reviewRing.goal = remaining;
      reviewRing.pct = 0;
      reviewRing.label = `${remaining} review${remaining === 1 ? "" : "s"} due`;
      reviewRing.unit = "to do";
    }
  }

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
  };
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
      missing: group.filter((node) => node.state === "missing" || node.state === "not_started").length,
      reviewDue: group.filter((node) => node.state === "review_due").length,
      rusty: group.filter((node) => node.state === "rusty").length,
      masteryPct: pct(mastered, group.length),
      toward90: pct(mastered, group.length),
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
      gated: gated.has(chapter.id),
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
      });
      const payload = event.payload ?? {};
      const itemText =
        (typeof payload.item_stem === "string" && payload.item_stem) || located?.item.stem || event.itemId || "Unknown item";
      const correctAnswer =
        (typeof payload.correct_answer === "string" && payload.correct_answer) ||
        (located ? formatAnswer(located.item.answer) : "—");
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
        responseText: formatAnswer(event.response),
        correctAnswer,
        attemptNo: event.attemptNo,
        hintLevel: event.hintLevel,
        latencyMs: event.latencyMs,
        strategy: stored?.strategy ?? inferred.strategy,
        strategySource: stored?.source ?? inferred.source,
        strategyConfidence: stored?.confidence ?? inferred.confidence,
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
      label: key.startsWith("mis:") ? key.slice(4) : key.slice(4),
      count,
      detail: key.startsWith("mis:") ? "misconception" : "strategy",
    }));

  return { rows, patterns };
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
    return {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      entryPoint: session.entryPoint,
      engagedMinutes: minutes,
      idleMinutes: Math.max(0, Math.round(((session.endedAt ?? session.lastEventAt) - session.startedAt) / 60000) - minutes),
      items: sessionEvents.length,
      firstTryAccuracy: first.length ? first.filter((event) => event.isCorrect).length / first.length : null,
      xp: minutes * 10,
      pace: pace.pace,
      paceNote: pace.note,
      rollingSuccess: session.rollingSuccess,
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
      .map((concept) => ({ id: concept.id, title: concept.titleAdmin }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    chapters: catalogChapters()
      .map((chapter) => ({ id: chapter.id, title: chapter.titleKid }))
      .sort((a, b) => a.title.localeCompare(b.title)),
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
