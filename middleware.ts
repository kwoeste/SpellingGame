import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/auth/audit";
import { auth } from "@/lib/auth/config";
import { decideRequest } from "@/lib/auth/decide";
import { sessionFromRequest } from "@/lib/auth/guards";
import { normalizePath } from "@/lib/auth/paths";
import { getResolvedUser } from "@/lib/auth/users";

function notAllowedPage(): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not allowed</title></head><body><h1>Not allowed</h1><p>You do not have access to this page.</p></body></html>`,
    {
      status: 403,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    },
  );
}

function json(status: number, body: unknown): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

type AuthedRequest = NextRequest & { auth?: { user?: { email?: string | null } } | null };

export default auth(async (req: AuthedRequest) => {
  const pathname = normalizePath(req.nextUrl.pathname);
  const cookieSession = sessionFromRequest(req);
  const cookieUser = cookieSession ? getResolvedUser(cookieSession.email) : null;
  const authEmail = req.auth?.user?.email?.toLowerCase() ?? null;
  const authUser = authEmail ? getResolvedUser(authEmail) : null;
  const role = cookieUser?.role ?? authUser?.role ?? ((cookieSession || req.auth) ? "outsider" : null);
  const decision = decideRequest({
    pathname,
    hasSession: Boolean(cookieSession || req.auth),
    role,
  });

  if (decision.kind === "pass") return NextResponse.next();

  if (decision.kind === "unauthorized") {
    await writeAudit({
      userEmail: "anonymous",
      role: "anonymous",
      route: pathname,
      method: req.method,
      status: 401,
      detail: "gated_anon",
    });
    return json(401, { error: "unauthorized" });
  }

  if (decision.kind === "redirect-signin") {
    await writeAudit({
      userEmail: "anonymous",
      role: "anonymous",
      route: pathname,
      method: req.method,
      status: 302,
      detail: "gated_anon",
    });
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (decision.kind === "forbidden") {
    await writeAudit({
      userEmail: cookieSession?.email ?? authEmail ?? "anonymous",
      role: role ?? "anonymous",
      route: pathname,
      method: req.method,
      status: 403,
      detail: "role_denied",
    });
    if (decision.page) return notAllowedPage();
    return json(403, { error: "forbidden" });
  }

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|images/|audio/).*)"],
};
