import { getChapter } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import { engineActor, engineJson, readJson } from "@/lib/engine/http";
import { buildAttempt, gradeQuestion, hasPracticeTest, parseQid, practiceHelp } from "@/lib/practice/bank";

/**
 * Practice test (signed-in student/admin only; /api/engine is gated in middleware too).
 * `{ attempt: { chapterId, factIds? } }` → a fresh shuffled attempt (no answers).
 * `{ check: { qid, responses, misses } }` → server grading + the stuck-help ladder.
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
    return engineJson({ result, help: graded.correct ? null : practiceHelp(check.qid, misses + 1) });
  }
  return engineJson({ error: "bad_request" }, 400);
}
