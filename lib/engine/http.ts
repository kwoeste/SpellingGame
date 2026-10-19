import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole, sameOriginOrForbidden } from "@/lib/auth/guards";
import { EngineError, type EngineActor } from "@/lib/engine/service";

export async function engineActor(req: Request): Promise<{ ok: true; actor: EngineActor } | { ok: false; response: Response }> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const blocked = sameOriginOrForbidden(req);
    if (blocked) return { ok: false, response: blocked };
  }
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return { ok: false, response: gate.status === 401 ? jsonUnauthorized() : jsonForbidden() };
  return { ok: true, actor: { role: gate.actor.role, learnerId: gate.actor.learnerId } };
}

export function engineJson(body: unknown, status = 200): Response {
  return NextResponse.json(body, { status, headers: noStoreHeaders() });
}

export function engineFailure(error: unknown): Response {
  if (error instanceof EngineError) return engineJson({ error: error.code }, error.status);
  console.error("engine request failed", error);
  return engineJson({ error: "server_error" }, 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
