import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { nextItemFor, startSession } from "@/lib/engine/store";

export async function POST(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  const body = (await req.json().catch(() => ({}))) as { entry?: string; chapterId?: string; preview?: boolean };
  const isPreview = gate.actor.role === "admin" && Boolean(body.preview);
  if (!gate.actor.learnerId && !isPreview) {
    return jsonForbidden();
  }
  const learnerId = isPreview ? "learner-preview" : (gate.actor.learnerId as string);
  const session = startSession({
    learnerId,
    entryPoint: body.entry ?? "study",
    isPreview,
  });
  const item = nextItemFor({
    learnerId,
    sessionId: session.id,
    chapterId: body.chapterId,
  });
  return NextResponse.json(
    { session_id: session.id, item, preview: isPreview },
    { headers: noStoreHeaders() },
  );
}
