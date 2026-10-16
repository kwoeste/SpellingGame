import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { nextItemFor, startSession } from "@/lib/engine/store";

export async function POST(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as {
    chapterId?: string;
    sessionId?: string;
    learner_id?: string;
    include?: string;
  };
  void url.searchParams.get("learner_id");
  void body.learner_id;
  void body.include;
  const learnerId = gate.actor.learnerId;
  if (!learnerId) return jsonForbidden();
  const session = startSession({ learnerId, entryPoint: "study" });
  const item = nextItemFor({
    learnerId,
    sessionId: body.sessionId ?? session.id,
    chapterId: body.chapterId,
  });
  return NextResponse.json(item, { headers: noStoreHeaders() });
}
