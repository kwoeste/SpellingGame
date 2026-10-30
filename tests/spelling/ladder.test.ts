import { beforeEach, describe, expect, it } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import type { EngineActor } from "@/lib/engine/service";
import { HINT_LETTER_START, MAX_LETTER_HINTS, REVEAL_WORD_AT, revealedLetters, spellingHelp, wordStats, type SpellingAttempt } from "@/lib/spelling/engine";
import { REQUEUE_GAP, ladderNext, lockPrefix, mockStep, requeue, tilesForPrefix } from "@/lib/spelling/feedback";
import { D2_WORDS, SPELLING_HELP, allSpellingClips, findWord } from "@/lib/spelling/list-d2";
import { SPELLING_EVENT, attemptsFromEvents, checkSpelling } from "@/lib/spelling/service";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const W = (w: string) => findWord(w)!;
beforeEach(() => resetMemoryRepo());

describe("help ladder by miss count", () => {
  it("uses tunable thresholds", () => {
    expect(HINT_LETTER_START).toBe(3);
    expect(MAX_LETTER_HINTS).toBe(3);
    expect(REVEAL_WORD_AT).toBe(6);
  });
  it("misses 1-2: sound hint only, no letters", () => {
    for (const m of [1, 2]) {
      const h = spellingHelp(W("kitchen"), m);
      expect(h.level).toBe("hint");
      expect(h.hint).toContain("short i");
      expect(h.letters).toBeUndefined();
      expect(h.answer).toBeUndefined();
    }
  });
  it("misses 3, 4, 5 reveal 1, 2, 3 letters", () => {
    expect([3, 4, 5].map((m) => spellingHelp(W("kitchen"), m).letters)).toEqual([1, 2, 3]);
    expect(spellingHelp(W("kitchen"), 5).answer).toBeUndefined();
  });
  it("never gives the whole word away through letter hints", () => {
    for (const w of D2_WORDS) for (let m = 0; m < REVEAL_WORD_AT; m++) expect(revealedLetters(w.word, m)).toBeLessThan(w.word.length);
    expect(revealedLetters("cat", 5)).toBe(2);
    expect(revealedLetters("at", 5)).toBe(1);
  });
  it("miss 6 shows the whole word", () => {
    expect(spellingHelp(W("cousin"), 6)).toMatchObject({ level: "reveal", answer: "cousin" });
    expect(spellingHelp(W("cousin"), 9).level).toBe("reveal");
  });
});

describe("copy step always advances", () => {
  it("right copy -> one memory try -> done, whatever the memory answer", () => {
    expect(ladderNext("copy", true, 1)).toBe("memory");
    expect(ladderNext("memory", true, 1)).toBe("done");
    expect(ladderNext("memory", false, 1)).toBe("done");
  });
  it("wrong copies end after a couple of tries instead of looping", () => {
    expect(ladderNext("copy", false, 1)).toBe("copy");
    expect(ladderNext("copy", false, 2)).toBe("done");
    expect(ladderNext("copy", false, 50)).toBe("done");
  });
  it("simulated worst case: wrong forever still reaches done", () => {
    let phase: "try" | "copy" | "memory" | "done" = "copy";
    let tries = 0;
    for (let i = 0; i < 10 && phase !== "done"; i++) { tries += 1; phase = ladderNext(phase, false, tries); }
    expect(phase).toBe("done");
  });
});

describe("locked letters and tiles", () => {
  it("keeps the locked prefix in place", () => {
    expect(lockPrefix("ki", "kitchn")).toBe("kitchn");
    expect(lockPrefix("ki", "k")).toBe("ki");
    expect(lockPrefix("", "abc")).toBe("abc");
  });
  it("presses the tiles the locked letters use", () => {
    expect(tilesForPrefix(["t", "o", "c", "t", "n", "o"], "cot")).toEqual([2, 1, 0]);
  });
});

describe("re-queue", () => {
  it("brings a helped word back at least 2 words later", () => {
    const q = ["a", "b", "c", "d", "e", "f"];
    const out = requeue(q, 1, "b");
    expect(out.indexOf("b", 2) - 1).toBe(REQUEUE_GAP);
    expect(out).toHaveLength(7);
  });
  it("appends at the end when the round is short", () => {
    expect(requeue(["a", "b"], 1, "b")).toEqual(["a", "b", "b"]);
  });
});

describe("needed help is recorded and blocks mastery", () => {
  it("flags attempts after a miss and the copy step as needed_help, not first try", async () => {
    const now = Date.parse("2026-10-30T20:00:00Z");
    await checkSpelling(memoryEngineRepo, mae, { word: "swift", typed: "swft", mode: "listen", misses: 0 }, now);
    await checkSpelling(memoryEngineRepo, mae, { word: "swift", typed: "swift", mode: "listen", misses: 1 }, now + 1000);
    await checkSpelling(memoryEngineRepo, mae, { word: "kitchen", typed: "kitchen", mode: "tiles", misses: 6, phase: "copy" }, now + 2000);
    const events = await memoryAdminRepo.eventsOfType(SPELLING_EVENT, 100);
    const byTime = [...events].sort((a, b) => a.serverTs - b.serverTs);
    expect(byTime[0].payload).toMatchObject({ first_try: true, needed_help: false });
    expect(byTime[1].payload).toMatchObject({ first_try: false, needed_help: true });
    expect(byTime[2].payload).toMatchObject({ first_try: false, needed_help: true, phase: "copy" });
    expect(byTime[2].hintLevel).toBe(3);
    const attempts = attemptsFromEvents(byTime);
    expect(attempts.map((a) => a.neededHelp)).toEqual([false, true, true]);
  });
  it("a helped word is not mastered and counts as a recent miss", () => {
    const d1 = Date.parse("2026-10-29T20:00:00Z");
    const d2 = Date.parse("2026-10-30T20:00:00Z");
    const a = (t: number, neededHelp = false): SpellingAttempt => ({ word: "swift", correct: true, firstTry: true, mode: "listen", at: t, neededHelp });
    const s = wordStats([a(d1), a(d1 + 1), a(d2, true)]).find((x) => x.word === "swift")!;
    expect(s.mastered).toBe(false);
    expect(s.streak).toBe(0);
    expect(s.neededHelp).toBe(1);
    expect(s.lastMissAt).toBe(d2);
  });
});

describe("mock test never dead-ends", () => {
  it("a wrong answer moves to the next word", () => {
    let s = mockStep({ started: false, idx: 0, missed: [] }, { type: "start" });
    s = mockStep(s, { type: "answer", word: "swift", correct: false });
    expect(s).toMatchObject({ idx: 1, missed: ["swift"] });
  });
});

it("all new help lines are prewarmed", () => {
  for (const line of Object.values(SPELLING_HELP)) expect(allSpellingClips()).toContain(line);
});
