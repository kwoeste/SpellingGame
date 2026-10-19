import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/allowlist";
import { auth } from "@/lib/auth/config";
import { resolveUser, type AppUser } from "@/lib/auth/users";

/**
 * Server-component guard. Middleware already gates these paths; this re-checks against the user
 * store so a page never renders gated content on a stale or forged token.
 */
export async function requirePageUser(allowed: AppRole[], from: string): Promise<AppUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect(`/sign-in?from=${encodeURIComponent(from)}`);
  const user = await resolveUser(email);
  return user && allowed.includes(user.role) ? user : null;
}
