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

const auditLog: AuditRow[] = [];

export async function writeAudit(entry: Omit<AuditRow, "id" | "ts"> & { ts?: number }): Promise<AuditRow> {
  const row: AuditRow = {
    id: `audit-${auditLog.length + 1}`,
    ts: entry.ts ?? Date.now(),
    userEmail: entry.userEmail,
    role: entry.role,
    route: entry.route,
    method: entry.method,
    status: entry.status,
    detail: entry.detail,
  };
  auditLog.push(row);
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
