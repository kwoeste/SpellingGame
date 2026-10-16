import type { NextRequest } from "next/server";
import type { AppRole } from "@/lib/auth/allowlist";
import { writeAudit } from "@/lib/auth/audit";
import { getSession, type AuthSession } from "@/lib/auth/sessions";
import { getResolvedUser } from "@/lib/auth/users";

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

export function sessionFromRequest(req: NextRequest | Request): AuthSession | null {
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
  const session = sessionFromRequest(req);
  const url = new URL(req.url);
  if (!session) {
    const signedIn =
      process.env.NODE_ENV === "test"
        ? null
        : await import("@/lib/auth/config")
            .then((mod) => mod.auth())
            .catch(() => null);
    const email = signedIn?.user?.email?.toLowerCase();
    const user = email ? getResolvedUser(email) : null;
    if (user && allowedRoles.includes(user.role)) {
      return {
        ok: true,
        actor: {
          email: user.email,
          role: user.role,
          learnerId: user.learnerId,
          userId: user.id,
          sessionId: null,
        },
      };
    }
    await writeAudit({
      userEmail: email ?? "anonymous",
      role: user?.role ?? (signedIn ? "outsider" : "anonymous"),
      route: url.pathname,
      method: req.method,
      status: signedIn ? 403 : 401,
      detail: signedIn ? "role_denied" : "no_session",
    });
    return { ok: false, status: signedIn ? 403 : 401, body: { error: signedIn ? "forbidden" : "unauthorized" } };
  }
  const user = getResolvedUser(session.email);
  if (!user || user.role !== session.role) {
    await writeAudit({
      userEmail: session.email,
      role: session.role,
      route: url.pathname,
      method: req.method,
      status: 403,
      detail: "role_drift_or_disabled",
    });
    return { ok: false, status: 403, body: { error: "forbidden" } };
  }
  if (!allowedRoles.includes(user.role)) {
    await writeAudit({
      userEmail: user.email,
      role: user.role,
      route: url.pathname,
      method: req.method,
      status: 403,
      detail: "role_denied",
    });
    return { ok: false, status: 403, body: { error: "forbidden" } };
  }
  return {
    ok: true,
    actor: {
      email: user.email,
      role: user.role,
      learnerId: user.learnerId,
      userId: user.id,
      sessionId: session.id,
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
