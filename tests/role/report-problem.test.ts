import { beforeEach, describe, expect, it } from "vitest";
import { POST as report } from "@/app/api/report-problem/route";
import { resetAudit } from "@/lib/auth/audit";
import { mintTestSession, resetSessions } from "@/lib/auth/sessions";
import { resetMemoryUsers } from "@/lib/auth/users";
import { resetReportLimits, sanitizeIssueText, sanitizePagePath } from "@/lib/report";

function post(body: unknown, opts: { email?: string; origin?: string } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.email) headers.set("x-test-session", mintTestSession(opts.email).id);
  if (opts.origin) headers.set("origin", opts.origin);
  return new Request("http://local/api/report-problem", { method: "POST", headers, body: JSON.stringify(body) });
}

describe("report a problem", () => {
  beforeEach(() => {
    delete process.env.GITHUB_ISSUE_TOKEN;
    resetSessions();
    resetMemoryUsers();
    resetAudit();
    resetReportLimits();
  });

  it("rejects anonymous and cross-origin requests", async () => {
    expect((await report(post({ title: "hi" }))).status).toBe(401);
    expect((await report(post({ title: "hi" }, { email: "mae.woeste@gmail.com", origin: "https://evil.example" }))).status).toBe(403);
  });

  it("accepts a signed-in report, validates, and rate-limits", async () => {
    expect((await report(post({}, { email: "mae.woeste@gmail.com" }))).status).toBe(400);
    for (let i = 0; i < 4; i += 1) {
      expect((await report(post({ title: `bug ${i}` }, { email: "mae.woeste@gmail.com", origin: "http://local" }))).status).toBe(202);
    }
    expect((await report(post({ title: "again" }, { email: "mae.woeste@gmail.com" }))).status).toBe(429);
  });

  it("strips mentions, links, and markup", () => {
    const clean = sanitizeIssueText("hey @kwoeste see https://x.y/z ![img](http://a) <script>alert(1)</script> #12", 500);
    expect(clean).not.toMatch(/@kwoeste|https?:|<|\]\(|#12/);
    expect(sanitizePagePath("/study/savvas.ch1?x=1")).toBe("/study/savvas.ch1");
    expect(sanitizePagePath("javascript:alert(1)")).toBe("unknown");
  });
});
