import { describe, expect, it } from "vitest";
import { wordStats, type SpellingAttempt } from "@/lib/spelling/engine";
import { CAP, FLOOR, MIN_SAMPLES, PRACTICE_MODES, SESSION_SLOTS, allocateSlots, buildMix, clampWeights, deterministicWeights, mixMessages, mixPayload, modeStats, planSession, validateMix } from "@/lib/spelling/mix";
import { D2_WORDS } from "@/lib/spelling/list-d2";

const H = 3_600_000;
const T0 = Date.parse("2026-10-29T20:00:00Z");
const words = D2_WORDS.map((w) => w.word);

/** Practice each word once in `mode`, then a later listen check that is right when `good(mode)`. */
function history(good: (mode: string) => boolean, rounds = MIN_SAMPLES + 1): SpellingAttempt[] {
  const out: SpellingAttempt[] = [];
  let t = T0;
  for (let r = 0; r < rounds; r++) {
    for (const mode of PRACTICE_MODES) {
      const word = words[(r * 5 + PRACTICE_MODES.indexOf(mode)) % words.length];
      out.push({ word, mode, correct: true, firstTry: true, at: t });
      out.push({ word, mode: "mock", correct: good(mode), firstTry: true, at: t + 2 * H });
      t += 3 * 86_400_000;
    }
  }
  return out;
}

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe("spelling game mix", () => {
  it("explores with near-equal shares and every game above the floor when there is no data", () => {
    const { weights, phase } = deterministicWeights(modeStats([]));
    expect(phase).toBe("explore");
    for (const m of PRACTICE_MODES) expect(weights[m]).toBeCloseTo(0.2, 1);
    expect(sum(weights)).toBeCloseTo(1, 1);
  });

  it("measures effectiveness on later retrieval, not in-game accuracy", () => {
    const stats = modeStats(history((m) => m === "listen"));
    const tiles = stats.find((s) => s.mode === "tiles")!;
    const listen = stats.find((s) => s.mode === "listen")!;
    expect(tiles.in_game_accuracy).toBe(1);
    expect(tiles.later_accuracy).toBe(0);
    expect(listen.later_accuracy).toBe(1);
    expect(listen.score).toBeGreaterThan(tiles.score);
  });

  it("exploits once every game has enough checks, shifting share to the game that sticks, keeping a floor", () => {
    const { weights, phase } = deterministicWeights(modeStats(history((m) => m === "flash")));
    expect(phase).toBe("exploit");
    expect(weights.flash).toBeGreaterThan(0.3);
    expect(weights.flash).toBeLessThanOrEqual(CAP + 0.01);
    for (const m of PRACTICE_MODES) expect(weights[m]).toBeGreaterThanOrEqual(FLOOR - 0.005);
    const slots = allocateSlots(weights);
    expect(slots.flash).toBeGreaterThan(slots.tiles);
    expect(Object.values(slots).reduce((a, b) => a + b, 0)).toBe(SESSION_SLOTS);
    for (const m of PRACTICE_MODES) expect(slots[m]).toBeGreaterThanOrEqual(1);
  });

  it("clamps extreme weights to the floor and cap", () => {
    const w = clampWeights({ listen: 100, flash: 0, tiles: 0, fix: 0, sort: 0 });
    expect(w.listen).toBeLessThanOrEqual(CAP + 0.01);
    for (const m of PRACTICE_MODES) expect(w[m]).toBeGreaterThanOrEqual(FLOOR - 0.005);
  });

  it("rejects bad Grok output and falls back to deterministic weights", async () => {
    expect(validateMix(null)).toBeNull();
    expect(validateMix({ weights: [{ mode: "listen", weight: 1 }], note: "ok" })).toBeNull(); // missing games
    expect(validateMix({ weights: PRACTICE_MODES.map((mode) => ({ mode, weight: Number.NaN })), note: "ok" })).toBeNull();
    expect(validateMix({ weights: PRACTICE_MODES.map((mode) => ({ mode, weight: 0.2 })), note: "see https://x.ai" })).toBeNull();
    const a = history((m) => m === "fix");
    const det = await buildMix(a, wordStats(a), T0, null);
    const bad = await buildMix(a, wordStats(a), T0, async () => ({ weights: "lots", note: 3 }));
    const thrown = await buildMix(a, wordStats(a), T0, async () => { throw new Error("down"); });
    expect(bad.source).toBe("deterministic");
    expect(bad.weights).toEqual(det.weights);
    expect(thrown.weights).toEqual(det.weights);
  });

  it("uses valid Grok weights (clamped) and its note", async () => {
    const a = history((m) => m === "fix");
    const mix = await buildMix(a, wordStats(a), T0, async () => ({ weights: PRACTICE_MODES.map((mode) => ({ mode, weight: mode === "sort" ? 0.9 : 0.01 })), note: "Fixing misspellings sticks best." }));
    expect(mix.source).toBe("ai");
    expect(mix.note).toBe("Fixing misspellings sticks best.");
    expect(mix.weights.sort).toBeLessThanOrEqual(CAP + 0.01);
    expect(mix.weights.listen).toBeGreaterThanOrEqual(FLOOR - 0.005);
  });

  it("sends Grok only aggregated stats (no name, email or typed answers)", () => {
    const a = history(() => true, 2);
    const text = JSON.stringify(mixMessages(mixPayload(modeStats(a), wordStats(a))));
    expect(text).not.toMatch(/mae|woeste|@|response|typed/i);
  });

  it("plans a session of short rounds across games, weakest words first, ending with a mock check", () => {
    const a: SpellingAttempt[] = [
      { word: words[3], mode: "listen", correct: false, firstTry: true, at: T0 },
      { word: words[3], mode: "listen", correct: false, firstTry: false, at: T0 + 1000 },
      { word: words[7], mode: "listen", correct: false, firstTry: true, at: T0 + 2000 },
    ];
    const stats = wordStats(a);
    const { weights } = deterministicWeights(modeStats(a));
    const rounds = planSession(stats, weights, T0 + 5000);
    expect(rounds.at(-1)!.mode).toBe("mock");
    expect(rounds.length).toBe(PRACTICE_MODES.length + 1);
    expect(new Set(rounds.map((r) => r.mode)).size).toBe(rounds.length);
    expect(rounds[0].words[0]).toBe(words[3]);
    expect(rounds.at(-1)!.words.slice(0, 2)).toEqual([words[3], words[7]]);
    for (const r of rounds) expect(new Set(r.words).size).toBe(r.words.length);
    expect(rounds.slice(0, -1).reduce((n, r) => n + r.words.length, 0)).toBe(SESSION_SLOTS);
  });
});

import { beforeEach } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { todayPlan } from "@/lib/engine/plan";
import { checkSpelling, spellingSession } from "@/lib/spelling/service";

describe("mix stored with the sign-in plan", () => {
  beforeEach(() => resetMemoryRepo());
  it("asks Grok once per sign-in, stores the mix, and the session uses it", async () => {
    const mae = { role: "student" as const, learnerId: SEEDED_LEARNER_ID };
    await checkSpelling(memoryEngineRepo, mae, { word: words[0], typed: "x", mode: "listen", misses: 0 }, T0 - H);
    let calls = 0;
    const spellingAi = async () => { calls += 1; return { weights: PRACTICE_MODES.map((mode) => ({ mode, weight: mode === "tiles" ? 0.6 : 0.1 })), note: "Tiles help right now." }; };
    await todayPlan(memoryEngineRepo, mae, "login-1", T0, { ai: async () => null, spellingAi });
    await todayPlan(memoryEngineRepo, mae, "login-1", T0 + 1000, { ai: async () => null, spellingAi });
    expect(calls).toBe(1);
    const { mix, rounds } = await spellingSession(memoryEngineRepo, SEEDED_LEARNER_ID, "login-1", T0 + 2000);
    expect(mix.note).toBe("Tiles help right now.");
    expect(mix.weights.tiles).toBeGreaterThan(mix.weights.listen);
    expect(rounds.find((r) => r.mode === "tiles")!.words.length).toBeGreaterThan(rounds.find((r) => r.mode === "listen")!.words.length);
    // A sign-in with no stored plan gets deterministic weights.
    expect((await spellingSession(memoryEngineRepo, SEEDED_LEARNER_ID, "other", T0)).mix.source).toBe("deterministic");
  });
});
