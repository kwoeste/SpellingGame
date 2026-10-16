import { updateBkt, DEFAULT_BKT, type BktParams } from "@/lib/engine/bkt";
import { hintWeightedOutcome, updateElo } from "@/lib/engine/elo";
import { dueAt, nextBoxOnPass, onFail, type ReviewBox } from "@/lib/engine/scheduler";
import { ringPercent, truncateMinute, xpForMinute } from "@/lib/engine/xp";
import { conceptGatePassed, masteryState } from "@/lib/engine/gating";
import { ewma, targetSuccess, zoneAction } from "@/lib/engine/zone";
import type { FeedbackDTO, NextItemDTO, StudentProgressDTO } from "@/lib/engine/dto";
import { toFeedback, toNextItem, toStudentProgress } from "@/lib/engine/dto";
import { getChapter, listChapters } from "@/lib/content/catalog";
import type { ChapterPack, ChapterItem } from "@/lib/content/types";

export type MasteryRow = {
  learnerId: string;
  conceptId: string;
  pMastery: number;
  theta: number;
  thetaN: number;
  state: string;
  attempts: number;
  correctUnhinted: number;
  efficientStrategyRate: number;
  gatePassedAt: number | null;
};

export type ReviewRow = {
  learnerId: string;
  targetType: string;
  targetId: string;
  box: ReviewBox;
  dueAt: number;
  lastResult: "pass" | "fail" | null;
  lapses: number;
};

export type InteractionEvent = {
  id: string;
  sessionId: string;
  learnerId: string;
  seq: number;
  type: string;
  itemId?: string;
  activityId?: string;
  isCorrect?: boolean;
  latencyMs?: number;
  hintLevel?: number;
  response?: unknown;
  payload?: Record<string, unknown>;
  isPreview?: boolean;
  serverTs: number;
};

export type PlaySession = {
  id: string;
  learnerId: string;
  startedAt: number;
  lastEventAt: number;
  endedAt: number | null;
  entryPoint: string;
  resumeState: {
    activityId: string | null;
    itemId: string | null;
    scaffoldLevel: number;
    chapterId: string | null;
  };
  isPreview: boolean;
  rollingSuccess: number;
  scoredCount: number;
  consecutiveHigh: number;
  outOfBand: number;
};

type LikeRow = { learnerId: string; interestTag: string; liked: boolean };

const events: InteractionEvent[] = [];
const eventIds = new Set<string>();
const mastery = new Map<string, MasteryRow>();
const reviews = new Map<string, ReviewRow>();
const sessions = new Map<string, PlaySession>();
const likes = new Map<string, LikeRow>();
const xpByLearner = new Map<string, { total: number; today: number; days: Set<string> }>();
const chapterSteps = new Map<string, Set<string>>();
const decisions: Array<Record<string, unknown>> = [];
const badges = new Map<string, string[]>();

function mKey(learnerId: string, conceptId: string): string {
  return `${learnerId}:${conceptId}`;
}

export function resetEngineStore(): void {
  events.length = 0;
  eventIds.clear();
  mastery.clear();
  reviews.clear();
  sessions.clear();
  likes.clear();
  xpByLearner.clear();
  chapterSteps.clear();
  decisions.length = 0;
  badges.clear();
}

export function startSession(args: {
  learnerId: string;
  entryPoint: string;
  isPreview?: boolean;
}): PlaySession {
  const existing = [...sessions.values()].find(
    (s) => s.learnerId === args.learnerId && !s.endedAt && !s.isPreview,
  );
  if (existing && !args.isPreview) {
    existing.lastEventAt = Date.now();
    return existing;
  }
  const session: PlaySession = {
    id: `sess-${sessions.size + 1}-${Date.now()}`,
    learnerId: args.learnerId,
    startedAt: Date.now(),
    lastEventAt: Date.now(),
    endedAt: null,
    entryPoint: args.entryPoint,
    resumeState: { activityId: null, itemId: null, scaffoldLevel: 0, chapterId: null },
    isPreview: Boolean(args.isPreview),
    rollingSuccess: 0.82,
    scoredCount: 0,
    consecutiveHigh: 0,
    outOfBand: 0,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): PlaySession | undefined {
  return sessions.get(id);
}

export function resumeFor(learnerId: string): PlaySession | null {
  return (
    [...sessions.values()]
      .filter((s) => s.learnerId === learnerId && !s.endedAt)
      .sort((a, b) => b.lastEventAt - a.lastEventAt)[0] ?? null
  );
}

function itemFromChapter(chapter: ChapterPack, itemId?: string | null): ChapterItem | undefined {
  if (itemId) return chapter.items.find((item) => item.id === itemId);
  return chapter.items[0];
}

export function nextItemFor(args: {
  learnerId: string;
  sessionId: string;
  chapterId?: string;
  requestedItemId?: string;
}): NextItemDTO {
  const chapter =
    (args.chapterId ? getChapter(args.chapterId) : null) ??
    listChapters()[0];
  if (!chapter) {
    return toNextItem({
      item_id: "warmup-generic",
      activity_id: "review_warmup",
      type: "mc",
      prompt: "Ready to practice?",
      options: ["Yes", "Soon"],
      scaffold_level: 0,
      theme: null,
      read_aloud_text: "Ready to practice?",
    });
  }
  const session = sessions.get(args.sessionId);
  const resumeId = session?.resumeState.itemId;
  const item = itemFromChapter(chapter, args.requestedItemId ?? resumeId) ?? chapter.items[0];
  if (session) {
    session.resumeState = {
      activityId: item.activityId,
      itemId: item.id,
      scaffoldLevel: session.resumeState.scaffoldLevel,
      chapterId: chapter.id,
    };
  }
  return toNextItem({
    item_id: item.id,
    activity_id: item.activityId,
    type: item.type,
    prompt: item.stem,
    options: item.options,
    sentences: chapter.sentences,
    scaffold_level: session?.resumeState.scaffoldLevel ?? 0,
    theme: null,
    read_aloud_text: item.stem,
  });
}

function getOrCreateMastery(learnerId: string, conceptId: string): MasteryRow {
  const key = mKey(learnerId, conceptId);
  const existing = mastery.get(key);
  if (existing) return existing;
  const row: MasteryRow = {
    learnerId,
    conceptId,
    pMastery: DEFAULT_BKT.pL0,
    theta: 0,
    thetaN: 0,
    state: "not_started",
    attempts: 0,
    correctUnhinted: 0,
    efficientStrategyRate: 0,
    gatePassedAt: null,
  };
  mastery.set(key, row);
  return row;
}

export function recordEvents(
  incoming: InteractionEvent[],
  actorLearnerId: string,
): InteractionEvent[] {
  const accepted: InteractionEvent[] = [];
  for (const event of incoming) {
    if (event.learnerId !== actorLearnerId) continue;
    if (eventIds.has(event.id)) continue;
    eventIds.add(event.id);
    const stored = { ...event, serverTs: Date.now() };
    events.push(stored);
    accepted.push(stored);
    const session = sessions.get(event.sessionId);
    if (session) {
      session.lastEventAt = stored.serverTs;
      if (event.activityId) session.resumeState.activityId = event.activityId;
      if (event.itemId) session.resumeState.itemId = event.itemId;
    }
    if (event.type === "answer_submitted" && !event.isPreview) {
      applyAnswer(stored);
    }
  }
  return accepted;
}

function findItem(itemId?: string): { chapter: ChapterPack; item: ChapterItem } | null {
  if (!itemId) return null;
  for (const chapter of listChapters()) {
    const item = chapter.items.find((row) => row.id === itemId);
    if (item) return { chapter, item };
  }
  return null;
}

function applyAnswer(event: InteractionEvent): void {
  const found = findItem(event.itemId);
  const conceptId = found?.item.conceptId ?? "general.practice";
  const row = getOrCreateMastery(event.learnerId, conceptId);
  const hintLevel = event.hintLevel ?? 0;
  const correct = Boolean(event.isCorrect);
  const firstAttempt = true;
  const params: BktParams = {
    ...DEFAULT_BKT,
    g: found?.item.options ? Math.min(0.33, Math.max(0.1, 1 / found.item.options.length)) : 0.25,
  };
  const weight = firstAttempt && hintLevel === 0 ? 1 : hintLevel === 1 ? 0.75 : hintLevel === 2 ? 0.4 : 0.5;
  if (firstAttempt) {
    const next = updateBkt(row.pMastery, correct && hintLevel < 3, params, weight);
    row.pMastery = next.pNext;
  }
  const outcome = hintWeightedOutcome(correct, hintLevel);
  const elo = updateElo({
    theta: row.theta,
    difficulty: 0,
    outcome,
    nLearner: row.thetaN,
    nItem: 8,
    guess: params.g,
  });
  row.theta = elo.theta;
  row.thetaN += 1;
  row.attempts += 1;
  if (correct && hintLevel <= 1) row.correctUnhinted += 1;
  const session = sessions.get(event.sessionId);
  if (session && firstAttempt) {
    const observed = correct && hintLevel <= 1 ? 1 : 0;
    session.rollingSuccess = ewma(session.rollingSuccess, observed);
    session.scoredCount += 1;
    session.consecutiveHigh = session.rollingSuccess > 0.95 ? session.consecutiveHigh + 1 : 0;
    const pStar = targetSuccess(session.rollingSuccess, session.consecutiveHigh);
    const out = session.rollingSuccess < 0.7 || session.rollingSuccess > 0.95;
    session.outOfBand = out ? session.outOfBand + 1 : 0;
    const action = zoneAction(session.rollingSuccess, session.consecutiveHigh, session.outOfBand);
    if (action === "zone_down") session.resumeState.scaffoldLevel = Math.min(3, session.resumeState.scaffoldLevel + 1);
    if (action === "zone_up") session.resumeState.scaffoldLevel = Math.max(0, session.resumeState.scaffoldLevel - 1);
    decisions.push({
      sessionId: session.id,
      decision: action,
      reason_code: action === "zone_down" ? "rolling_below_0.70" : action === "zone_up" ? "rolling_above_0.95" : "in_zone",
      inputs: { rolling: session.rollingSuccess, target: pStar },
    });
  }
  const reviewKey = `${event.learnerId}:item_template:${found?.item.templateId ?? event.itemId}`;
  if (correct && hintLevel <= 1) {
    const prev = reviews.get(reviewKey);
    const box = nextBoxOnPass(prev?.box ?? 0);
    reviews.set(reviewKey, {
      learnerId: event.learnerId,
      targetType: "item_template",
      targetId: found?.item.templateId ?? event.itemId ?? conceptId,
      box,
      dueAt: dueAt(new Date(), box).getTime(),
      lastResult: "pass",
      lapses: prev?.lapses ?? 0,
    });
  } else if (!correct) {
    const fail = onFail();
    const prev = reviews.get(reviewKey);
    reviews.set(reviewKey, {
      learnerId: event.learnerId,
      targetType: "item_template",
      targetId: found?.item.templateId ?? event.itemId ?? conceptId,
      box: fail.box,
      dueAt: dueAt(new Date(), fail.box).getTime(),
      lastResult: "fail",
      lapses: (prev?.lapses ?? 0) + 1,
    });
    row.pMastery = Math.max(0.05, row.pMastery * fail.pMasteryFactor);
  }
  if (found && event.itemId) {
    const stepKey = `${event.learnerId}:${found.chapter.id}`;
    const set = chapterSteps.get(stepKey) ?? new Set<string>();
    set.add(event.itemId);
    chapterSteps.set(stepKey, set);
    if (set.size >= found.chapter.items.length) {
      const score = row.correctUnhinted / Math.max(1, row.attempts);
      if (
        conceptGatePassed({
          pMastery: row.pMastery,
          gateScore: score,
          rapidGuessOnGate: false,
        })
      ) {
        row.gatePassedAt = Date.now();
        row.state = "mastered";
        const list = badges.get(event.learnerId) ?? [];
        list.push(`${found.chapter.id}-star`);
        badges.set(event.learnerId, list);
      }
    }
  }
  row.state = masteryState({
    pMastery: row.pMastery,
    gated: Boolean(row.gatePassedAt),
    rusty: false,
    attempts: row.attempts,
    reviewDue: false,
  });
  const minuteStart = truncateMinute(event.serverTs);
  const xp = xpForMinute({
    sessionId: event.sessionId,
    minuteStart,
    qualifyingActions: 1,
    idleGapMs: 0,
    majorityRapidGuess: false,
    videoHidden: false,
  });
  if (xp > 0) {
    const day = new Date(event.serverTs).toISOString().slice(0, 10);
    const bag = xpByLearner.get(event.learnerId) ?? { total: 0, today: 0, days: new Set<string>() };
    bag.total += xp;
    bag.today += xp;
    bag.days.add(day);
    xpByLearner.set(event.learnerId, bag);
  }
}

export function scoreResponse(itemId: string, response: unknown): { correct: boolean; proving?: string; explanation: string } {
  const found = findItem(itemId);
  if (!found) {
    return { correct: false, explanation: "Not yet — let's try another one." };
  }
  const { item, chapter } = found;
  let correct = false;
  if (item.type === "mc" || item.type === "tap_evidence") {
    correct = response === item.answer || (typeof response === "object" && response !== null && "value" in response && (response as { value: unknown }).value === item.answer);
  } else if (item.type === "drag_match") {
    correct = JSON.stringify(response) === JSON.stringify(item.answer);
  } else if (item.type === "drag_order") {
    const got = Array.isArray(response) ? response : [];
    const expected = Array.isArray(item.answer) ? item.answer : [];
    correct = JSON.stringify(got) === JSON.stringify(expected);
  } else if (item.type === "spell") {
    correct = String(response).toLowerCase() === String(item.answer).toLowerCase();
  } else {
    correct = String(response) === String(item.answer);
  }
  const proving = item.evidenceSentenceId
    ? chapter.sentences.find((s) => s.id === item.evidenceSentenceId)?.text
    : undefined;
  const explanation = correct
    ? item.feedbackCorrect
    : proving
      ? `${item.feedbackWrong} The sentence that proves it: ${proving}`
      : item.feedbackWrong;
  return { correct, proving, explanation };
}

export function feedbackAfter(args: {
  learnerId: string;
  sessionId: string;
  itemId: string;
  response: unknown;
  hintLevel?: number;
}): FeedbackDTO {
  const scored = scoreResponse(args.itemId, args.response);
  recordEvents(
    [
      {
        id: `evt-${args.itemId}-${Date.now()}`,
        sessionId: args.sessionId,
        learnerId: args.learnerId,
        seq: Date.now(),
        type: "answer_submitted",
        itemId: args.itemId,
        isCorrect: scored.correct,
        hintLevel: args.hintLevel ?? 0,
        response: args.response,
        serverTs: Date.now(),
      },
    ],
    args.learnerId,
  );
  const next = nextItemFor({ learnerId: args.learnerId, sessionId: args.sessionId });
  return toFeedback({
    correct: scored.correct,
    explanation: scored.explanation,
    proving_sentence: scored.proving,
    read_aloud_text: scored.proving ?? scored.explanation,
    next,
  });
}

export function progressSummary(learnerId: string): StudentProgressDTO {
  const bag = xpByLearner.get(learnerId) ?? { total: 0, today: 0, days: new Set<string>() };
  const rings = listChapters().map((chapter) => {
    const done = chapterSteps.get(`${learnerId}:${chapter.id}`)?.size ?? 0;
    return {
      id: chapter.id,
      label: chapter.titleKid,
      pct: ringPercent(done, chapter.items.length),
      review_done_today: false,
    };
  });
  const subjects = ["science", "ela", "religion"] as const;
  for (const subject of subjects) {
    const group = listChapters().filter((c) => c.subject === subject);
    const gated = group.filter((c) => (chapterSteps.get(`${learnerId}:${c.id}`)?.size ?? 0) >= c.items.length).length;
    rings.push({
      id: `subject:${subject}`,
      label: subject,
      pct: ringPercent(gated, group.length),
      review_done_today: false,
    });
  }
  rings.push({
    id: "week",
    label: "This week",
    pct: ringPercent(bag.today, 600),
    review_done_today: false,
  });
  return toStudentProgress({
    rings,
    xp_total: bag.total,
    xp_today: bag.today,
    streak_days: bag.days.size,
    badges: badges.get(learnerId) ?? [],
  });
}

export function saveLikes(learnerId: string, tags: { tag: string; liked: boolean }[]): LikeRow[] {
  for (const row of tags) {
    likes.set(`${learnerId}:${row.tag}`, { learnerId, interestTag: row.tag, liked: row.liked });
  }
  return [...likes.values()].filter((row) => row.learnerId === learnerId);
}

export function getLikes(learnerId: string): LikeRow[] {
  return [...likes.values()].filter((row) => row.learnerId === learnerId);
}

export function adminMastery(learnerId?: string): MasteryRow[] {
  return [...mastery.values()].filter((row) => !learnerId || row.learnerId === learnerId);
}

export function adminEvents(): InteractionEvent[] {
  return [...events];
}

export function adminDecisions(): Array<Record<string, unknown>> {
  return [...decisions];
}

export function snapshotCounts(): { events: number; mastery: number; reviews: number } {
  return { events: events.length, mastery: mastery.size, reviews: reviews.size };
}
