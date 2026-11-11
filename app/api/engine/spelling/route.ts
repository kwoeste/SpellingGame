import { engineActor, engineFailure, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { checkSpelling, finishSpellingRound, spellingSummary } from "@/lib/spelling/service";

/** Spelling lists (signed-in student/admin only; /api/engine is gated in middleware too). `?list=` picks the list; D-2 is the default. */
export async function GET(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const list = new URL(req.url).searchParams.get("list") ?? undefined;
  try {
    return engineJson({ summary: await spellingSummary(engineRepo(), gate.actor, Date.now(), list) });
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
        sort: check.sort,
        mode: check.mode,
        misses: check.misses,
        retry: check.retry === true,
        phase: check.phase,
        list: check.list,
        sessionId: typeof check.sessionId === "string" ? check.sessionId : null,
      });
      return result ? engineJson({ result }) : engineJson({ error: "not_found" }, 404);
    }
    const finished = body.finished as Record<string, unknown> | undefined;
    if (finished && typeof finished === "object") {
      await finishSpellingRound(engineRepo(), gate.actor, { mode: finished.mode, score: finished.score, total: finished.total, missed: finished.missed, list: finished.list });
      return engineJson({ ok: true });
    }
    return engineJson({ error: "bad_request" }, 400);
  } catch (error) {
    return engineFailure(error);
  }
}
