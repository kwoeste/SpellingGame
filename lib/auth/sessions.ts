import type { AppRole } from "@/lib/auth/allowlist";
import { getMemoryUser, resolveAgreedRole, type AppUser } from "@/lib/auth/users";

export type AuthSession = {
  id: string;
  userId: string;
  email: string;
  role: AppRole;
  learnerId: string | null;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

const sessions = new Map<string, AuthSession>();

function ttlMsForRole(role: AppRole): number {
  return role === "admin" ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
}

function randomId(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hashUserAgent(userAgent: string | null | undefined): string {
  const text = userAgent ?? "unknown";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function createSession(user: AppUser, now = Date.now()): AuthSession {
  const session: AuthSession = {
    id: randomId(),
    userId: user.id,
    email: user.email,
    role: user.role,
    learnerId: user.learnerId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + ttlMsForRole(user.role),
    revokedAt: null,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string, now = Date.now()): AuthSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.revokedAt || session.expiresAt <= now) return null;
  session.lastSeenAt = now;
  session.expiresAt = now + ttlMsForRole(session.role);
  return session;
}

export function revokeSession(id: string, now = Date.now()): void {
  const session = sessions.get(id);
  if (session) session.revokedAt = now;
}

export function revokeSessionsForEmail(email: string, now = Date.now()): void {
  for (const session of sessions.values()) {
    if (session.email === email.toLowerCase()) session.revokedAt = now;
  }
}

export function resetSessions(): void {
  sessions.clear();
}

export function mintTestSession(email: string, now = Date.now()): AuthSession {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test sessions can only be minted when NODE_ENV=test");
  }
  const user = resolveAgreedRole(email) ? getMemoryUser(email) : null;
  if (!user) {
    throw new Error(`Cannot mint session for ${email}`);
  }
  return createSession(user, now);
}

export function listSessions(): AuthSession[] {
  return [...sessions.values()];
}
