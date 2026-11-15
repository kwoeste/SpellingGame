import { describe, expect, it } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { spellingLists } from "@/lib/spelling/catalog";
import { RECOGNITION_MODES, practiceQueue, wordStats, type SpellingAttempt } from "@/lib/spelling/engine";
import {
  TEST_FORMATS,
  answerForFormat,
  applyMissing,
  assignTestFormats,
  blankCount,
  blankDisplay,
  blankIndexes,
  formatUsesLadder,
  lockedBlankLetters,
  scrambleLetters,
  spellingChoices,
  spellingDistractors,
} from "@/lib/spelling/formats";
import { modeStats } from "@/lib/spelling/mix";
import { SPELLING_EVENT, checkSpelling } from "@/lib/spelling/service";

const lists = spellingLists();
const words = lists.flatMap((list) => list.words);

function rng(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

describe("spelling distractors", () => {
  it("gives every catalog word 3 unique near-misses that are not the word", () => {
    for (const entry of words) {
      const misses = spellingDistractors(entry.word, entry.oops);
      expect(misses, entry.word).toHaveLength(3);
      expect(new Set(misses).size, entry.word).toBe(3);
      for (const miss of misses) {
        expect(miss, entry.word).not.toBe(entry.word);
        expect(miss).toMatch(/^[a-z]+$/);
      }
      expect(spellingDistractors(entry.word, entry.oops), entry.word).toEqual(misses);
      if (entry.oops !== entry.word) expect(misses, entry.word).toContain(entry.oops);
    }
  });

  it("shuffles four unique choices and keeps the right spelling in the set", () => {
    for (const entry of words) {
      const choices = spellingChoices(entry.word, entry.oops, rng(entry.word.length + 3));
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(entry.word);
      expect(new Set(choices)).toEqual(new Set([entry.word, ...spellingDistractors(entry.word, entry.oops)]));
    }
    const forward = spellingChoices("acquire", "aquire", () => 0);
    const backward = spellingChoices("acquire", "aquire", () => 0.999);
    expect(forward[0]).not.toBe(backward[0]);
  });
});

describe("missing letters", () => {
  it("blanks 1 to 3 letters, prefers the tricky spot, and never hides the whole word", () => {
    for (const entry of words) {
      const indexes = blankIndexes(entry.word, entry.at, entry.len);
      expect(indexes.length).toBe(blankCount(entry.word.length));
      expect(indexes.length).toBeGreaterThanOrEqual(1);
      expect(indexes.length).toBeLessThanOrEqual(3);
      expect(indexes.length).toBeLessThan(entry.word.length);
      expect(new Set(indexes).size).toBe(indexes.length);
      for (const index of indexes) expect(index).toBeGreaterThanOrEqual(0);
      expect(indexes.at(-1)).toBeLessThan(entry.word.length);
      const tricky = new Set(Array.from({ length: entry.len }, (_, offset) => entry.at + offset));
      expect(indexes.some((index) => tricky.has(index)), entry.word).toBe(true);
      const shown = blankDisplay(entry.word, indexes);
      expect(shown.split(" ")).toHaveLength(entry.word.length);
      expect(shown).toContain("_");
      expect(shown.replace(/ /g, "")).not.toBe(entry.word);
    }
    expect(blankDisplay("acquire", [3])).toBe("a c q _ i r e");
    expect(blankIndexes("acquire", 1, 1)).toContain(1);
  });

  it("rebuilds the word from the missing letters and locks letters the ladder already showed", () => {
    expect(applyMissing("acquire", [1, 2], "cq")).toBe("acquire");
    expect(applyMissing("acquire", [1], "x")).toBe("axquire");
    expect(applyMissing("acquire", [1], "acquire")).toBe("acquire");
    expect(answerForFormat("blanks", "swift", [2], "i")).toBe("swift");
    expect(answerForFormat("listen", "swift", [2], "Swift")).toBe("Swift");
    expect(lockedBlankLetters("acquire", [1, 3], 2)).toBe("c");
    expect(lockedBlankLetters("acquire", [1, 3], 0)).toBe("");
  });
});

describe("scramble", () => {
  it("uses the same letters and is not the word, for every catalog word", () => {
    for (const entry of words) {
      for (const seed of [1, 2, 7, 11, 19]) {
        const tiles = scrambleLetters(entry.word, rng(seed));
        expect(tiles.join(""), `${entry.word} seed ${seed}`).not.toBe(entry.word);
        expect([...tiles].sort()).toEqual([...entry.word].sort());
      }
    }
  });
});

describe("practice-test format mix", () => {
  it("always includes hear-and-type, varies the formats, and stays in order for the same random source", () => {
    expect(assignTestFormats(0, rng(1))).toEqual([]);
    for (const count of [1, 2, 5, 10, 25]) {
      const formats = assignTestFormats(count, rng(count + 4));
      expect(formats).toHaveLength(count);
      expect(formats).toContain("listen");
      expect(formats.every((format) => (TEST_FORMATS as readonly string[]).includes(format))).toBe(true);
      if (count >= TEST_FORMATS.length) expect(new Set(formats)).toEqual(new Set(TEST_FORMATS));
      for (let i = 1; i < formats.length; i += 1) expect(formats[i]).not.toBe(formats[i - 1]);
      expect(assignTestFormats(count, rng(count + 4))).toEqual(formats);
    }
    expect(formatUsesLadder("listen")).toBe(true);
    expect(formatUsesLadder("blanks")).toBe(true);
    expect(formatUsesLadder("sentence")).toBe(true);
    expect(formatUsesLadder("choice")).toBe(false);
    expect(formatUsesLadder("scramble")).toBe(false);
  });

  it("records each format so the mix stats can see it, and a pick does not master the word", async () => {
    resetMemoryRepo();
    const now = Date.parse("2026-11-15T15:00:00Z");
    const mae = { role: "student" as const, learnerId: SEEDED_LEARNER_ID };
    const blanks = await checkSpelling(memoryEngineRepo, mae, { word: "swift", typed: "swift", mode: "blanks", misses: 0, list: "spelling-d2" }, now);
    const choice = await checkSpelling(memoryEngineRepo, mae, { word: "cotton", typed: "coton", mode: "choice", misses: 0, list: "spelling-d2" }, now + 1000);
    const sentence = await checkSpelling(memoryEngineRepo, mae, { word: "kitchen", typed: "kitchen", mode: "sentence", misses: 0, list: "spelling-d2" }, now + 2000);
    const scramble = await checkSpelling(memoryEngineRepo, mae, { word: "shock", typed: "shock", mode: "scramble", misses: 0, list: "spelling-d2" }, now + 3000);
    expect(blanks?.correct).toBe(true);
    expect(choice?.correct).toBe(false);
    expect(sentence?.correct).toBe(true);
    expect(scramble?.correct).toBe(true);
    expect(await checkSpelling(memoryEngineRepo, mae, { word: "swift", typed: "swift", mode: "nope", misses: 0, list: "spelling-d2" }, now)).toBeNull();

    const events = await memoryAdminRepo.eventsOfType(SPELLING_EVENT, 20);
    expect(events.map((event) => event.payload?.mode).sort()).toEqual(["blanks", "choice", "scramble", "sentence"]);
    const stats = modeStats([
      { word: "swift", correct: true, firstTry: true, mode: "blanks", at: now },
      { word: "cotton", correct: false, firstTry: true, mode: "choice", at: now + 1000 },
    ]);
    expect(stats.find((row) => row.mode === "blanks")?.in_game_accuracy).toBe(1);
    expect(stats.find((row) => row.mode === "choice")?.in_game_accuracy).toBe(0);

    const day = Date.parse("2026-11-16T15:00:00Z");
    const picked: SpellingAttempt[] = [0, 1, 2].map((n) => ({ word: "swift", correct: true, firstTry: true, mode: "choice", at: now + n * 86_400_000 }));
    expect(RECOGNITION_MODES).toContain("choice");
    expect(wordStats(picked).find((row) => row.word === "swift")?.mastered).toBe(false);
    const missed = wordStats([{ word: "cotton", correct: false, firstTry: true, mode: "choice", at: now }]);
    expect(practiceQueue(missed, now + 1000)[0]).toBe("cotton");
    const produced = wordStats([
      { word: "shock", correct: true, firstTry: true, mode: "sentence", at: now },
      { word: "shock", correct: true, firstTry: true, mode: "scramble", at: now + 1000 },
      { word: "shock", correct: true, firstTry: true, mode: "blanks", at: day },
    ]);
    expect(produced.find((row) => row.word === "shock")?.mastered).toBe(true);
  });
});
