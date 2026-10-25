import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { previewPlanForLearner, todayPlan } from "@/lib/engine/plan";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const T0 = Date.parse("2026-10-25T15:40:00Z");

describe("parent preview of Today's plan", () => {
  beforeEach(() => resetMemoryRepo());

  it("an admin (no learner id) gets null from todayPlan, which is why /study showed the old quest", async () => {
    expect(await todayPlan(memoryEngineRepo, { role: "admin", learnerId: null }, "kevin-login", T0)).toBeNull();
  });

  it("previews Mae's plan with student visibility and caches it under a preview sign-in id", async () => {
    const ai = vi.fn(async () => null);
    const plan = await previewPlanForLearner(memoryEngineRepo, SEEDED_LEARNER_ID, "kevin-login", T0, { ai });
    expect(plan).not.toBeNull();
    expect(plan!.blocks.length).toBeGreaterThan(0);
    const mae = await todayPlan(memoryEngineRepo, { role: "student", learnerId: SEEDED_LEARNER_ID }, null, T0, { ai });
    expect(plan!.blocks.map((b) => b.id)).toEqual(mae!.blocks.map((b) => b.id));
    const rows = await memoryAdminRepo.sessionPlans("2026-10-01");
    expect(rows.map((r) => r.loginId)).toEqual(["preview:kevin-login"]);
    expect(rows[0].learnerId).toBe(SEEDED_LEARNER_ID);
  });
});
