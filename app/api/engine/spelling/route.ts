import { engineActor, engineFailure, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { checkSpelling, finishSpellingRound, spellingSummary } from "@/lib/spelling/service";

/** Spelling List D-2 (signed-in student/admin only; /api/engine is gated in middleware too). */
export async function GET(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  try {
    return engineJson({ summary: await spellingSummary(engineRepo(), gate.actor) });
  } catch (error) {
    return engineFailure(error);
  }
}

/**
 * `{ check: { word, typed | vowel, mode, misses, sessionId } }` → server grading + help ladder (stored per word).
 * `{ finished: { mode, score, total, missed } }` → round summary for the admin page.
 */
export async function POST(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const body = await readJson(req);
  try {
    const check = body.check as Record<string, unknown> | undefined;
    if (check && typeof check === "object") {
      const result = await checkSpelling(engineRepo(), gate.actor, {
        word: check.word,
        typed: check.typed,
        vowel: check.vowel,
        mode: check.mode,
        misses: check.misses,
        sessionId: typeof check.sessionId === "string" ? check.sessionId : null,
      });
      return result ? engineJson({ result }) : engineJson({ error: "not_found" }, 404);
    }
    const finished = body.finished as Record<string, unknown> | undefined;
    if (finished && typeof finished === "object") {
      await finishSpellingRound(engineRepo(), gate.actor, { mode: finished.mode, score: finished.score, total: finished.total, missed: finished.missed });
      return engineJson({ ok: true });
    }
    return engineJson({ error: "bad_request" }, 400);
  } catch (error) {
    return engineFailure(error);
  }
}
