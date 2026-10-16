import { describe, expect, it } from "vitest";
import { predictedCorrect, updateElo } from "@/lib/engine/elo";
import { conceptGatePassed } from "@/lib/engine/gating";
import { dueAt, etDateKey, intervalDays, nextBoxOnPass } from "@/lib/engine/scheduler";
import { resetXpLedger, ringPercent, xpForMinute } from "@/lib/engine/xp";
import { itemSelectionScore, targetSuccess } from "@/lib/engine/zone";

describe("Elo and zone", () => {
  it("keeps predicted success in a usable band", () => {
    const p = predictedCorrect(0, 0, 0.25);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(0.8);
    const updated = updateElo({ theta: 0, difficulty: 0, outcome: 1, nLearner: 0, nItem: 0, guess: 0.25 });
    expect(updated.theta).toBeGreaterThan(0);
    expect(targetSuccess(0.64)).toBe(0.9);
    expect(targetSuccess(0.82)).toBe(0.82);
    expect(itemSelectionScore({ predicted: 0.82, target: 0.82, dueReview: false, holeFill: false, interestMatch: false, templateNovelty: false })).toBeCloseTo(0);
  });
});

describe("gating", () => {
  it("never marks mastered below 90%", () => {
    expect(conceptGatePassed({ pMastery: 0.99, gateScore: 0.89, rapidGuessOnGate: false })).toBe(false);
    expect(conceptGatePassed({ pMastery: 0.99, gateScore: 0.9, rapidGuessOnGate: true })).toBe(false);
    expect(conceptGatePassed({ pMastery: 0.99, gateScore: 0.9, rapidGuessOnGate: false, requiresEfficient: true, efficientStrategyRate: 0.5 })).toBe(false);
    expect(conceptGatePassed({ pMastery: 0.95, gateScore: 0.9, rapidGuessOnGate: false })).toBe(true);
  });
});

describe("xp and rings", () => {
  it("does not double-count minutes or reward idle/rapid-guess", () => {
    resetXpLedger();
    const base = { sessionId: "s1", minuteStart: 1000, qualifyingActions: 1, idleGapMs: 0, majorityRapidGuess: false, videoHidden: false };
    expect(xpForMinute(base)).toBe(10);
    expect(xpForMinute(base)).toBe(0);
    expect(xpForMinute({ ...base, sessionId: "s2", idleGapMs: 50000 })).toBe(0);
    expect(xpForMinute({ ...base, sessionId: "s3", majorityRapidGuess: true })).toBe(0);
    expect(xpForMinute({ ...base, sessionId: "s4", videoHidden: true })).toBe(0);
    expect(ringPercent(6, 8)).toBe(75);
  });
});

describe("scheduler", () => {
  it("uses expanding boxes and ET date keys around DST 2026-11-01", () => {
    expect(intervalDays(3)).toBe(7);
    expect(nextBoxOnPass(3)).toBe(4);
    const before = new Date("2026-10-31T12:00:00-04:00");
    const after = new Date("2026-11-02T12:00:00-05:00");
    expect(etDateKey(before)).toBe("2026-10-31");
    expect(etDateKey(after)).toBe("2026-11-02");
    expect(dueAt(new Date("2026-10-31T00:00:00Z"), 1).getTime()).toBeGreaterThan(new Date("2026-10-31T00:00:00Z").getTime());
  });
});
