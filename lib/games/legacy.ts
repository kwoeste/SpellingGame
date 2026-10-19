import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { AppRole } from "@/lib/auth/allowlist";
import { requireRole } from "@/lib/auth/guards";
import { headerNav, SIGN_OUT_HREF } from "@/lib/nav";

const LINKS: [RegExp, string][] = [
  [/public\/audio\//g, "/audio/"],
  [/public\/images\//g, "/images/"],
  [/href="favicon\.png"/g, 'href="/favicon.png"'],
];

function siteNav(role: AppRole): string {
  const links = headerNav(role).links.map((link) => `<a href="${link.href}">${link.label}</a>`);
  return `<nav aria-label="Main">${links.join("")}<a href="${SIGN_OUT_HREF}">Sign out</a></nav>`;
}

/** Serves an original static game page (unchanged gameplay) to signed-in family members only. */
export async function serveLegacyGame(req: Request, file: "spelling-game.html" | "number-match.html"): Promise<Response> {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) {
    if (gate.status === 401) {
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("from", new URL(req.url).pathname);
      return NextResponse.redirect(url);
    }
    return new Response("<!doctype html><title>Not allowed</title><h1>Not allowed</h1>", {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
  let html = await readFile(path.join(process.cwd(), file), "utf8");
  for (const [pattern, replacement] of LINKS) html = html.replace(pattern, replacement);
  html = html.replace(/<nav>[\s\S]*?<\/nav>/, siteNav(gate.actor.role));
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
