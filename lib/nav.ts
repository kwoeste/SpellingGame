import { envRoleForEmail, type AppRole } from "@/lib/auth/allowlist";

export type HeaderViewer = AppRole | "outsider" | null;

export type NavLink = { href: string; label: string };

export type HeaderNav = { links: NavLink[]; account: "sign-in" | "sign-out"; homeHref: string };

export const SIGN_OUT_HREF = "/api/auth/signout";

const STUDY: NavLink = { href: "/study", label: "Study" };
const ADMIN: NavLink = { href: "/admin", label: "Admin" };

/** Same rule as middleware: the env allowlist role must match the role in the session token. */
export function headerViewer(session: { user?: { email?: string | null; role?: string | null } } | null): HeaderViewer {
  if (!session) return null;
  const email = session.user?.email?.toLowerCase();
  const envRole = email ? envRoleForEmail(email) : null;
  return envRole && envRole === session.user?.role ? envRole : "outsider";
}

export function headerNav(viewer: HeaderViewer): HeaderNav {
  switch (viewer) {
    case null:
      return { links: [], account: "sign-in", homeHref: "/" };
    case "outsider":
      return { links: [], account: "sign-out", homeHref: "/" };
    case "student":
      return { links: [STUDY], account: "sign-out", homeHref: "/study" };
    case "admin":
      return { links: [STUDY, ADMIN], account: "sign-out", homeHref: "/study" };
    default: {
      const unhandled: never = viewer;
      throw new Error(`Unhandled header viewer: ${String(unhandled)}`);
    }
  }
}
