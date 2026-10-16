import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { getLikes, saveLikes } from "@/lib/engine/store";

export async function GET(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  if (!gate.actor.learnerId) return jsonForbidden();
  return NextResponse.json({ likes: getLikes(gate.actor.learnerId) }, { headers: noStoreHeaders() });
}

export async function POST(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  }
  if (!gate.actor.learnerId) return jsonForbidden();
  const body = (await req.json().catch(() => ({}))) as { tags?: { tag: string; liked: boolean }[] };
  return NextResponse.json({ likes: saveLikes(gate.actor.learnerId, body.tags ?? []) }, { headers: noStoreHeaders() });
}
