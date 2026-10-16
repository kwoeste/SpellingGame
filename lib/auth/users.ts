import type { AppRole } from "@/lib/auth/allowlist";
import { envRoleForEmail } from "@/lib/auth/allowlist";

export type AppUser = {
  id: string;
  email: string;
  role: AppRole;
  learnerId: string | null;
  displayName: string | null;
  disabledAt: string | null;
};

const memoryUsers = new Map<string, AppUser>();

function seedDefaults(): void {
  if (memoryUsers.size > 0) return;
  memoryUsers.set("mae.woeste@gmail.com", {
    id: "user-student",
    email: "mae.woeste@gmail.com",
    role: "student",
    learnerId: "learner-mae",
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
}

export function upsertMemoryUser(user: AppUser): void {
  memoryUsers.set(user.email.toLowerCase(), { ...user, email: user.email.toLowerCase() });
}

export function removeMemoryUser(email: string): void {
  memoryUsers.delete(email.toLowerCase());
}

export function getMemoryUser(email: string): AppUser | null {
  return memoryUsers.get(email.toLowerCase()) ?? null;
}

export function listMemoryUsers(): AppUser[] {
  return [...memoryUsers.values()];
}

/** Role is granted only when env allowlist and user store agree. */
export function resolveAgreedRole(email: string): AppRole | null {
  const normalized = email.trim().toLowerCase();
  const envRole = envRoleForEmail(normalized);
  const dbUser = getMemoryUser(normalized);
  if (!envRole || !dbUser || dbUser.disabledAt) return null;
  if (dbUser.role !== envRole) return null;
  return envRole;
}

export function getResolvedUser(email: string): AppUser | null {
  const role = resolveAgreedRole(email);
  if (!role) return null;
  return getMemoryUser(email);
}
