import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as numberMatch } from "@/app/number-match/route";
import { GET as spellingGame } from "@/app/spelling-game/route";
import { SiteHeaderView } from "@/components/SiteHeader";
import { mintTestSession, resetSessions } from "@/lib/auth/sessions";
import { resetMemoryUsers } from "@/lib/auth/users";
import { headerNav, headerViewer, type HeaderViewer } from "@/lib/nav";

const MAE = "mae.woeste@gmail.com";
const KEVIN = "kevinw@mcsteen.com";

function navItems(html: string): string[] {
  const nav = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  return [...nav.matchAll(/<(a|button)\b[^>]*>([^<]+)<\/\1>/g)].map((m) => m[2].trim());
}

function header(viewer: HeaderViewer): string {
  return renderToStaticMarkup(createElement(SiteHeaderView, { nav: headerNav(viewer) }));
}

function gameRequest(url: string, email: string): Request {
  return new Request(url, { headers: { "x-test-session": mintTestSession(email).id } });
}

describe("site header", () => {
  it("shows only Store and Sign in when signed out", () => {
    const html = header(null);
    expect(navItems(html)).toEqual(["Store", "Sign in"]);
    expect(html).toContain('href="/store"');
    expect(html).not.toMatch(/href="\/(games|study|spelling-game|number-match|admin)"/);
  });

  it("shows Store, Study, and Sign out to the student", () => {
    expect(navItems(header("student"))).toEqual(["Store", "Study", "Sign out"]);
  });

  it("adds Admin only for admins", () => {
    expect(navItems(header("admin"))).toEqual(["Store", "Study", "Admin", "Sign out"]);
    expect(header("student")).not.toContain('href="/admin"');
  });

  it("gives a drifted or unknown session only Store and Sign out", () => {
    expect(navItems(header("outsider"))).toEqual(["Store", "Sign out"]);
  });

  it("derives the viewer with the middleware rule (env role must match token role)", () => {
    expect(headerViewer(null)).toBeNull();
    expect(headerViewer({ user: { email: MAE, role: "student" } })).toBe("student");
    expect(headerViewer({ user: { email: KEVIN.toUpperCase(), role: "admin" } })).toBe("admin");
    expect(headerViewer({ user: { email: MAE, role: "admin" } })).toBe("outsider");
    expect(headerViewer({ user: { email: "stranger@example.com", role: "admin" } })).toBe("outsider");
  });
});

describe("legacy game pages use the same minimal nav", () => {
  beforeEach(() => {
    resetSessions();
    resetMemoryUsers();
  });

  it("replaces the old Home / Shop / Spelling / Game Lab links", async () => {
    const student = await (await spellingGame(gameRequest("http://local/spelling-game", MAE))).text();
    expect(navItems(student)).toEqual(["Store", "Study", "Sign out"]);
    expect(student).not.toMatch(/href="[^"]*\.html"/);

    const admin = await (await numberMatch(gameRequest("http://local/number-match", KEVIN))).text();
    expect(navItems(admin)).toEqual(["Store", "Study", "Admin", "Sign out"]);
  });
});

describe("signed-in area stays reachable without header links", () => {
  it("links the games from the Study hub", () => {
    const study = readFileSync(path.join(process.cwd(), "app/study/page.tsx"), "utf8");
    for (const href of ["/spelling-game", "/number-match", "/games"]) expect(study).toContain(`href="${href}"`);
  });
});
