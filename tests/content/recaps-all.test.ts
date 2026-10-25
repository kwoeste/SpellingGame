import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRecap } from "@/lib/content/recaps";
import { listChapters } from "@/lib/content/catalog";
import { MATH_SEEDS, visualValue } from "@/lib/content/recaps-math";

/** Subjects whose Watch it recaps have shipped. Grows to cover the whole catalog. */
const COVERED = ["savvas.", "math.", "ckla.", "col.ch1", "col.ch2", "col.ch3", "col.ch4", "col.ch5", "col.ch6", "col.ch7", "col.ch8", "col.ch9", "col.ch10", "col.ch11", "col.ch12", "col.ch13"];
const covered = (id: string) => COVERED.some((p) => (p.endsWith(".") ? id.startsWith(p) : id === p));
const pub = (p: string) => path.join(process.cwd(), "public", p);

describe("Watch it recaps across the catalog", () => {
  const chapters = listChapters().filter((c) => covered(c.id));

  it("covers every catalog chapter in shipped subjects with 5-7 slides", () => {
    expect(chapters.length).toBeGreaterThan(0);
    for (const c of chapters) {
      const r = getRecap(c.id);
      expect(r, c.id).not.toBeNull();
      expect(r!.slides.length, c.id).toBeGreaterThanOrEqual(5);
      expect(r!.slides.length, c.id).toBeLessThanOrEqual(7);
      for (const s of r!.slides) {
        expect(s.text.split(/[.!?]+\s/).length, s.text).toBeLessThanOrEqual(3);
        expect(s.text.length, s.text).toBeLessThanOrEqual(140);
        expect(s.alt.length).toBeGreaterThan(5);
      }
    }
  });

  it("every slide image exists and quick checks are picture-based", () => {
    for (const c of chapters) {
      const r = getRecap(c.id)!;
      for (const s of r.slides) expect(existsSync(pub(s.image)), s.image).toBe(true);
      expect(r.check.choices.length).toBeGreaterThanOrEqual(3);
      expect(new Set(r.check.choices.map((x) => x.id)).size).toBe(r.check.choices.length);
      for (const ch of r.check.choices) expect(ch.image).toMatch(/\.webp$/);
      expect(r.check.choices.map((x) => x.id)).toContain(r.check.answer);
      expect(r.tryAtHome.steps.length).toBeGreaterThanOrEqual(3);
    }
  });
});

const WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const num = (s: string) => WORDS[s.toLowerCase()] ?? Number(s);

describe("math recap facts", () => {
  it("every stated fact is arithmetically correct", () => {
    let checked = 0;
    for (const [id, seed] of Object.entries(MATH_SEEDS)) {
      for (const { text, visual } of seed.slides) {
        for (const m of text.matchAll(/(\d+) × (\d+) (?:is|=) (\d+)/g)) {
          expect(Number(m[1]) * Number(m[2]), `${id}: ${m[0]}`).toBe(Number(m[3]));
          checked++;
        }
        for (const m of text.matchAll(/(\d+) \+ (\d+) (?:is|=|make) (\d+)/g)) {
          expect(Number(m[1]) + Number(m[2]), `${id}: ${m[0]}`).toBe(Number(m[3]));
          checked++;
        }
        for (const m of text.matchAll(/(\w+) groups of (\d+) (?:make|is) (\d+)/gi)) {
          expect(num(m[1]) * Number(m[2]), `${id}: ${m[0]}`).toBe(Number(m[3]));
          checked++;
        }
        const skip = text.match(/Skip-count by (\d+)s: ([\d, ]+)/) ?? text.match(/jump by (\d+)s: ([\d, ]+)/);
        if (skip) {
          const seq = skip[2].split(",").map((x) => Number(x.trim())).filter(Boolean);
          seq.forEach((n, i) => expect(n, `${id}: ${skip[0]}`).toBe(Number(skip[1]) * (i + 1)));
          if (visual.kind === "hops") expect(seq.length).toBe(visual.count);
          checked++;
        }
        // The picture must show the number the sentence lands on.
        const nums = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
        expect(nums, `${id}: picture value ${visualValue(visual)} not in "${text}"`).toContain(visualValue(visual));
      }
      const target = seed.check.a * seed.check.b;
      seed.check.choices.forEach((ci) => {
        const v = visualValue(seed.slides[ci].visual);
        if (ci === seed.check.answer) expect(v, id).toBe(target);
        else expect(v, id).not.toBe(target);
      });
      expect(seed.check.a === Number(id.match(/(\d+)s$/)![1]) || seed.check.b === Number(id.match(/(\d+)s$/)![1])).toBe(true);
    }
    expect(checked).toBeGreaterThan(40);
  });
});
