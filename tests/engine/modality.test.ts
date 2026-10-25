import { beforeEach, describe, expect, it } from "vitest";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { getRecap } from "@/lib/content/recaps";
import { memoryAdminRepo, memoryEngineRepo as repo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { EXPLORE_RATE, armStats, chooseArm, chooseReteachModality, sampleBeta } from "@/lib/engine/modality";
import { reteachStart } from "@/components/ChapterPlayer";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-19T14:00:00Z");
beforeEach(() => resetMemoryRepo());

function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe("Thompson chooser", () => {
  it("samples Beta in [0,1] with the right mean", () => {
    const r = seeded();
    let sum = 0;
    for (let i = 0; i < 4000; i += 1) {
      const x = sampleBeta(9, 3, r);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      sum += x;
    }
    expect(sum / 4000).toBeCloseTo(0.75, 1);
  });

  it("explores at least 15% of the time and otherwise favors the winning arm", () => {
    const r = seeded(11);
    const stats = [
      { modality: "watch" as const, successes: 18, failures: 2 },
      { modality: "read" as const, successes: 2, failures: 18 },
      { modality: "retry" as const, successes: 3, failures: 17 },
    ];
    const counts = { watch: 0, read: 0, retry: 0 };
    let explored = 0;
    const N = 5000;
    for (let i = 0; i < N; i += 1) {
      const c = chooseArm(stats, r);
      counts[c.modality] += 1;
      if (c.chosenBy === "explore") explored += 1;
    }
    expect(explored / N).toBeGreaterThan(EXPLORE_RATE - 0.02);
    expect(EXPLORE_RATE).toBeGreaterThanOrEqual(0.15);
    expect(counts.watch / N).toBeGreaterThan(0.8);
    // Every arm keeps being tried.
    expect(counts.read).toBeGreaterThan(N * 0.03);
    expect(counts.retry).toBeGreaterThan(N * 0.03);
  });

  it("uses only_option when one arm is available", () => {
    expect(chooseArm([{ modality: "read", successes: 0, failures: 0 }]).chosenBy).toBe("only_option");
  });
});

describe("modality episodes", () => {
  it("records one episode per re-teach (reused on reload) and resolves it on the next answer", async () => {
    const ch = listChapters().find((c) => getRecap(c.id)) ?? getChapter("savvas.ch1")!;
    const item = ch.items[0];
    const first = await chooseReteachModality(repo, mae, item.id, T0, () => 0.99);
    const again = await chooseReteachModality(repo, mae, item.id, T0 + 60_000, () => 0.01);
    expect(again).toBe(first);
    let eps = await memoryAdminRepo.modalityEpisodes();
    expect(eps).toHaveLength(1);
    expect(eps[0]).toMatchObject({ itemId: item.id, conceptId: item.conceptId, subject: ch.subject, resolvedAt: null });
    const s = await startSession(repo, mae, { entry: "study", chapterId: ch.id, now: T0 + 70_000 });
    const response = item.type === "tap_evidence" ? { choice: item.answer, evidence: item.evidenceSentenceId } : item.answer;
    await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: item.id, response, latencyMs: 8000, now: T0 + 80_000 });
    eps = await memoryAdminRepo.modalityEpisodes();
    expect(eps[0].success).toBe(true);
    expect(armStats(eps, ch.subject, [eps[0].modality])[0].successes).toBe(1);
  });

  it("admin previews don't record episodes", async () => {
    const item = getChapter("savvas.ch1")!.items[0];
    expect(await chooseReteachModality(repo, { role: "admin", learnerId: null }, item.id, T0)).not.toBeNull();
    expect(await memoryAdminRepo.modalityEpisodes()).toHaveLength(0);
  });

  it("reteachStart honors the chosen modality", () => {
    expect(reteachStart(true, "retry", 3)).toEqual({ kind: "step", index: 3 });
    expect(reteachStart(true, "read")).toEqual({ kind: "read" });
    expect(reteachStart(false, "watch")).toEqual({ kind: "read" });
    expect(reteachStart(true, "watch")).toEqual({ kind: "watch" });
  });
});
