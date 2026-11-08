import { describe, expect, it } from "vitest";
import { listChapters } from "@/lib/content/catalog";
import { flashcardsFor, mediaEntry, watchListenFor } from "@/lib/content/nlm";
import nlmManifest from "@/lib/content/nlm-media.json";
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

/** Uploaded recap videos that take the video slot after the NotebookLM video entry is removed. */
const RECAP_OVER_NLM: Record<string, string> = {
  "savvas.ch3": "recap-video/savvas.ch3/video-e336b503291b.mp4",
  "savvas.ch5": "recap-video/savvas.ch5/video-ac7466ebb4fa.mp4",
  "ckla.u2.ch6": "recap-video/ckla.u2.ch6/video-522bf7b68fc4.mp4",
};

const REMOVED_NLM_VIDEO = [
  "nlm/savvas.ch3/video-19a039ea4a19.mp4",
  "nlm/savvas.ch5/video-d4cbfb86afad.mp4",
  "nlm/ckla.u2.ch6/video-ee904fb3d7ec.mp4",
];

describe("recap video manifest", () => {
  it.each(Object.entries(manifest))("%s is a private recap video served by the signed-in media route", (id, entry) => {
    if (id.startsWith("col.") || id.startsWith("math.")) expect(ids).toContain(id);
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

describe("recap videos replacing a NotebookLM video", () => {
  it.each(Object.entries(RECAP_OVER_NLM))("%s resolves to the recap video and keeps NotebookLM audio and flashcards", (id, pathname) => {
    expect(manifest[id]?.video.pathname).toBe(pathname);
    expect(mediaEntry(id, "video")?.pathname).toBe(pathname);
    expect(watchListenFor(id)?.video).toBe(`/api/engine/media/${id}/video`);

    const nlm = (nlmManifest as Record<string, { video?: { pathname: string }; audio?: { pathname: string } }>)[id];
    expect(nlm?.video).toBeUndefined();
    expect(nlm?.audio?.pathname).toMatch(new RegExp(`^nlm/${id.replace(/\./g, "\\.")}/audio-[0-9a-f]{12}\\.m4a$`));
    expect(mediaEntry(id, "audio")?.pathname).toBe(nlm?.audio?.pathname);
    expect(watchListenFor(id)?.audio).toBe(`/api/engine/media/${id}/audio`);
    expect(flashcardsFor(id).length).toBeGreaterThanOrEqual(18);
  });

  it("drops only the replaced NotebookLM video files", () => {
    const pathnames = Object.values(nlmManifest as Record<string, { video?: { pathname: string }; audio?: { pathname: string } }>).flatMap((entry) =>
      [entry.video?.pathname, entry.audio?.pathname].filter((p): p is string => Boolean(p)),
    );
    for (const oldPath of REMOVED_NLM_VIDEO) expect(pathnames).not.toContain(oldPath);
    for (const id of Object.keys(RECAP_OVER_NLM)) {
      expect((nlmManifest as Record<string, { audio?: unknown }>)[id]?.audio).toBeTruthy();
    }
  });
});
