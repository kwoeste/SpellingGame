import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function migrationSql(): string {
  const dir = path.join(process.cwd(), "db/migrations");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(dir, file), "utf8"))
    .join("\n");
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
  if (!/CREATE TABLE IF NOT EXISTS engine.assignment/i.test(sql)) {
    missing.push("assignment table");
  }
  if (!/CREATE POLICY admin_all_rows ON engine.assignment/i.test(sql)) {
    missing.push("assignment admin RLS");
  }
  if (!/REVOKE ALL ON SCHEMA admin_api FROM app_student/i.test(sql)) {
    missing.push("004 revoke admin_api from student");
  }
  return missing;
}
