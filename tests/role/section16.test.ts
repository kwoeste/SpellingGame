import { beforeEach, describe, expect, it } from "vitest";
import { resetAudit, lastAuditFor } from "@/lib/auth/audit";
import { decideRequest } from "@/lib/auth/decide";
import { FEEDBACK_FORBIDDEN_KEYS, NEXT_ITEM_FORBIDDEN_KEYS, STUDENT_PROGRESS_ALLOWLIST } from "@/lib/auth/guards";
import { normalizePath } from "@/lib/auth/paths";
import { mintTestSession, resetSessions } from "@/lib/auth/sessions";
import { removeMemoryUser, resetMemoryUsers, resolveAgreedRole, upsertMemoryUser } from "@/lib/auth/users";
import { GET as adminMastery } from "@/app/api/admin/mastery/route";
import { GET as adminWrong } from "@/app/api/admin/wrong-answers/route";
import { GET as adminStrategy } from "@/app/api/admin/strategy/route";
import { GET as adminTime } from "@/app/api/admin/time/route";
import { GET as adminTrends } from "@/app/api/admin/trends/route";
import { GET as adminInterests } from "@/app/api/admin/interests/route";
import { GET as adminConfig, PUT as putConfig } from "@/app/api/admin/config/route";
import { GET as adminExport } from "@/app/api/admin/export/route";
import { GET as progress } from "@/app/api/engine/progress-summary/route";
import { POST as nextItem } from "@/app/api/engine/next-item/route";
import { POST as events } from "@/app/api/engine/events/route";
import { POST as startSession } from "@/app/api/engine/session/start/route";
import { assertsStudentCannotReadAdmin, migrationSql } from "@/lib/db/sql";
import { memoryAdminRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { requireRole } from "@/lib/auth/guards";
import { resolveUser } from "@/lib/auth/users";
import { readFileSync } from "node:fs";
import path from "node:path";

function req(url: string, email?: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  if (email) {
    const session = mintTestSession(email);
    headers.set("cookie", `mae_session=${session.id}`);
    headers.set("x-test-session", session.id);
  }
  return new Request(url, { ...init, headers });
}

describe("section 16 role tests", () => {
  beforeEach(() => {
    resetSessions();
    resetMemoryUsers();
    resetAudit();
    resetMemoryRepo();
  });

  it("R1 student is forbidden from admin pages", () => {
    for (const pathname of ["/admin", "/admin/", "/admin/knowledge-map", "/admin/assets/app.js"]) {
      const decision = decideRequest({ pathname, hasSession: true, role: "student" });
      expect(decision.kind).toBe("forbidden");
      if (decision.kind === "forbidden") expect(decision.page).toBe(true);
    }
  });

  it("R2 student GETs on admin APIs are 403 JSON", async () => {
    const routes = [adminMastery, adminWrong, adminStrategy, adminTime, adminTrends, adminInterests, adminConfig, adminExport];
    const paths = ["/api/admin/mastery", "/api/admin/wrong-answers", "/api/admin/strategy", "/api/admin/time", "/api/admin/trends", "/api/admin/interests", "/api/admin/config", "/api/admin/export"];
    for (const [handler, pathName] of routes.map((h, i) => [h, paths[i]] as const)) {
      const res = await handler(req(`http://local${pathName}`, "mae.woeste@gmail.com"));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "forbidden" });
    }
  });

  it("R3 student writes do not change config/data", async () => {
    const before = { counts: await memoryAdminRepo.counts(), config: await memoryAdminRepo.activeConfig() };
    const res = await putConfig(
      req("http://local/api/admin/config", "mae.woeste@gmail.com", {
        method: "PUT",
        body: JSON.stringify({ weekly_xp_goal: 1 }),
      }),
    );
    expect(res.status).toBe(403);
    expect({ counts: await memoryAdminRepo.counts(), config: await memoryAdminRepo.activeConfig() }).toEqual(before);
  });

  it("R4 path tricks never allow admin", () => {
    const tricks = ["/Admin", "/admin%2F", "/%61dmin", "/admin/..;/", "/api//admin/x", "/admin.", "/admin?__vercel=1"];
    for (const pathname of tricks) {
      const decision = decideRequest({ pathname: pathname.split("?")[0] ?? pathname, hasSession: true, role: "student" });
      expect(["forbidden", "pass"]).toContain(decision.kind);
      if (normalizePath(pathname.split("?")[0] ?? pathname).includes("admin")) {
        expect(decision.kind).toBe("forbidden");
      }
    }
    expect(normalizePath("/%61dmin")).toBe("/admin");
    expect(normalizePath("/api//admin/x")).toBe("/api/admin/x");
  });

  it("R5 progress-summary is allowlisted", async () => {
    const res = await progress(req("http://local/api/engine/progress-summary", "mae.woeste@gmail.com"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(json).every((key) => (STUDENT_PROGRESS_ALLOWLIST as readonly string[]).includes(key))).toBe(true);
  });

  it("R6 extra params cannot leak engine internals", async () => {
    const res = await nextItem(
      req("http://local/api/engine/next-item?learner_id=someone-else", "mae.woeste@gmail.com", {
        method: "POST",
        body: JSON.stringify({ chapterId: "savvas.ch1", learner_id: "other", include: "mastery" }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { item: Record<string, unknown> };
    for (const key of [...NEXT_ITEM_FORBIDDEN_KEYS, "answer", "feedbackWrong", "evidenceSentenceId"]) {
      expect(key in json.item).toBe(false);
    }
  });

  it("R7 feedback excludes strategy and P values", async () => {
    await startSession(
      req("http://local/api/engine/session/start", "mae.woeste@gmail.com", {
        method: "POST",
        body: JSON.stringify({ entry: "study", chapterId: "savvas.ch1" }),
      }),
    );
    const res = await events(
      req("http://local/api/engine/events", "mae.woeste@gmail.com", {
        method: "POST",
        body: JSON.stringify({
          submit: { sessionId: "sess", itemId: "savvas.ch1.q1", response: "A tool you buy", hintLevel: 0 },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { feedback: Record<string, unknown> };
    expect(json.feedback.explanation).toBeTruthy();
    for (const key of FEEDBACK_FORBIDDEN_KEYS) {
      expect(key in json.feedback).toBe(false);
    }
  });

  it("R8 anonymous gated routes", () => {
    expect(decideRequest({ pathname: "/study", hasSession: false, role: null }).kind).toBe("redirect-signin");
    expect(decideRequest({ pathname: "/api/engine/resume", hasSession: false, role: null }).kind).toBe("unauthorized");
  });

  it("R9 outsider is 403 and audited", async () => {
    upsertMemoryUser({
      id: "out",
      email: "stranger@example.com",
      role: "student",
      learnerId: "nope",
      displayName: "Nope",
      disabledAt: null,
    });
    expect(await resolveUser("stranger@example.com")).toBeNull();
    expect(decideRequest({ pathname: "/study", hasSession: true, role: "outsider" }).kind).toBe("forbidden");
    const live = req("http://local/api/engine/progress-summary", "mae.woeste@gmail.com");
    upsertMemoryUser({ id: "user-student", email: "mae.woeste@gmail.com", role: "student", learnerId: "x", displayName: "Mae", disabledAt: "2026-01-01" });
    const denied = await requireRole(live, "student");
    expect(denied.ok).toBe(false);
    expect(lastAuditFor("mae.woeste@gmail.com", "/api/engine/progress-summary")?.status).toBe(403);
  });

  it("R10 admin can read admin APIs", async () => {
    const res = await adminMastery(req("http://local/api/admin/mastery", "kevinw@mcsteen.com"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { mastery: unknown };
    expect(json.mastery).toBeDefined();
  });

  it("R11 no-store on gated APIs", async () => {
    const res = await adminMastery(req("http://local/api/admin/mastery", "kevinw@mcsteen.com"));
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("R12-R14 SQL denies student/assistant raw engine access", () => {
    const sql = migrationSql();
    expect(assertsStudentCannotReadAdmin(sql)).toEqual([]);
    expect(sql).toMatch(/REVOKE ALL ON SCHEMA engine FROM assistant_ro/i);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/learner_id = NULLIF\(current_setting\('app\.learner_id'/i);
  });

  it("R15 student sources omit admin field names", () => {
    const roots = ["app/study", "app/games", "app/spelling-game", "app/number-match", "public/js"];
    const forbidden = ["p_mastery", "frustration", "strategy_label", "/api/admin"];
    for (const root of roots) {
      const walk = (dir: string) => {
        const fs = require("node:fs") as typeof import("node:fs");
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.(ts|tsx|js)$/.test(entry.name)) {
            const text = readFileSync(full, "utf8");
            for (const needle of forbidden) {
              expect(text.includes(needle), `${full} contains ${needle}`).toBe(false);
            }
          }
        }
      };
      walk(path.join(process.cwd(), root));
    }
  });

  it("R16 forged or drifted sessions fail", async () => {
    const forged = new Request("http://local/api/engine/progress-summary", {
      headers: { cookie: "mae_session=not-a-real-session" },
    });
    expect((await progress(forged)).status).toBe(401);
    const live = req("http://local/api/engine/progress-summary", "mae.woeste@gmail.com");
    removeMemoryUser("mae.woeste@gmail.com");
    const drifted = await progress(live);
    expect([401, 403]).toContain(drifted.status);
  });

  it("R17 env/db mismatch is denied", async () => {
    upsertMemoryUser({ id: "user-student", email: "mae.woeste@gmail.com", role: "admin", learnerId: null, displayName: "Mae", disabledAt: null });
    expect(resolveAgreedRole("mae.woeste@gmail.com")).toBeNull();
    expect(await resolveUser("mae.woeste@gmail.com")).toBeNull();
    removeMemoryUser("mae.woeste@gmail.com");
    expect(await resolveUser("mae.woeste@gmail.com")).toBeNull();
  });

  it("R18 student still forbidden after admin allow", () => {
    const admin = decideRequest({ pathname: "/admin", hasSession: true, role: "admin" });
    const student = decideRequest({ pathname: "/admin", hasSession: true, role: "student" });
    expect(admin.kind).toBe("allow");
    expect(student.kind).toBe("forbidden");
  });
});
