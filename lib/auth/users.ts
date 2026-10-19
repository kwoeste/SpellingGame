import type { AppRole } from "@/lib/auth/allowlist";
import { envRoleForEmail } from "@/lib/auth/allowlist";
import { hasDatabase, poolOverrideActive, queryOnce } from "@/lib/db/client";

export type AppUser = {
  id: string;
  email: string;
  role: AppRole;
  learnerId: string | null;
  displayName: string | null;
  disabledAt: string | null;
};

/** Matches the learner seeded by db/migrations/002_seed_users.sql. */
export const SEEDED_LEARNER_ID = "11111111-1111-1111-1111-111111111111";

const memoryUsers = new Map<string, AppUser>();

function seedDefaults(): void {
  if (memoryUsers.size > 0) return;
  memoryUsers.set("mae.woeste@gmail.com", {
    id: "user-student",
    email: "mae.woeste@gmail.com",
    role: "student",
    learnerId: SEEDED_LEARNER_ID,
    displayName: "Mae",
    disabledAt: null,
  });
  for (const email of ["kevinw@mcsteen.com", "woeste.kevin@gmail.com", "molly.woeste@gmail.com"]) {
    memoryUsers.set(email, {
      id: `user-${email}`,
      email,
      role: "admin",
      learnerId: null,
      displayName: email.split("@")[0] ?? "Admin",
      disabledAt: null,
    });
  }
}

seedDefaults();

export function resetMemoryUsers(): void {
  memoryUsers.clear();
  seedDefaults();
  userCache.clear();
}

export function upsertMemoryUser(user: AppUser): void {
  memoryUsers.set(user.email.toLowerCase(), { ...user, email: user.email.toLowerCase() });
  userCache.clear();
}

export function removeMemoryUser(email: string): void {
  memoryUsers.delete(email.toLowerCase());
  userCache.clear();
}

export function getMemoryUser(email: string): AppUser | null {
  return memoryUsers.get(email.toLowerCase()) ?? null;
}

export function listMemoryUsers(): AppUser[] {
  return [...memoryUsers.values()];
}

function agreed(email: string, stored: AppUser | null): AppUser | null {
  const envRole = envRoleForEmail(email);
  if (!envRole || !stored || stored.disabledAt) return null;
  return stored.role === envRole ? stored : null;
}

/** Role is granted only when the env allowlist and the in-memory user store agree. */
export function resolveAgreedRole(email: string): AppRole | null {
  const normalized = email.trim().toLowerCase();
  return agreed(normalized, getMemoryUser(normalized))?.role ?? null;
}

type ResolveRow = {
  id: string;
  email: string;
  role: AppRole;
  learner_id: string | null;
  display_name: string | null;
  disabled_at: string | Date | null;
};

async function databaseUser(email: string): Promise<AppUser | null> {
  const [row] = await queryOnce<ResolveRow>("student", "SELECT * FROM student_api.resolve_user($1)", [email]);
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email).toLowerCase(),
    role: row.role,
    learnerId: row.learner_id ? String(row.learner_id) : null,
    displayName: row.display_name,
    disabledAt: row.disabled_at ? new Date(row.disabled_at).toISOString() : null,
  };
}

const USER_CACHE_MS = 30_000;
const userCache = new Map<string, { user: AppUser | null; at: number }>();

export function clearUserCache(): void {
  userCache.clear();
}

/**
 * The signed-in user, or null. Requires the env allowlist (ADMIN_EMAILS / STUDENT_EMAILS) and
 * engine.app_user to agree on the role and the user not to be disabled. Uses Postgres when a
 * database is configured; a lookup error denies access rather than falling back.
 */
export async function resolveUser(email: string): Promise<AppUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !envRoleForEmail(normalized)) return null;
  if (!poolOverrideActive() && !hasDatabase()) return agreed(normalized, getMemoryUser(normalized));
  const cached = userCache.get(normalized);
  if (cached && Date.now() - cached.at < USER_CACHE_MS) return cached.user;
  try {
    const user = agreed(normalized, await databaseUser(normalized));
    userCache.set(normalized, { user, at: Date.now() });
    return user;
  } catch (error) {
    console.error("user lookup failed; denying access", error);
    return null;
  }
}
