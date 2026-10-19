import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/auth/audit";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole, sameOriginOrForbidden } from "@/lib/auth/guards";
import { sanitizeIssueText, sanitizePagePath, takeReportToken } from "@/lib/report";

export async function POST(req: Request) {
  const blocked = sameOriginOrForbidden(req);
  if (blocked) return blocked;
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  const { actor } = gate;

  if (!takeReportToken(actor.email)) {
    return NextResponse.json({ ok: false, message: "That's a lot of reports. Try again later." }, { status: 429, headers: noStoreHeaders() });
  }
  const body = (await req.json().catch(() => null)) as { title?: unknown; details?: unknown; page?: unknown } | null;
  const title = sanitizeIssueText(typeof body?.title === "string" ? body.title : "", 120).replace(/\s+/g, " ");
  const details = sanitizeIssueText(typeof body?.details === "string" ? body.details : "", 2000);
  if (!title && !details) {
    return NextResponse.json({ ok: false, message: "Tell us what happened first." }, { status: 400, headers: noStoreHeaders() });
  }
  const page = sanitizePagePath(body?.page);

  await writeAudit({ userEmail: actor.email, role: actor.role, route: "/api/report-problem", method: "POST", status: 200, detail: `report:${page}` });

  const token = process.env.GITHUB_ISSUE_TOKEN;
  const repo = process.env.GITHUB_REPO || "kwoeste/SpellingGame";
  if (!token) {
    return NextResponse.json({ ok: true, queued: false, message: "Thanks! Kevin will see this." }, { status: 202, headers: noStoreHeaders() });
  }
  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "maewoeste-site",
    },
    body: JSON.stringify({
      title: title || "Problem on Mae's site",
      body: `Reported by a signed-in ${actor.role} from \`${page}\`.\n\n${details || "(no details)"}`,
    }),
  }).catch(() => null);
  if (!response?.ok) {
    return NextResponse.json({ ok: false, message: "Could not send that. Please tell Kevin." }, { status: 502, headers: noStoreHeaders() });
  }
  const created = (await response.json()) as { html_url?: string };
  const url = actor.role === "admin" ? created.html_url : undefined;
  return NextResponse.json({ ok: true, url, message: "Thanks! Kevin will see this." }, { headers: noStoreHeaders() });
}
