import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { answerAfterMiss, blankWord, isFirstTry, praiseFor, shouldBreathe } from "@/lib/spelling/feedback";
import { D2_WORDS, SESSION_NEXT_UP, SORT_RIGHT, SPELLING_GOT_IT, allSpellingClips } from "@/lib/spelling/list-d2";
import { SPELLING_EVENT, checkSpelling } from "@/lib/spelling/service";
import { NEXT_UP_MS, checkOrder } from "@/components/SpellingD2";

const mae = { role: "student", learnerId: SEEDED_LEARNER_ID } as never;

describe("spelling QA round 2", () => {
  beforeEach(() => resetMemoryRepo());
  it("tiles: a wrong Check clears the typed word so the next try starts fresh", () => {
    expect(answerAfterMiss("tiles", "nich")).toBe("");
    expect(answerAfterMiss("listen", "cuzin")).toBe("");
    expect(answerAfterMiss("fix", "cuzen")).toBe("cuzen");
  });
  it("requeued words never count as first try", () => {
    expect(isFirstTry("inch", 0, new Set())).toBe(true);
    expect(isFirstTry("inch", 0, new Set(["inch"]))).toBe(false);
    expect(isFirstTry("inch", 1, new Set())).toBe(false);
  });
  it("server records retry answers as not first try", async () => {
    const now = Date.parse("2026-10-29T20:00:00Z");
    await checkSpelling(memoryEngineRepo, mae, { word: "cousin", typed: "cousin", mode: "listen", misses: 0, retry: true }, now);
    await checkSpelling(memoryEngineRepo, mae, { word: "cousin", typed: "cousin", mode: "listen", misses: 0 }, now + 1000);
    const ev = (await memoryAdminRepo.eventsOfType(SPELLING_EVENT, 10)).map((e) => (e.payload as { first_try: boolean }).first_try).sort();
    expect(ev).toEqual([false, true]);
  });
  it("check order is shuffled and keeps every word", () => {
    const words = D2_WORDS.slice(0, 8).map((w) => w.word);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const orders = new Set(Array.from({ length: 20 }, () => checkOrder(words, rnd).join(",")));
    expect(orders.size).toBeGreaterThan(5);
    for (const o of orders) expect(o.split(",").sort()).toEqual([...words].sort());
  });
  it("praise fits the game", () => {
    expect(praiseFor("sort", true, 0, "i")).toBe("Yes! That's the short i sound.");
    expect(praiseFor("listen", false, 3)).toBe(SPELLING_GOT_IT);
    for (let n = 0; n < 10; n++) expect(praiseFor("listen", true, n)).not.toBe(SPELLING_GOT_IT);
  });
  it("hint stays after the breathe pause", () => {
    expect(shouldBreathe(true, "hint")).toBe(false);
    expect(shouldBreathe(true, "none")).toBe(true);
  });
  it("sentence text hides the word", () => {
    for (const w of D2_WORDS) expect(blankWord(w.sentence, w.word).toLowerCase()).not.toMatch(new RegExp(`\\b${w.word}\\b`));
  });
  it("new lines are prewarmed and the transition waits ~4s", () => {
    const clips = allSpellingClips();
    expect(SESSION_NEXT_UP.mock).toBe("Next up: Quick spelling check!");
    for (const l of [...Object.values(SORT_RIGHT), SESSION_NEXT_UP.mock]) expect(clips).toContain(l);
    expect(NEXT_UP_MS).toBe(4000);
  });
  it("tiles are at least 60px", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const m = /\.sp-tile \{ min-width: (\d+)px; min-height: (\d+)px/.exec(css)!;
    expect(Number(m[1])).toBeGreaterThanOrEqual(60);
    expect(Number(m[2])).toBeGreaterThanOrEqual(60);
  });
});
