import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { feedbackAfter, recordEvents, scoreResponse, type InteractionEvent } from "@/lib/engine/store";

export async function POST(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  const learnerId = gate.actor.learnerId;
  if (!learnerId) return jsonForbidden();
  const body = (await req.json().catch(() => ({}))) as { events?: InteractionEvent[]; submit?: { sessionId: string; itemId: string; response: unknown; hintLevel?: number } };
  if (body.submit) {
    const scored = scoreResponse(body.submit.itemId, body.submit.response);
    const feedback = feedbackAfter({
      learnerId,
      sessionId: body.submit.sessionId,
      itemId: body.submit.itemId,
      response: body.submit.response,
      hintLevel: body.submit.hintLevel,
    });
    return NextResponse.json({ accepted: 1, scored, feedback }, { headers: noStoreHeaders() });
  }
  const incoming = (body.events ?? []).map((event) => ({
    ...event,
    learnerId,
    serverTs: Date.now(),
  }));
  const accepted = recordEvents(incoming, learnerId);
  return NextResponse.json({ accepted: accepted.length }, { headers: noStoreHeaders() });
}
