import { engineActor, engineFailure, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { gradeRecapCheck } from "@/lib/content/recaps";
import { recordEvents, skipItem, submitAnswer, type ClientEvent } from "@/lib/engine/service";

/**
 * `{ submit: { sessionId, itemId, response, hintLevel, latencyMs, eventId, misses } }` scores an answer on the
 * server and returns feedback. `{ sessionId, events: [...] }` records non-answer events. Any
 * `{ skip: { sessionId, itemId } }` is "Skip for now" (allowed only once Show me is offered). Any
 * client-supplied isCorrect or learner id is ignored.
 */
export async function POST(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const body = await readJson(req);
  try {
    const submit = body.submit as Record<string, unknown> | undefined;
    if (submit && typeof submit === "object") {
      if (typeof submit.itemId !== "string") return engineJson({ error: "item_required" }, 400);
      const feedback = await submitAnswer(engineRepo(), gate.actor, {
        sessionId: typeof submit.sessionId === "string" ? submit.sessionId : null,
        itemId: submit.itemId,
        response: submit.response,
        hintLevel: submit.hintLevel,
        latencyMs: submit.latencyMs,
        eventId: typeof submit.eventId === "string" ? submit.eventId : null,
        misses: submit.misses,
        mode: submit.mode === "review" ? "review" : undefined,
      });
      return engineJson({ feedback });
    }
    const skip = body.skip as Record<string, unknown> | undefined;
    if (skip && typeof skip === "object") {
      if (typeof skip.itemId !== "string") return engineJson({ error: "item_required" }, 400);
      const result = await skipItem(engineRepo(), gate.actor, {
        sessionId: typeof skip.sessionId === "string" ? skip.sessionId : null,
        itemId: skip.itemId,
      });
      return engineJson(result);
    }
    const watchCheck = body.watchCheck as Record<string, unknown> | undefined;
    if (watchCheck && typeof watchCheck === "object") {
      if (typeof watchCheck.chapterId !== "string" || typeof watchCheck.choiceId !== "string") return engineJson({ error: "bad_request" }, 400);
      const misses = typeof watchCheck.misses === "number" ? watchCheck.misses : 0;
      const graded = gradeRecapCheck(watchCheck.chapterId, watchCheck.choiceId, misses);
      if (!graded) return engineJson({ error: "not_found" }, 404);
      return engineJson(graded);
    }
    const events = Array.isArray(body.events) ? (body.events as ClientEvent[]) : [];
    const result = await recordEvents(engineRepo(), gate.actor, {
      sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
      events,
      entryPoint: typeof body.entry === "string" ? body.entry.slice(0, 40) : undefined,
    });
    return engineJson(result);
  } catch (error) {
    return engineFailure(error);
  }
}
