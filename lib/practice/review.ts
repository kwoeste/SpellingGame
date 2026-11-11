import type { LearnerTx, ReviewRow, StoredEvent } from "@/lib/engine/repo";
import { dueAt, etDateKey, nextBoxOnPass, onFail, type ReviewBox } from "@/lib/engine/scheduler";
import { practiceBank } from "@/lib/practice/bank";
import { DEFAULT_UPCOMING, ymdOrNull, type UpcomingTest } from "@/lib/practice/upcoming";

/**
 * After a practice test's class date passes, its question bank joins her spaced review (the same
 * engine.review_schedule boxes the warm-up uses, target type "practice_fact"). Facts she missed or
 * never answered on her last full practice test come back first; facts she got right start in a
 * longer box. Works for every dated practice test with a bank, with no per-quiz code.
 */
export const PRACTICE_FACT_TARGET = "practice_fact";
/** Questions per review block on the Today plan. */
export const REVIEW_BLOCK_SIZE = 4;
/** Box a fact she got right on the practice test starts in (BOX_INTERVALS_DAYS[3] = 7 days). */
export const RIGHT_START_BOX: ReviewBox = 3;

export type PastPracticeTest = UpcomingTest & { testDate: string; chapterId: string };

/** Practice tests whose class date is before today (ET), newest first, one per chapter, bank required. */
export function pastPracticeTests(nowMs: number, tests: UpcomingTest[] = DEFAULT_UPCOMING): PastPracticeTest[] {
  const today = etDateKey(new Date(nowMs));
  const seen = new Set<string>();
  const out: PastPracticeTest[] = [];
  const sorted = tests
    .filter((t): t is UpcomingTest & { testDate: string } => t.kind === "practice-test" && (ymdOrNull(t.testDate) ?? "9999") < today && Boolean(practiceBank(t.refId)))
    .sort((a, b) => b.testDate.localeCompare(a.testDate) || a.id.localeCompare(b.id));
  // A chapter with a newer, still-active dated test isn't "in review" yet.
  const activeRefs = new Set(tests.filter((t) => t.kind === "practice-test" && t.startDate <= today && (ymdOrNull(t.testDate) ?? "") >= today).map((t) => t.refId));
  for (const t of sorted) {
    if (seen.has(t.refId) || activeRefs.has(t.refId)) continue;
    seen.add(t.refId);
    out.push({ ...t, chapterId: t.refId });
  }
  return out;
}

export type PracticeFinish = { serverTs: number; mode: string; score: number | null; total: number | null; missed: string[]; misspelled: string[] };

export function practiceFinishes(events: Pick<StoredEvent, "type" | "serverTs" | "payload" | "isPreview">[], chapterId: string): PracticeFinish[] {
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return events
    .filter((e) => e.type === "game_event" && !e.isPreview && e.payload?.game_id === "practice-test" && e.payload?.detail === "finished" && e.payload?.chapter_id === chapterId)
    .map((e) => ({
      serverTs: e.serverTs,
      mode: typeof e.payload?.mode === "string" ? e.payload.mode : "full",
      score: typeof e.payload?.score === "number" ? e.payload.score : null,
      total: typeof e.payload?.total === "number" ? e.payload.total : null,
      missed: strings(e.payload?.missed),
      misspelled: strings(e.payload?.misspelled),
    }))
    .sort((a, b) => a.serverTs - b.serverTs);
}

/** Her last full (not retry, not review) practice test, if any. */
export function lastFullFinish(finishes: PracticeFinish[]): PracticeFinish | null {
  return [...finishes].reverse().find((f) => f.mode !== "retry" && f.mode !== "review") ?? null;
}

/** ET midnight starting the day after the test date (ms). Used as the "comes back" time for missed facts. */
function dayAfter(testDate: string): number {
  // Noon UTC on the following day is always that ET day; due "now-ish" for a planner run that day.
  const d = new Date(`${testDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime() - 12 * 3_600_000 + 5 * 3_600_000;
}

/** Review state for one fact: its saved row, or a seed from the last full practice test. */
export function seedRow(factId: string, testDate: string, last: PracticeFinish | null): ReviewRow {
  const wrong = !last || last.missed.includes(factId) || last.misspelled.includes(factId);
  const start = dayAfter(testDate);
  if (wrong) return { targetType: PRACTICE_FACT_TARGET, targetId: factId, box: 0, dueAt: start, lastResult: last ? "fail" : null, lapses: 0 };
  return { targetType: PRACTICE_FACT_TARGET, targetId: factId, box: RIGHT_START_BOX, dueAt: dueAt(new Date(start), RIGHT_START_BOX).getTime(), lastResult: "pass", lapses: 0 };
}

export type FactReview = ReviewRow & { seeded: boolean };

export function factReviews(chapterId: string, testDate: string, last: PracticeFinish | null, rows: ReviewRow[]): FactReview[] {
  const bank = practiceBank(chapterId);
  if (!bank) return [];
  const byId = new Map(rows.map((r) => [r.targetId, r]));
  return bank.facts.map((f) => {
    const row = byId.get(f.id);
    return row ? { ...row, seeded: false } : { ...seedRow(f.id, testDate, last), seeded: true };
  });
}

/** Due facts, missed/low boxes first, then oldest due, capped at `limit`. */
export function dueFacts(reviews: FactReview[], nowMs: number, limit = REVIEW_BLOCK_SIZE): FactReview[] {
  return reviews
    .filter((r) => r.dueAt <= nowMs)
    .sort((a, b) => a.box - b.box || a.dueAt - b.dueAt || a.targetId.localeCompare(b.targetId))
    .slice(0, limit);
}

/** Share of the bank she has solid (box ≥ 2 after review, or right on the practice test), 0..1. */
export function solidShare(reviews: FactReview[]): number {
  if (!reviews.length) return 0;
  return reviews.filter((r) => r.box >= 2).length / reviews.length;
}

export type ChapterReviewState = { test: PastPracticeTest; reviews: FactReview[]; last: PracticeFinish | null; lastReview: PracticeFinish | null; due: FactReview[]; reviewedToday: boolean };

/** Everything the planner, progress and the review attempt need, for every past practice test. */
export async function practiceReviewStates(tx: LearnerTx, nowMs: number, tests: UpcomingTest[]): Promise<ChapterReviewState[]> {
  const past = pastPracticeTests(nowMs, tests);
  if (!past.length) return [];
  const [rows, events] = await Promise.all([tx.listReviews(PRACTICE_FACT_TARGET), tx.eventsSince(0, ["game_event"])]);
  const today = etDateKey(new Date(nowMs));
  return past.map((test) => {
    const finishes = practiceFinishes(events, test.chapterId);
    const last = lastFullFinish(finishes);
    const reviews = factReviews(test.chapterId, test.testDate, last, rows);
    const reviewsDone = finishes.filter((f) => f.mode === "review");
    const lastReview = reviewsDone[reviewsDone.length - 1] ?? null;
    return { test, reviews, last, lastReview, due: dueFacts(reviews, nowMs), reviewedToday: reviewsDone.some((f) => etDateKey(new Date(f.serverTs)) === today) };
  });
}

/** Save review answers (first try right = pass). Unknown facts and facts outside the chapter are ignored. */
export async function recordPracticeReview(tx: LearnerTx, chapterId: string, testDate: string, results: { factId: string; correct: boolean }[], nowMs: number): Promise<number> {
  const bank = practiceBank(chapterId);
  if (!bank) return 0;
  const ids = new Set(bank.facts.map((f) => f.id));
  const events = await tx.eventsSince(0, ["game_event"]);
  const last = lastFullFinish(practiceFinishes(events, chapterId));
  let saved = 0;
  for (const r of results.slice(0, 20)) {
    if (!ids.has(r.factId)) continue;
    const prev = (await tx.getReview(PRACTICE_FACT_TARGET, r.factId)) ?? seedRow(r.factId, testDate, last);
    const box = r.correct ? nextBoxOnPass(prev.box) : onFail().box;
    await tx.upsertReview({
      targetType: PRACTICE_FACT_TARGET,
      targetId: r.factId,
      box,
      dueAt: dueAt(new Date(nowMs), box).getTime(),
      lastResult: r.correct ? "pass" : "fail",
      lapses: prev.lapses + (r.correct ? 0 : 1),
    });
    saved += 1;
  }
  return saved;
}
