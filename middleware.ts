import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/auth/audit";
import { auth } from "@/lib/auth/config";
import { envRoleForEmail } from "@/lib/auth/allowlist";
import { decideRequest } from "@/lib/auth/decide";
import { normalizePath } from "@/lib/auth/paths";

function notAllowedPage(): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not allowed</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px"><h1>Not allowed</h1><p>You do not have access to this page. If you think you should, sign out and sign in with your admin account.</p><p><a href="/">Go to the home page</a></p></body></html>`,
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

type AuthedRequest = NextRequest & { auth?: { user?: { email?: string | null; role?: string | null } } | null };

export default auth(async (req: AuthedRequest) => {
  const pathname = normalizePath(req.nextUrl.pathname);
  const authEmail = req.auth?.user?.email?.toLowerCase() ?? null;
  const tokenRole = req.auth?.user?.role ?? null;
  const envRole = authEmail ? envRoleForEmail(authEmail) : null;
  const role = envRole && envRole === tokenRole ? envRole : req.auth ? "outsider" : null;
  const decision = decideRequest({
    pathname,
    hasSession: Boolean(req.auth),
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
      userEmail: authEmail ?? "anonymous",
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
