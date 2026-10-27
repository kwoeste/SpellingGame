import { NextResponse } from "next/server";
import { noStoreHeaders, requireRole, sameOriginOrForbidden } from "@/lib/auth/guards";

export const runtime = "nodejs";

/** The browser reports each time read-aloud fell back from Grok to the device voice, so it is visible in Vercel logs. */
export async function POST(req: Request) {
  const blocked = sameOriginOrForbidden(req);
  if (blocked) return blocked;
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return new NextResponse(null, { status: 204, headers: noStoreHeaders() });
  const body = (await req.json().catch(() => null)) as { reason?: unknown; chars?: unknown; path?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 120) : "unknown";
  const chars = typeof body?.chars === "number" ? body.chars : null;
  const path = typeof body?.path === "string" ? body.path.slice(0, 120) : null;
  console.warn("tts fallback", { reason, chars, path, role: gate.actor.role });
  return new NextResponse(null, { status: 204, headers: noStoreHeaders() });
}
