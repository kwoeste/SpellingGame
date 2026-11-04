import { describe, expect, it } from "vitest";
import { listChapters } from "@/lib/content/catalog";
import { mediaEntry, watchListenFor } from "@/lib/content/nlm";
import recapManifest from "@/lib/content/recap-video-media.json";
import { visualValue } from "@/lib/content/recaps-math";
import { KEEP_NLM_VIDEO, mathFactor, recapVideoChapterIds, recapVideoPlan, slideNarration, slideScreenText, speakable, symbolFor } from "@/lib/video/recap-video";
import { SYMBOL_NAMES, layoutText, slideSvg } from "@/lib/video/slide-svg";

const ids = recapVideoChapterIds(listChapters().map((c) => c.id));
const manifest = recapManifest as Record<string, { video: { pathname: string; contentType: string; size: number; sha256: string } }>;

describe("recap video plans", () => {
  it("covers all 9 math chapters and every col chapter except the kept NotebookLM ones", () => {
    expect(ids.filter((id) => id.startsWith("math.")).length).toBe(9);
    const col = listChapters().filter((c) => c.id.startsWith("col.")).map((c) => c.id);
    expect(ids.filter((id) => id.startsWith("col."))).toEqual(col.filter((id) => !KEEP_NLM_VIDEO.has(id)));
  });

  it("reads math symbols as words", () => {
    expect(speakable("2 × 3 = 6. 3 + 3 = 6.")).toBe("2 times 3 equals 6. 3 plus 3 equals 6.");
    expect(speakable("7×7=49")).toBe("7 times 7 equals 49");
  });

  it.each(ids)("%s: every on-screen word is narrated and every frame fits", (id) => {
    const plan = recapVideoPlan(id)!;
    expect(plan.slides.length).toBeGreaterThanOrEqual(12);
    for (const slide of plan.slides) {
      const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
      const spoken = words(slideNarration(slide));
      for (const w of words(slideScreenText(slide))) expect(spoken).toContain(w);
      expect(() => layoutText(slide)).not.toThrow();
      const svg = slideSvg(slide);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).not.toContain("undefined");
    }
  });

  it.each(ids.filter((id) => id.startsWith("math.")))("%s: fact slides draw exactly n rows of b", (id) => {
    const n = mathFactor(id)!;
    const facts = recapVideoPlan(id)!.slides.filter((s) => /^\d+ × \d+ = \d+$/.test(s.title ?? ""));
    expect(facts.length).toBe(10);
    for (const s of facts) {
      const [a, b, p] = s.title!.match(/\d+/g)!.map(Number);
      expect(a).toBe(n);
      expect(a * b).toBe(p);
      expect(s.visual).toEqual({ kind: "array", rows: a, cols: b });
      expect(visualValue(s.visual as never)).toBe(p);
    }
  });

  it("religion pictures are symbols only (never people)", () => {
    for (const id of ids.filter((x) => x.startsWith("col."))) {
      for (const s of recapVideoPlan(id)!.slides) {
        expect(s.visual.kind).toBe("symbol");
        expect(SYMBOL_NAMES).toContain((s.visual as { name: string }).name);
      }
    }
    expect(symbolFor("God gave Moses the Ten Commandments")).toBe("tablets");
    expect(symbolFor("We ask the Holy Spirit")).toBe("dove");
  });
});

describe("recap video manifest", () => {
  it.each(Object.entries(manifest))("%s is private, planned, and served by the signed-in media route", (id, entry) => {
    expect(ids).toContain(id);
    expect(entry.video.pathname).toMatch(new RegExp(`^recap-video/${id.replace(/\./g, "\\.")}/video-[0-9a-f]{12}\\.mp4$`));
    expect(entry.video.contentType).toBe("video/mp4");
    expect(entry.video.size).toBeGreaterThan(100_000);
    expect(mediaEntry(id, "video")?.pathname).toBe(entry.video.pathname);
    expect(watchListenFor(id)?.video).toBe(`/api/engine/media/${id}/video`);
    expect(mediaEntry(id, "audio")?.pathname ?? "").not.toMatch(/^recap-video\//);
  });

  it("never replaces a kept NotebookLM video", () => {
    for (const id of KEEP_NLM_VIDEO) {
      expect(manifest[id]).toBeUndefined();
      expect(mediaEntry(id, "video")?.pathname).toMatch(/^nlm\//);
    }
  });
});
