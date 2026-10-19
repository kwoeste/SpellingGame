import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";

const LINKS: [RegExp, string][] = [
  [/public\/audio\//g, "/audio/"],
  [/public\/images\//g, "/images/"],
  [/href="index\.html"/g, 'href="/"'],
  [/href="store\.html"/g, 'href="/store"'],
  [/href="games\.html"/g, 'href="/games"'],
  [/href="spelling-game\.html"/g, 'href="/spelling-game"'],
  [/href="number-match\.html"/g, 'href="/number-match"'],
  [/href="favicon\.png"/g, 'href="/favicon.png"'],
];

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
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
