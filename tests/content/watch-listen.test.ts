import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decideRequest } from "@/lib/auth/decide";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { FLASHCARDS } from "@/lib/content/flashcards";
import { isFlashcardList, watchListenFor } from "@/lib/content/nlm";
import { GET } from "@/app/api/engine/media/[chapterId]/[kind]/route";
import manifest from "@/lib/content/nlm-media.json";

describe("Watch & listen (NotebookLM media)", () => {
  it("media route requires sign-in (middleware 401 and route 401)", async () => {
    for (const p of ["/api/engine/media/savvas.ch1/video", "/api/engine/media/savvas.ch1/audio"]) {
      expect(decideRequest({ pathname: p, hasSession: false, role: null }).kind).toBe("unauthorized");
      expect(decideRequest({ pathname: p, hasSession: true, role: "outsider" }).kind).toBe("forbidden");
    }
    const res = await GET(new Request("http://local/api/engine/media/savvas.ch1/video"), {
      params: Promise.resolve({ chapterId: "savvas.ch1", kind: "video" }),
    });
    expect(res.status).toBe(401);
  });

  it("hides the step for chapters with no media or flashcards", () => {
    const withMedia = new Set([...Object.keys(manifest), ...Object.keys(FLASHCARDS)]);
    for (const chapter of listChapters()) {
      const data = watchListenFor(chapter.id);
      if (withMedia.has(chapter.id)) expect(data).not.toBeNull();
      else expect(data).toBeNull();
    }
    expect(watchListenFor("not-a-chapter")).toBeNull();
  });

  it("serves media only through the signed-in route, never a public URL", () => {
    const data = watchListenFor("savvas.ch1");
    expect(data?.video).toBe("/api/engine/media/savvas.ch1/video");
    expect(data?.audio).toBe("/api/engine/media/savvas.ch1/audio");
    for (const entry of Object.values(manifest as Record<string, Record<string, { pathname: string }>>)) {
      for (const media of Object.values(entry)) expect(media.pathname).not.toMatch(/^https?:/);
    }
  });

  it("flashcards JSON is [{front, back}] for real chapters, and the index lists every file", () => {
    const dir = path.join(process.cwd(), "lib/content/flashcards");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const id = f.replace(/\.json$/, "");
      expect(getChapter(id), id).not.toBeNull();
      const cards = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
      expect(isFlashcardList(cards), f).toBe(true);
      expect(FLASHCARDS[id]).toEqual(cards);
    }
    expect(FLASHCARDS["savvas.ch1"]).toHaveLength(21);
    expect(isFlashcardList([{ front: "a" }])).toBe(false);
    expect(isFlashcardList([{ front: "a", back: "b", extra: 1 }])).toBe(false);
  });

  it("does not commit media files to git", () => {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        ["node_modules", ".next", ".git"].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
      );
    const ids = listChapters().map((c) => c.id);
    const nlm = walk(process.cwd()).map((f) => path.relative(process.cwd(), f)).filter((f) => /\.(mp4|m4a)$/i.test(f) && (/nlm|notebooklm/i.test(f) || ids.some((id) => f.includes(id))));
    expect(nlm).toEqual([]);
  });
});
