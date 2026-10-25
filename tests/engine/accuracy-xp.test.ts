import { describe, expect, it } from "vitest";
import { accuracyWeightedXp, XP_PER_MINUTE } from "@/lib/engine/xp";

describe("accuracy-weighted XP", () => {
  it("scales 0.5x to 1.5x with recent accuracy", () => {
    expect(accuracyWeightedXp(XP_PER_MINUTE, 0)).toBe(5);
    expect(accuracyWeightedXp(XP_PER_MINUTE, 0.5)).toBe(10);
    expect(accuracyWeightedXp(XP_PER_MINUTE, 1)).toBe(15);
  });
  it("is never negative and keeps the base for non-answer minutes", () => {
    expect(accuracyWeightedXp(XP_PER_MINUTE, -3)).toBe(5);
    expect(accuracyWeightedXp(XP_PER_MINUTE, 7)).toBe(15);
    expect(accuracyWeightedXp(0, 1)).toBe(0);
    expect(accuracyWeightedXp(-10, 1)).toBe(0);
    expect(accuracyWeightedXp(XP_PER_MINUTE, null)).toBe(XP_PER_MINUTE);
    expect(accuracyWeightedXp(XP_PER_MINUTE, Number.NaN)).toBe(XP_PER_MINUTE);
  });
});
