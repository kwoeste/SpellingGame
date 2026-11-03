import { getChapter } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import { engineActor, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { factReviews, dueFacts, pastPracticeTests, practiceReviewStates, recordPracticeReview } from "@/lib/practice/review";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { buildAttempt, gradeQuestion, hasPracticeTest, parseQid, practiceHelp, practiceWhy } from "@/lib/practice/bank";

/**
 * Practice test (signed-in student/admin only; /api/engine is gated in middleware too).
 * `{ attempt: { chapterId, factIds? } }` → a fresh shuffled attempt (no answers).
 * `{ attempt: { chapterId, review: true } }` → a few due spaced-review questions from a past test.
 * `{ check: { qid, responses, misses } }` → server grading + the stuck-help ladder.
 * `{ review: { chapterId, results: [{ factId, correct }] } }` → saves review boxes (Mae only; admin is preview).
 */
export async function POST(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const body = await readJson(req);
  const attempt = body.attempt as Record<string, unknown> | undefined;
  if (attempt && typeof attempt === "object") {
    const chapterId = typeof attempt.chapterId === "string" ? attempt.chapterId : "";
    const chapter = getChapter(chapterId);
    if (!chapter || !hasPracticeTest(chapterId) || !chapterVisibleTo(chapter, gate.actor.role)) return engineJson({ error: "not_found" }, 404);
    if (attempt.review === true) {
      const now = Date.now();
      const tests = await loadUpcomingTests();
      const past = pastPracticeTests(now, tests).find((t) => t.chapterId === chapterId);
      if (!past) return engineJson({ questions: [], none: true });
      let due: string[];
      if (gate.actor.role === "student" && gate.actor.learnerId) {
        const state = await engineRepo().withLearner(gate.actor.learnerId, async (tx) => (await practiceReviewStates(tx, now, tests)).find((s) => s.test.chapterId === chapterId));
        due = state?.due.map((r) => r.targetId) ?? [];
      } else {
        due = dueFacts(factReviews(chapterId, past.testDate, null, []), now).map((r) => r.targetId); // admin preview: nothing saved
      }
      if (!due.length) return engineJson({ questions: [], none: true });
      return engineJson({ questions: buildAttempt(chapterId, crypto.randomUUID(), due) });
    }
    const factIds = Array.isArray(attempt.factIds) ? attempt.factIds.filter((x): x is string => typeof x === "string").slice(0, 100) : undefined;
    return engineJson({ questions: buildAttempt(chapterId, crypto.randomUUID(), factIds) });
  }
  const check = body.check as Record<string, unknown> | undefined;
  if (check && typeof check === "object" && typeof check.qid === "string") {
    if (!parseQid(check.qid)) return engineJson({ error: "not_found" }, 404);
    const misses = typeof check.misses === "number" && Number.isFinite(check.misses) ? Math.max(0, Math.floor(check.misses)) : 0;
    const graded = gradeQuestion(check.qid, check.responses)!;
    // Only reveal expected spellings once she's right (spelling note) — never on a miss before Show me.
    const result = graded.correct ? graded : { correct: false, exact: false, slots: graded.slots.map((s) => ({ correct: false, exact: false, expected: "" })) };
    return engineJson({ result, why: graded.correct ? practiceWhy(check.qid) : null, help: graded.correct ? null : practiceHelp(check.qid, misses + 1) });
  }
  const review = body.review as Record<string, unknown> | undefined;
  if (review && typeof review === "object" && typeof review.chapterId === "string" && Array.isArray(review.results)) {
    const chapterId = review.chapterId;
    const results = review.results
      .filter((r): r is { factId: string; correct: boolean } => !!r && typeof r === "object" && typeof (r as { factId?: unknown }).factId === "string" && typeof (r as { correct?: unknown }).correct === "boolean")
      .slice(0, 20);
    if (gate.actor.role !== "student" || !gate.actor.learnerId) return engineJson({ saved: 0, preview: true });
    const past = pastPracticeTests(Date.now(), await loadUpcomingTests()).find((t) => t.chapterId === chapterId);
    if (!past) return engineJson({ saved: 0 });
    const saved = await engineRepo().withLearner(gate.actor.learnerId, (tx) => recordPracticeReview(tx, chapterId, past.testDate, results, Date.now()));
    return engineJson({ saved });
  }
  return engineJson({ error: "bad_request" }, 400);
}
