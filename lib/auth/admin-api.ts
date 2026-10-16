import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/auth/audit";

export async function adminGate(req: Request) {
  const gate = await requireRole(req, "admin");
  if (!gate.ok) {
    await writeAudit({
      userEmail: "unknown",
      role: "denied",
      route: new URL(req.url).pathname,
      method: req.method,
      status: gate.status,
      detail: "admin_api",
    });
    return { ok: false as const, response: gate.status === 401 ? jsonUnauthorized() : jsonForbidden() };
  }
  return { ok: true as const, actor: gate.actor, headers: noStoreHeaders() };
}
