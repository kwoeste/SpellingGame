import { describe, expect, it } from "vitest";
import { applyLearn, posteriorCorrect, updateBkt } from "@/lib/engine/bkt";

describe("BKT", () => {
  it("matches the spec hand computation", () => {
    const posterior = posteriorCorrect(0.15, 0.25, 0.1);
    expect(posterior).toBeCloseTo(0.388, 3);
    expect(applyLearn(posterior, 0.12)).toBeCloseTo(0.462, 3);
    const next = updateBkt(0.15, true, { pL0: 0.15, t: 0.12, g: 0.25, s: 0.1 }, 1);
    expect(next.pPosterior).toBeCloseTo(0.388, 3);
    expect(next.pNext).toBeCloseTo(0.462, 3);
  });
});
