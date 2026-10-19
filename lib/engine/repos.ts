import { hasDatabase, poolOverrideActive } from "@/lib/db/client";
import type { AdminRepo, EngineRepo } from "@/lib/engine/repo";
import { memoryAdminRepo, memoryEngineRepo } from "@/lib/engine/repo-memory";
import { pgAdminRepo, pgEngineRepo } from "@/lib/engine/repo-pg";

function usePostgres(): boolean {
  if (poolOverrideActive() || hasDatabase()) return true;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("No database configured in production; refusing to keep learner data in memory.");
  }
  return false;
}

/** Postgres whenever a database is configured; the in-memory repo is for local dev and unit tests. */
export function engineRepo(): EngineRepo {
  return usePostgres() ? pgEngineRepo : memoryEngineRepo;
}

export function adminRepo(): AdminRepo {
  return usePostgres() ? pgAdminRepo : memoryAdminRepo;
}
