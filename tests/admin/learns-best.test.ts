import { describe, expect, it } from "vitest";
import { buildLearnsBest, MIN_ATTEMPTS } from "@/lib/admin/learns-best";

const ep = (i: number, modality: "watch" | "read" | "retry", success: boolean | null, subject = "science") => ({
  id: `e${i}`, learnerId: "L", itemId: `i${i}`, conceptId: "c", subject, context: "reteach" as const,
  modality, chosenBy: "thompson" as const, samples: {}, startedAt: i, resolvedAt: success === null ? null : i + 1, success,
});

describe("How Mae learns best", () => {
  it("marks arms under 8 finished tries as still exploring and names no winner", () => {
    const view = buildLearnsBest([ep(1, "watch", true), ep(2, "read", false), ep(3, "read", null)], [], "L");
    expect(view.subjects[0].best).toBeNull();
    expect(view.subjects[0].arms.every((a) => a.exploring)).toBe(true);
    expect(view.subjects[0].summary).toMatch(/Still exploring/);
    expect(view.subjects[0].arms.find((a) => a.modality === "read")?.open).toBe(1);
  });
  it("names the best arm once it has enough data", () => {
    const eps = Array.from({ length: MIN_ATTEMPTS }, (_, i) => ep(i, "watch", i < 7))
      .concat(Array.from({ length: MIN_ATTEMPTS }, (_, i) => ep(100 + i, "retry", i < 2)))
      .concat([ep(999, "watch", true, "math"), { ...ep(1000, "read", true), learnerId: "other" }]);
    const view = buildLearnsBest(eps, [], "L");
    expect(view.subjects.map((s) => s.subject)).toEqual(["math", "science"]);
    expect(view.subjects[1].best).toBe("watch");
    expect(view.subjects[0].best).toBeNull();
  });
  it("surfaces saved planner admin notes, newest first", () => {
    const plans = [
      { learnerId: "L", loginId: "x", day: "2026-10-24", source: "ai" as const, aiAttempted: true, createdAt: 1, plan: { adminNote: "old", whyKid: "w" } },
      { learnerId: "L", loginId: "x", day: "2026-10-25", source: "deterministic" as const, aiAttempted: false, createdAt: 2, plan: { adminNote: "new" } },
    ];
    const view = buildLearnsBest([], plans, "L");
    expect(view.notes.map((n) => n.adminNote)).toEqual(["new", "old"]);
    expect(view.notes[1].source).toBe("ai");
  });
});
