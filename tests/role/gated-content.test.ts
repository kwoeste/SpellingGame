import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decideRequest } from "@/lib/auth/decide";
import { listChapters } from "@/lib/content/catalog";
import { gameSpec, gameVisibleTo, isGameId } from "@/lib/content/games";
import { SPELLING_LISTS } from "@/lib/games/spelling-lists";

describe("gated games", () => {
  it("sends anonymous visitors to sign-in for every restored game URL", () => {
    for (const pathname of ["/spelling-game", "/number-match", "/games", "/spelling-game/wk6-2", "/spelling-game/war-of-1812", "/spelling-game/may-1", "/spelling-game/may-8"]) {
      const decision = decideRequest({ pathname, hasSession: false, role: null });
      expect(decision.kind).toBe("redirect-signin");
    }
  });

  it("hides religion games from the student until approved", () => {
    expect(gameVisibleTo("beatitudes", "student")).toBe(false);
    expect(gameVisibleTo("beatitudes", "admin")).toBe(true);
    expect(gameVisibleTo("circuit-builder", "student")).toBe(true);
    expect(gameVisibleTo("not-a-game", "admin")).toBe(false);
  });

  it("keeps D-1 audio clips on the /audio/ path, not public/audio/", () => {
    const src = readFileSync(path.join(process.cwd(), "lib/games/spelling-lists.ts"), "utf8");
    expect(src).toContain("/audio/");
    expect(src).not.toContain("public/audio/");
    expect(SPELLING_LISTS.find((list) => list.id === "d1")?.hasClips).toBe(true);
  });
});

/** Runs after `next build`: public static chunks must not contain Study or game text. */
describe.skipIf(!existsSync(".next/static"))("public static bundle", () => {
  it("contains no chapter passages, questions, or game items", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".js")) files.push(full);
      }
    };
    walk(".next/static");
    const bundle = files.map((file) => readFileSync(file, "utf8")).join("\n");
    const needles = [
      ...listChapters().flatMap((chapter) => [chapter.sentences[0].text, chapter.items.at(-1)?.stem ?? ""]),
      ...["feudal-pyramid", "beatitudes", "ten-commandments"].filter(isGameId).map((id) => gameSpec(id).items[0].label),
    ].filter((needle) => needle.length > 20);
    for (const needle of needles) expect(bundle.includes(needle), needle).toBe(false);
  });
});

describe("admin client UI stays catalog-free", () => {
  it("does not import chapter packs or the admin catalog", () => {
    const dir = path.join(process.cwd(), "app/admin/_ui");
    const forbidden = ['from "@/lib/admin/catalog"', 'from "@/lib/content/catalog"', "listChapters("];
    for (const entry of readdirSync(dir)) {
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      const text = readFileSync(path.join(dir, entry), "utf8");
      if (!text.includes('"use client"')) continue;
      for (const needle of forbidden) {
        expect(text.includes(needle), `${entry} contains ${needle}`).toBe(false);
      }
    }
  });
});

describe("GitHub Pages publish list", () => {
  it("excludes every top-level app/source entry so Study text never lands on maewoeste.com", () => {
    const root = process.cwd();
    const config = readFileSync(path.join(root, "_config.yml"), "utf8");
    const excluded = new Set([...config.matchAll(/^\s*-\s*(\S+)\s*$/gm)].map((m) => m[1]));
    const published = ["CNAME", "favicon.png", "public", "_config.yml"];
    const leaks = readdirSync(root).filter(
      (name) => !name.startsWith(".") && !name.endsWith(".html") && !published.includes(name) && !excluded.has(name),
    );
    expect(leaks).toEqual([]);
  });
});
