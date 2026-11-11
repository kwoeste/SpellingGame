import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { SpellingD2 } from "@/components/SpellingD2";
import { decideRequest } from "@/lib/auth/decide";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { todayPlan } from "@/lib/engine/plan";
import { testDateLabel } from "@/app/admin/upcoming-tests/editor";
import { DEFAULT_UPCOMING, activeUpcomingTests, pastSpellingLists, validUpcoming, type UpcomingTest } from "@/lib/practice/upcoming";
import { U2L10_LIST } from "@/lib/spelling/catalog";
import { prewarmSpellingClips } from "@/lib/spelling/clips";
import { REVEAL_WORD_AT, spellingHelp } from "@/lib/spelling/engine";
import { praiseFor } from "@/lib/spelling/feedback";
import { revealClip, trickClip, wordClip } from "@/lib/spelling/list-d2";
import { U2L10_WORDS, syllableCount } from "@/lib/spelling/list-u2l10";
import { SPELLING_EVENT, checkSpelling, spellingSummary } from "@/lib/spelling/service";

const mae = { role: "student" as const, learnerId: SEEDED_LEARNER_ID };
const at = (iso: string) => Date.parse(iso);
const noAi = { ai: async () => null };
const NOV11 = at("2026-11-11T15:00:00Z");
const word = (name: string) => U2L10_WORDS.find((item) => item.word === name)!;

beforeEach(() => resetMemoryRepo());

describe("Middle Ages spelling list", () => {
  it("has the ten content words, syllable breaks, a definition, a sentence, and a trick", () => {
    expect(U2L10_LIST.id).toBe("spelling-u2l10");
    expect(U2L10_LIST.title).toBe("Spelling: Middle Ages words (Unit 2, Lesson 10)");
    expect(U2L10_LIST.href).toBe("/study/spelling-u2l10");
    expect(U2L10_WORDS.map((w) => w.word)).toEqual(["acquire", "establish", "fatal", "promote", "retreat", "seize", "surrender", "thrive", "transform", "unravel"]);
    for (const w of U2L10_WORDS) {
      expect(w.syllables?.replace(/·/g, ""), w.word).toBe(w.word);
      expect(w.definition && w.definition.length > 10, w.word).toBeTruthy();
      expect(w.sentence.toLowerCase(), w.word).toContain(w.word);
      expect(w.trick.length, w.word).toBeGreaterThan(10);
      expect(w.oops, w.word).not.toBe(w.word);
      expect(w.at + w.len, w.word).toBeLessThanOrEqual(w.word.length);
      expect(w.sentence, w.word).not.toMatch(/\b(blood|kill|killed|dead|death|stab|sword|wound|gore)\b/i);
      expect(blanked(w.sentence, w.word).toLowerCase(), w.word).not.toMatch(new RegExp(`\\b${w.word}\\b`));
    }
    expect(word("acquire").word.slice(word("acquire").at, word("acquire").at + word("acquire").len)).toBe("c");
    expect(word("seize").word.slice(word("seize").at, word("seize").at + word("seize").len)).toBe("ei");
    expect(word("surrender").word.slice(word("surrender").at, word("surrender").at + word("surrender").len)).toBe("rr");
    expect(word("acquire").trick.toLowerCase()).toContain("c");
    expect(word("seize").trick).toContain("ei");
    expect(word("surrender").trick.toLowerCase()).toMatch(/double r/);
    expect(U2L10_WORDS.map(syllableCount).sort((a, b) => a - b)).toEqual([1, 1, 2, 2, 2, 2, 2, 3, 3, 3]);
  });

  it("keeps the help ladder from spelling the word until the last step", () => {
    for (const w of U2L10_WORDS) {
      for (let misses = 1; misses < REVEAL_WORD_AT; misses += 1) {
        const help = spellingHelp(w, misses);
        expect(help.answer, `${w.word} miss ${misses}`).toBeUndefined();
        expect(help.hint?.toLowerCase().includes(w.word), `${w.word} miss ${misses}`).toBe(false);
      }
      expect(spellingHelp(w, REVEAL_WORD_AT)).toMatchObject({ level: "reveal", answer: w.word });
    }
    expect(spellingHelp(word("acquire"), 1).hint).toMatch(/c/);
    expect(spellingHelp(word("seize"), 2).hint).toMatch(/e then i/);
    expect(spellingHelp(word("surrender"), 2).hint).toMatch(/double r/);
  });

  it("puts every spoken line on the spelling prewarm list and does not require a clip file", () => {
    const clips = prewarmSpellingClips();
    for (const w of U2L10_WORDS) {
      expect(clips).toContain(wordClip(w));
      expect(clips).toContain(trickClip(w));
      expect(clips).toContain(revealClip(w));
      expect(wordClip(w).length).toBeLessThanOrEqual(400);
    }
    expect(wordClip(word("acquire"))).toMatch(/^acquire\. ac-quire\. .+ acquire\.$/);
    expect(wordClip(word("seize"))).toMatch(/^seize\. .+ seize\.$/);
    for (const choice of U2L10_LIST.sortChoices) expect(clips).toContain(praiseFor("sort", true, 0, null, choice.label));
    const script = readFileSync("scripts/tts-prewarm.ts", "utf8");
    expect(script).toContain("npx -y tsx scripts/tts-prewarm.ts --area=spelling --voice=luna --rates=0.85,0.7,1");
    expect(script).toContain("prewarmSpellingClips");
    const prefs = readFileSync("components/ui/KidPrefs.tsx", "utf8");
    expect(prefs).toContain("speakWithBrowser");
    expect(prefs).toContain("reportTtsFallback");
  });

  it("shows syllable breaks and no date yet on the study page", () => {
    const html = renderToStaticMarkup(createElement(SpellingD2, { list: U2L10_LIST, testDate: null, daysLeft: null }));
    expect(html).toContain("no date yet");
    expect(html).toContain("ac");
    expect(html).toContain("quire");
    expect(html).toContain("to get something and keep it as your own");
    expect(html).toContain("Listen &amp; spell");
    expect(html).toContain("Flashcards");
    expect(html).toContain("Letter tiles");
    expect(html).toContain("Fix the misspelling");
    expect(html).toContain("Sort by syllables");
    expect(html).toContain("Mock test");
    expect(html).not.toContain("Test day");
  });
});

describe("Middle Ages list on the Today plan", () => {
  it("is the spelling priority with no date yet, and D-2 is in review", async () => {
    const plan = await todayPlan(memoryEngineRepo, mae, null, NOV11, noAi);
    expect(plan?.blocks[0]).toMatchObject({
      id: "upcoming:spelling-u2l10",
      href: "/study/spelling-u2l10",
      locked: true,
      detail: "no date yet · 0 of 10 mastered",
    });
    expect(plan?.blocks.some((b) => b.id === "upcoming:spelling-d2")).toBe(false);
    expect(plan?.blocks.find((b) => b.id === "spelling-review:spelling-d2")).toMatchObject({
      href: "/study/spelling-d2",
      locked: false,
      minutes: 3,
      detail: "10 words to keep them fresh",
    });
    expect(pastSpellingLists(NOV11).map((t) => t.refId)).toEqual(["spelling-d2"]);
    expect(activeUpcomingTests(NOV11).map((t) => t.id)).toEqual(["spelling-u2l10"]);
  });

  it("uses a date an admin sets later, and drops off after that date", () => {
    expect(validUpcoming({ id: "spelling-u2l10", kind: "spelling", refId: "spelling-u2l10", title: "Middle Ages", startDate: "2026-11-11", testDate: null })).toBe(true);
    expect(validUpcoming({ id: "spelling-u2l10", kind: "spelling", refId: "spelling-u2l10", title: "Middle Ages", startDate: "2026-11-11", testDate: "" })).toBe(true);
    expect(validUpcoming({ id: "x", kind: "chapter", refId: "savvas.ch4", title: "T", startDate: "2026-11-11", testDate: null })).toBe(false);
    expect(testDateLabel(null)).toBe("no date yet");
    expect(testDateLabel("")).toBe("no date yet");
    const dated: UpcomingTest[] = DEFAULT_UPCOMING.map((t) => (t.id === "spelling-u2l10" ? { ...t, testDate: "2026-11-20" } : t));
    expect(activeUpcomingTests(NOV11, dated).map((t) => t.id)).toEqual(["spelling-u2l10"]);
    expect(activeUpcomingTests(at("2026-11-21T15:00:00Z"), dated).some((t) => t.id === "spelling-u2l10")).toBe(false);
    expect(pastSpellingLists(at("2026-11-21T15:00:00Z"), dated).map((t) => t.refId)).toContain("spelling-u2l10");
  });

  it("marks the D-2 review done after she practices it today", async () => {
    await checkSpelling(memoryEngineRepo, mae, { word: "swift", typed: "swift", mode: "listen", misses: 0, list: "spelling-d2" }, NOV11);
    const plan = await todayPlan(memoryEngineRepo, mae, null, NOV11, noAi);
    expect(plan?.blocks.find((b) => b.id === "spelling-review:spelling-d2")?.done).toBe(true);
    const events = await memoryEngineRepo.withLearner(SEEDED_LEARNER_ID, (tx) => tx.eventsSince(0, [SPELLING_EVENT]));
    expect(events.every((e) => e.activityId === "spelling-d2")).toBe(true);
  });
});

describe("grading the new list", () => {
  it("grades on the server, sorts by syllables, and keeps the lists apart", async () => {
    const miss = await checkSpelling(memoryEngineRepo, mae, { word: "seize", typed: "sieze", mode: "listen", misses: 0, list: "spelling-u2l10" }, NOV11);
    expect(miss).toMatchObject({ correct: false, help: { level: "hint" } });
    expect(miss?.help.hint).not.toContain("seize");
    const ok = await checkSpelling(memoryEngineRepo, mae, { word: "acquire", typed: "acquire", mode: "listen", misses: 0, list: "spelling-u2l10" }, NOV11 + 1000);
    expect(ok?.correct).toBe(true);
    expect(ok?.stat?.streak).toBe(1);
    const sort = await checkSpelling(memoryEngineRepo, mae, { word: "surrender", mode: "sort", sort: "3", misses: 0, list: "spelling-u2l10" }, NOV11 + 2000);
    expect(sort?.correct).toBe(true);
    expect(sort?.sort).toMatchObject({ answer: "3", label: "3 syllables" });
    const wrongSort = await checkSpelling(memoryEngineRepo, mae, { word: "thrive", mode: "sort", sort: "3", misses: 0, list: "spelling-u2l10" }, NOV11 + 3000);
    expect(wrongSort?.correct).toBe(false);
    expect(await checkSpelling(memoryEngineRepo, mae, { word: "seize", typed: "seize", mode: "listen", misses: 0 }, NOV11)).toBeNull();
    expect(await checkSpelling(memoryEngineRepo, mae, { word: "cotton", typed: "cotton", mode: "listen", misses: 0, list: "spelling-u2l10" }, NOV11)).toBeNull();
    const summary = await spellingSummary(memoryEngineRepo, mae, NOV11 + 4000, "spelling-u2l10");
    expect(summary?.total).toBe(10);
    expect(summary?.mastered).toBe(0);
    const d2 = await spellingSummary(memoryEngineRepo, mae, NOV11 + 4000, "spelling-d2");
    expect(d2?.total).toBe(25);
    expect(d2?.stats.find((s) => s.word === "swift")?.attempts ?? 0).toBe(0);
  });

  it("sends signed-out visitors to sign-in", () => {
    expect(decideRequest({ pathname: "/study/spelling-u2l10", hasSession: false, role: null }).kind).toBe("redirect-signin");
  });
});

function blanked(sentence: string, target: string): string {
  return sentence.replace(new RegExp(target, "gi"), "_____");
}
