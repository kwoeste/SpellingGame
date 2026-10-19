import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole, sameOriginOrForbidden } from "@/lib/auth/guards";

export async function adminGate(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const blocked = sameOriginOrForbidden(req);
    if (blocked) return { ok: false as const, response: blocked };
  }
  const gate = await requireRole(req, "admin");
  if (!gate.ok) {
    return { ok: false as const, response: gate.status === 401 ? jsonUnauthorized() : jsonForbidden() };
  }
  return { ok: true as const, actor: gate.actor, headers: noStoreHeaders() };
}

/** Runs an admin read and turns database failures into a 500 instead of an unhandled rejection. */
export async function adminRead(req: Request, read: () => Promise<Record<string, unknown>>): Promise<Response> {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json(await read(), { headers: gate.headers });
  } catch (error) {
    console.error("admin read failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: gate.headers });
  }
}
