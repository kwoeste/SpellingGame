import { beforeEach, describe, expect, it } from "vitest";
import { getChapter } from "@/lib/content/catalog";
import { chapterGatePassed } from "@/lib/engine/gating";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { startSession, type EngineActor } from "@/lib/engine/service";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-25T14:00:00Z");

describe("chapter gate", () => {
  beforeEach(() => resetMemoryRepo());

  it("needs 90% and every concept at 80%", () => {
    expect(chapterGatePassed({ chapterScore: 0.89, coreConceptScores: [1] })).toBe(false);
    expect(chapterGatePassed({ chapterScore: 0.9, coreConceptScores: [0.8, 1] })).toBe(true);
    expect(chapterGatePassed({ chapterScore: 1, coreConceptScores: [0.79] })).toBe(false);
  });

  it("a parent override gives the star and is logged as an override", async () => {
    const ch = getChapter("savvas.ch1")!;
    const before = await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    expect(before.chapter?.starEarned).toBe(false);
    await memoryAdminRepo.overrideChapterGate({ learnerId: SEEDED_LEARNER_ID, chapterId: ch.id, by: "kevin@example.com", reason: "knows it", at: T0 + 1000 });
    expect(await memoryAdminRepo.gatedChapterIds(SEEDED_LEARNER_ID)).toContain(ch.id);
    const after = await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 + 2000 });
    expect(after.chapter?.starEarned).toBe(true);
  });
});
