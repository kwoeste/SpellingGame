import { readFileSync } from "node:fs";
import path from "node:path";

export function migrationSql(): string {
  return readFileSync(path.join(process.cwd(), "db/migrations/001_engine_schema.sql"), "utf8");
}

export function assertsStudentCannotReadAdmin(sql: string): string[] {
  const missing: string[] = [];
  if (!/REVOKE ALL ON SCHEMA admin_api FROM PUBLIC, app_student/i.test(sql) && !/REVOKE ALL ON SCHEMA admin_api FROM app_student/i.test(sql)) {
    missing.push("revoke admin_api from app_student");
  }
  if (!/REVOKE ALL ON SCHEMA engine FROM app_student/i.test(sql)) {
    missing.push("revoke engine from app_student");
  }
  if (!/ENABLE ROW LEVEL SECURITY/i.test(sql)) {
    missing.push("enable RLS");
  }
  if (!/assistant_ro/i.test(sql)) {
    missing.push("assistant_ro role");
  }
  if (!/default_transaction_read_only/i.test(sql)) {
    missing.push("assistant_ro read only");
  }
  return missing;
}
