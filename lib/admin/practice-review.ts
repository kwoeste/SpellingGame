import { getChapter } from "@/lib/content/catalog";
import type { SubjectId } from "@/lib/content/types";
import type { ReviewRow, StoredEvent } from "@/lib/engine/repo";
import { dueFacts, factReviews, lastFullFinish, pastPracticeTests, practiceFinishes, PRACTICE_FACT_TARGET, solidShare } from "@/lib/practice/review";
import type { UpcomingTest } from "@/lib/practice/upcoming";

export type PastTestRow = {
  id: string;
  chapterId: string;
  title: string;
  subject: SubjectId | null;
  testDate: string;
  /** Her last full practice test (first-try right / questions), or null if she never finished one. */
  lastScore: { right: number; total: number; at: number } | null;
  /** Last time she did a quick review, or null. */
  lastReviewAt: number | null;
  dueNow: number;
  bankFacts: number;
  /** Share of the bank she has solid, 0..100. */
  solidPct: number;
};

/** Past dated practice tests now in spaced review, newest test first (pure; the admin "In review" list). */
export function buildPastTestRows(
  tests: UpcomingTest[],
  reviews: Pick<ReviewRow, "targetType" | "targetId" | "box" | "dueAt" | "lastResult" | "lapses">[],
  events: Pick<StoredEvent, "type" | "serverTs" | "payload" | "isPreview">[],
  nowMs: number,
): PastTestRow[] {
  const rows = reviews.filter((r) => r.targetType === PRACTICE_FACT_TARGET) as ReviewRow[];
  return pastPracticeTests(nowMs, tests).map((t) => {
    const finishes = practiceFinishes(events, t.chapterId);
    const last = lastFullFinish(finishes);
    const facts = factReviews(t.chapterId, t.testDate, last, rows);
    const reviewsDone = finishes.filter((f) => f.mode === "review");
    return {
      id: t.id,
      chapterId: t.chapterId,
      title: t.title,
      subject: getChapter(t.chapterId)?.subject ?? null,
      testDate: t.testDate,
      lastScore: last && last.score !== null && last.total ? { right: last.score, total: last.total, at: last.serverTs } : null,
      lastReviewAt: reviewsDone.length ? reviewsDone[reviewsDone.length - 1].serverTs : null,
      dueNow: dueFacts(facts, nowMs, Infinity).length,
      bankFacts: facts.length,
      solidPct: Math.round(solidShare(facts) * 100),
    };
  });
}

export async function loadPastTestRows(learnerId: string, nowMs = Date.now()): Promise<PastTestRow[]> {
  const [{ adminRepo }, { loadUpcomingTests }] = await Promise.all([import("@/lib/engine/repos"), import("@/lib/practice/upcoming-store")]);
  const repo = adminRepo();
  const [tests, reviews, events] = await Promise.all([loadUpcomingTests("admin"), repo.reviews(), repo.eventsOfType("game_event", 3000)]);
  return buildPastTestRows(tests, reviews.filter((r) => r.learnerId === learnerId), events.filter((e) => e.learnerId === learnerId), nowMs);
}
