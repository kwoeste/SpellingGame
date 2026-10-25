import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRecap, gradeRecapCheck, listRecaps, toStudentRecap } from "@/lib/content/recaps";
import { CLIENT_EVENT_TYPES } from "@/lib/engine/service";
import { getChapter } from "@/lib/content/catalog";
import { toStudentChapter } from "@/lib/content/student";

const SCIENCE = Array.from({ length: 8 }, (_, i) => `savvas.ch${i + 1}`);
const pub = (p: string) => path.join(process.cwd(), "public", p);

describe("Watch it recaps", () => {
  it("every Savvas science chapter has 5-7 slides with short text", () => {
    for (const id of SCIENCE) {
      const r = getRecap(id);
      expect(r, id).not.toBeNull();
      expect(r!.slides.length).toBeGreaterThanOrEqual(5);
      expect(r!.slides.length).toBeLessThanOrEqual(7);
      for (const s of r!.slides) {
        expect(s.text.split(/[.!?]+\s/).length).toBeLessThanOrEqual(2);
        expect(s.alt.length).toBeGreaterThan(5);
      }
    }
  });

  it("all slide and choice images exist as committed static assets", () => {
    for (const r of listRecaps()) {
      for (const img of [...r.slides.map((s) => s.image), ...r.check.choices.map((c) => c.image)]) {
        expect(img.startsWith(`/study/${r.chapterId}/`)).toBe(true);
        expect(existsSync(pub(img)), img).toBe(true);
      }
    }
  });

  it("no quick check is text-only and the answer is one of the pictures", () => {
    for (const r of listRecaps()) {
      expect(r.check.choices.length).toBeGreaterThanOrEqual(2);
      for (const c of r.check.choices) expect(c.image).toMatch(/\.webp$/);
      expect(r.check.choices.map((c) => c.id)).toContain(r.check.answer);
      expect(r.tryAtHome.steps.length).toBeGreaterThanOrEqual(3);
      expect(r.tryAtHome.steps.length).toBeLessThanOrEqual(4);
    }
  });

  it("the student copy never carries the answer", () => {
    for (const id of SCIENCE) {
      const json = JSON.stringify(toStudentRecap(getRecap(id)));
      expect(json).not.toContain('"answer"');
      expect(json).not.toContain("feedback");
      const chapter = getChapter(id);
      if (chapter) expect(toStudentChapter(chapter).recap).not.toBeNull();
    }
  });

  it("grades on the server", () => {
    const r = getRecap("savvas.ch1")!;
    expect(gradeRecapCheck(r.chapterId, r.check.answer)?.correct).toBe(true);
    const wrong = r.check.choices.find((c) => c.id !== r.check.answer)!;
    expect(gradeRecapCheck(r.chapterId, wrong.id)?.correct).toBe(false);
    expect(gradeRecapCheck(r.chapterId, "nope")).toBeNull();
  });

  it("the step is registered first in ChapterPlayer and recorded as an event", () => {
    expect(CLIENT_EVENT_TYPES).toContain("watch_done");
    const src = readFileSync(path.join(process.cwd(), "components/ChapterPlayer.tsx"), "utf8");
    expect(src).toContain('kind: "watch"');
    expect(src).toContain("<WatchIt");
    expect(src).toMatch(/readDone\) return hasRecap \? \{ kind: "watch" \}/);
  });
});
