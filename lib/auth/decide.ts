import type { AppRole } from "@/lib/auth/allowlist";
import { isAdminPath, isApiPath, isGatedStudentPath, normalizePath } from "@/lib/auth/paths";

export type GateDecision =
  | { kind: "allow"; cache: "private" }
  | { kind: "forbidden"; status: 403; page: boolean }
  | { kind: "unauthorized"; status: 401 }
  | { kind: "redirect-signin" }
  | { kind: "pass" };

export function decideRequest(args: {
  pathname: string;
  hasSession: boolean;
  role: AppRole | "outsider" | null;
}): GateDecision {
  const pathname = normalizePath(args.pathname);
  const admin = isAdminPath(pathname);
  const gated = isGatedStudentPath(pathname);
  if (!admin && !gated) return { kind: "pass" };

  if (admin) {
    if (args.role !== "admin") {
      if (isApiPath(pathname) && !args.hasSession) return { kind: "unauthorized", status: 401 };
      return { kind: "forbidden", status: 403, page: !isApiPath(pathname) };
    }
    return { kind: "allow", cache: "private" };
  }

  if (!args.hasSession) {
    if (isApiPath(pathname)) return { kind: "unauthorized", status: 401 };
    return { kind: "redirect-signin" };
  }
  if (args.role !== "student" && args.role !== "admin") {
    return { kind: "forbidden", status: 403, page: !isApiPath(pathname) };
  }
  return { kind: "allow", cache: "private" };
}
