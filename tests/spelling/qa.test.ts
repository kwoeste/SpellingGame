import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { canCover, markLetters, missMessage, mockStep, rightMessage, tooQuick } from "@/lib/spelling/feedback";
import { allSpellingClips, SPELLING_BREATHE, SPELLING_SO_CLOSE, SPELLING_YAYS } from "@/lib/spelling/list-d2";
import { isPastTest, todayNY } from "@/app/admin/upcoming-tests/editor";

describe("mock test start", () => {
  it("starts immediately on tap, without waiting for audio", () => {
    const s = mockStep({ started: false, idx: 0, missed: [] }, { type: "start" });
    expect(s.started).toBe(true);
    expect(s.idx).toBe(0);
  });
  it("ignores answers before start and records misses after", () => {
    const s0 = { started: false, idx: 0, missed: [] };
    expect(mockStep(s0, { type: "answer", word: "inch", correct: false })).toEqual(s0);
    const s1 = mockStep(mockStep(s0, { type: "start" }), { type: "answer", word: "inch", correct: false });
    expect(s1).toEqual({ started: true, idx: 1, missed: ["inch"] });
  });
  it("renders a real button (type=button) that is not covered by an overlay", async () => {
    const { MockTest } = await import("@/components/SpellingD2");
    const { KidPrefsProvider } = await import("@/components/ui/KidPrefs").catch(() => ({ KidPrefsProvider: null }));
    const el = createElement(MockTest, { words: ["inch"], onRetry: () => undefined, onDone: () => undefined });
    const html = renderToStaticMarkup(KidPrefsProvider ? createElement(KidPrefsProvider as never, null, el) : el);
    expect(html).toMatch(/<button type="button"[^>]*data-testid="mock-start"/);
    expect(html).not.toContain("sp-burst");
  });
});

describe("miss feedback", () => {
  it("marks only her letters and counts the right prefix", () => {
    const r = markLetters("October", "Octobur");
    expect(r.marks.map((m) => m.ok)).toEqual([true, true, true, true, true, false, true]);
    expect(r.prefix).toBe(5);
    expect(missMessage("October", "Octobur", 1)).toContain(SPELLING_SO_CLOSE);
  });
  it("never reveals the answer before the help ladder does", () => {
    const msg = missMessage("puzzle", "pazl", 2);
    expect(msg).not.toContain("puzzle");
    expect(msg).toContain("first letter is right");
    expect(msg).toContain("more letters");
  });
  it("varies encouragement", () => {
    expect(new Set([1, 2, 3].map((n) => missMessage("inch", "zzzzz", n))).size).toBe(3);
    expect(new Set(SPELLING_YAYS.map((_, i) => rightMessage(i))).size).toBe(SPELLING_YAYS.length);
  });
});

describe("slow-down guards", () => {
  it("pauses after 2 quick wrong tries", () => {
    expect(tooQuick([1000], 1500)).toBe(false);
    expect(tooQuick([1000, 2500], 2500)).toBe(true);
    expect(tooQuick([1000, 9000], 9000)).toBe(false);
  });
  it("flashcards need a listen or 2 seconds", () => {
    expect(canCover(0, false, 1000)).toBe(false);
    expect(canCover(0, true, 100)).toBe(true);
    expect(canCover(0, false, 2000)).toBe(true);
  });
  it("new spoken lines are prewarmed", () => {
    const clips = allSpellingClips();
    for (const l of [...SPELLING_YAYS, SPELLING_SO_CLOSE, SPELLING_BREATHE]) expect(clips).toContain(l);
  });
});

describe("admin test dates", () => {
  it("flags past tests by New York date", () => {
    const today = todayNY(Date.parse("2026-10-29T16:00:00Z"));
    expect(today).toBe("2026-10-29");
    expect(isPastTest({ testDate: "2026-10-28" }, today)).toBe(true);
    expect(isPastTest({ testDate: "2026-10-29" }, today)).toBe(false);
  });
});
