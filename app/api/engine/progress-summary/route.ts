import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { progressSummary } from "@/lib/engine/store";

export async function GET(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  const learnerId = gate.actor.learnerId;
  if (!learnerId) return jsonForbidden();
  return NextResponse.json(progressSummary(learnerId), { headers: noStoreHeaders() });
}
