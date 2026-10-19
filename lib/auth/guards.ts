import type { NextRequest } from "next/server";
import type { AppRole } from "@/lib/auth/allowlist";
import { writeAudit } from "@/lib/auth/audit";
import { auth } from "@/lib/auth/config";
import { getSession, type AuthSession } from "@/lib/auth/sessions";
import { resolveUser } from "@/lib/auth/users";

export type AuthedActor = {
  email: string;
  role: AppRole;
  learnerId: string | null;
  userId: string;
  sessionId: string | null;
};

export const STUDENT_PROGRESS_ALLOWLIST = [
  "rings",
  "xp_total",
  "xp_today",
  "streak_days",
  "badges",
] as const;

export const NEXT_ITEM_FORBIDDEN_KEYS = [
  "p_mastery",
  "theta",
  "elo",
  "reason_code",
  "strategy",
  "misconception",
  "frustration",
  "affect",
  "latency",
  "answer_key",
  "p_correct",
] as const;

export const FEEDBACK_FORBIDDEN_KEYS = [
  "misconception",
  "strategy",
  "p_mastery",
  "theta",
  "elo",
  "p_correct",
] as const;

function requestOrigins(req: Request): Set<string> {
  const url = new URL(req.url);
  const origins = new Set([url.origin]);
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    origins.add(`${proto}://${forwardedHost}`);
  }
  return origins;
}

/** CSRF defense in depth for state-changing routes (Auth.js cookies are already SameSite=Lax). */
export function sameOriginOrForbidden(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (origin) return requestOrigins(req).has(origin) ? null : jsonForbidden();
  return req.headers.get("sec-fetch-site") === "cross-site" ? jsonForbidden() : null;
}

/** Opaque test sessions (cookie or header) exist only under NODE_ENV=test. */
export function sessionFromRequest(req: NextRequest | Request): AuthSession | null {
  if (process.env.NODE_ENV !== "test") return null;
  const cookieHeader =
    "cookies" in req ? req.cookies.get("mae_session")?.value : undefined;
  const fallback = req.headers.get("cookie") ?? "";
  const match = fallback.match(/(?:^|;\s*)mae_session=([^;]+)/);
  const id = cookieHeader ?? match?.[1] ?? req.headers.get("x-test-session");
  if (!id) return null;
  return getSession(id);
}

export async function requireRole(
  req: NextRequest | Request,
  allowed: AppRole | AppRole[],
): Promise<{ ok: true; actor: AuthedActor } | { ok: false; status: 401 | 403; body: unknown }> {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  const route = new URL(req.url).pathname;
  const testSession = sessionFromRequest(req);
  const signedIn = testSession || process.env.NODE_ENV === "test" ? null : await auth().catch(() => null);
  const email = (testSession?.email ?? signedIn?.user?.email ?? "").toLowerCase() || null;
  const deny = async (status: 401 | 403, role: string, detail: string) => {
    await writeAudit({ userEmail: email ?? "anonymous", role, route, method: req.method, status, detail });
    return { ok: false as const, status, body: { error: status === 401 ? "unauthorized" : "forbidden" } };
  };
  if (!email) return deny(401, "anonymous", "no_session");
  const user = await resolveUser(email);
  if (!user) return deny(403, "outsider", "not_allowlisted_or_disabled");
  if (testSession && testSession.role !== user.role) return deny(403, testSession.role, "role_drift");
  if (!allowedRoles.includes(user.role)) return deny(403, user.role, "role_denied");
  return {
    ok: true,
    actor: {
      email: user.email,
      role: user.role,
      learnerId: user.learnerId,
      userId: user.id,
      sessionId: testSession?.id ?? null,
    },
  };
}

export function jsonForbidden(): Response {
  return Response.json({ error: "forbidden" }, { status: 403, headers: noStoreHeaders() });
}

export function jsonUnauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401, headers: noStoreHeaders() });
}

export function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "private, no-store" };
}

export function pickAllowlisted<T extends Record<string, unknown>>(
  payload: T,
  allow: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allow) {
    if (key in payload) out[key] = payload[key];
  }
  return out;
}

export function assertNoForbiddenKeys(
  payload: Record<string, unknown>,
  forbidden: readonly string[],
): void {
  for (const key of forbidden) {
    if (key in payload) {
      throw new Error(`Forbidden key leaked to student: ${key}`);
    }
  }
}
