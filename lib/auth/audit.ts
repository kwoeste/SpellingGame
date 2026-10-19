import { hasDatabase, poolOverrideActive, queryOnce } from "@/lib/db/client";

export type AuditRow = {
  id: string;
  userEmail: string;
  role: string;
  route: string;
  method: string;
  status: number;
  ts: number;
  detail: string;
};

const MEMORY_LIMIT = 500;
const auditLog: AuditRow[] = [];
let counter = 0;

/**
 * Appends to engine.audit_log when a database is configured (app_student has INSERT only) and
 * always keeps a bounded in-process copy for tests and local dev. Audit failures never block
 * the request they describe.
 */
export async function writeAudit(entry: Omit<AuditRow, "id" | "ts"> & { ts?: number }): Promise<AuditRow> {
  counter += 1;
  const row: AuditRow = {
    id: `audit-${counter}`,
    ts: entry.ts ?? Date.now(),
    userEmail: entry.userEmail.slice(0, 320),
    role: entry.role.slice(0, 40),
    route: entry.route.slice(0, 300),
    method: entry.method.slice(0, 10),
    status: entry.status,
    detail: entry.detail.slice(0, 300),
  };
  auditLog.push(row);
  if (auditLog.length > MEMORY_LIMIT) auditLog.splice(0, auditLog.length - MEMORY_LIMIT);
  if (poolOverrideActive() || hasDatabase()) {
    await queryOnce(
      "student",
      "INSERT INTO engine.audit_log (user_email, role, route, method, status, ts, detail) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [row.userEmail, row.role, row.route, row.method, row.status, new Date(row.ts).toISOString(), row.detail],
    ).catch((error: unknown) => console.error("audit write failed", error));
  }
  return row;
}

export function listAudit(): AuditRow[] {
  return [...auditLog];
}

export function resetAudit(): void {
  auditLog.length = 0;
}

export function lastAuditFor(email: string, route?: string): AuditRow | undefined {
  return [...auditLog]
    .reverse()
    .find((row) => row.userEmail === email && (!route || row.route.startsWith(route)));
}
