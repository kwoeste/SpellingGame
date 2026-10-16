import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { nextItemFor, resumeFor } from "@/lib/engine/store";

export async function GET(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  const learnerId = gate.actor.learnerId;
  if (!learnerId) return jsonForbidden();
  const session = resumeFor(learnerId);
  if (!session) {
    return NextResponse.json({ resume: null }, { headers: noStoreHeaders() });
  }
  const item = nextItemFor({
    learnerId,
    sessionId: session.id,
    chapterId: session.resumeState.chapterId ?? undefined,
    requestedItemId: session.resumeState.itemId ?? undefined,
  });
  return NextResponse.json(
    {
      session_id: session.id,
      activity_id: session.resumeState.activityId,
      item,
    },
    { headers: noStoreHeaders() },
  );
}
