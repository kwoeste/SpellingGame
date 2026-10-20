import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteHeaderView } from "@/components/SiteHeader";
import { decideRequest } from "@/lib/auth/decide";
import { headerNav, headerViewer, type HeaderViewer } from "@/lib/nav";

function navItems(html: string): string[] {
  const nav = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  return [...nav.matchAll(/<(a|button)\b[^>]*>([^<]+)<\/\1>/g)].map((m) => m[2].trim());
}

function header(viewer: HeaderViewer): string {
  return renderToStaticMarkup(createElement(SiteHeaderView, { nav: headerNav(viewer) }));
}

describe("site header", () => {
  it("shows only Sign in when signed out, with no Store button", () => {
    const html = header(null);
    expect(navItems(html)).toEqual([]);
    expect(html).toContain("Sign in");
    expect(html).toContain('href="/sign-in"');
    expect(html).not.toMatch(/href="\/(store|games|study|spelling-game|number-match|admin)"/);
  });

  it("shows Study in the nav and Sign out at the right for the student", () => {
    const html = header("student");
    expect(navItems(html)).toEqual(["Study"]);
    expect(html).toContain("Sign out");
    expect(html).not.toContain('href="/store"');
  });

  it("adds Admin only for admins", () => {
    expect(navItems(header("admin"))).toEqual(["Study", "Admin"]);
    expect(header("student")).not.toContain('href="/admin"');
    expect(header("admin")).not.toContain('href="/store"');
  });

  it("gives a drifted or unknown session only Sign out", () => {
    const html = header("outsider");
    expect(navItems(html)).toEqual([]);
    expect(html).toContain("Sign out");
    expect(html).not.toContain('href="/store"');
  });

  it("derives the viewer with the middleware rule (env role must match token role)", () => {
    expect(headerViewer(null)).toBeNull();
    expect(headerViewer({ user: { email: "mae.woeste@gmail.com", role: "student" } })).toBe("student");
    expect(headerViewer({ user: { email: "kevinw@mcsteen.com".toUpperCase(), role: "admin" } })).toBe("admin");
    expect(headerViewer({ user: { email: "mae.woeste@gmail.com", role: "admin" } })).toBe("outsider");
    expect(headerViewer({ user: { email: "stranger@example.com", role: "admin" } })).toBe("outsider");
  });
});

describe("signed-in area stays reachable without header Store", () => {
  it("links the games from the Study hub", () => {
    const study = readFileSync(path.join(process.cwd(), "app/study/page.tsx"), "utf8");
    for (const href of ["/spelling-game", "/number-match", "/games"]) expect(study).toContain(`href="${href}"`);
  });

  it("still gates the old game URLs", () => {
    expect(decideRequest({ pathname: "/spelling-game", hasSession: false, role: null }).kind).toBe("redirect-signin");
    expect(decideRequest({ pathname: "/number-match", hasSession: false, role: null }).kind).toBe("redirect-signin");
    expect(decideRequest({ pathname: "/spelling-game/wk6-2", hasSession: false, role: null }).kind).toBe("redirect-signin");
  });
});
