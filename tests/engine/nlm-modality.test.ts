import { beforeEach, describe, expect, it, vi } from "vitest";

const media = vi.hoisted(() => ({ video: new Set<string>(), audio: new Set<string>(), cards: new Set<string>() }));
vi.mock("@/lib/content/nlm", async (orig) => {
  const real = await orig<typeof import("@/lib/content/nlm")>();
  return {
    ...real,
    mediaEntry: (id: string, kind: "video" | "audio") => ((kind === "video" ? media.video : media.audio).has(id) ? { url: "x", bytes: 1 } : null),
    flashcardsFor: (id: string) => (media.cards.has(id) ? [{ front: "a", back: "b" }] : []),
  };
});

import { getChapter } from "@/lib/content/catalog";
import { getRecap } from "@/lib/content/recaps";
import { memoryAdminRepo, memoryEngineRepo as repo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { chooseArm, chooseFirstTeachModality, chooseReteachModality, eligibleArms, priorFor } from "@/lib/engine/modality";
import { aggregateStats, generateInsight, insightMessages, preferredBySubject, INSIGHT_DAILY_CAP } from "@/lib/engine/learning-insight";
import { firstTeachStart, reteachStart } from "@/components/ChapterPlayer";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-19T14:00:00Z");
const CH = "savvas.ch1";
beforeEach(() => {
  resetMemoryRepo();
  media.video.clear();
  media.audio.clear();
  media.cards.clear();
});

function answer(item: ReturnType<typeof getChapter> extends infer C ? (C extends { items: (infer I)[] } ? I : never) : never, right: boolean) {
  const r = item.type === "tap_evidence" ? { choice: item.answer, evidence: item.evidenceSentenceId } : item.answer;
  return right ? r : "definitely-wrong";
}

describe("chooser eligibility", () => {
  it("offers NotebookLM arms only when the chapter has that media", () => {
    const base = eligibleArms(CH, "reteach");
    expect(base.some((m) => m.startsWith("nlm_"))).toBe(false);
    media.video.add(CH);
    media.cards.add(CH);
    const arms = eligibleArms(CH, "reteach");
    expect(arms).toContain("nlm_video");
    expect(arms).toContain("nlm_flashcards");
    expect(arms).not.toContain("nlm_podcast");
    expect(eligibleArms(CH, "first_teach")).not.toContain("retry");
  });

  it("exploration still tries every eligible arm, including NotebookLM ones", () => {
    media.video.add(CH);
    media.audio.add(CH);
    media.cards.add(CH);
    const arms = eligibleArms(CH, "reteach");
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const stats = arms.map((m) => ({ modality: m, successes: m === "read" ? 30 : 0, failures: m === "read" ? 0 : 30 }));
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i += 1) seen.add(chooseArm(stats, r).modality);
    expect([...seen].sort()).toEqual([...arms].sort());
  });

  it("insight weights are a bounded prior, not a decision", () => {
    expect(priorFor({ math: { nlm_video: 1 } }, "math", "nlm_video")).toEqual({ priorSuccesses: 3.8, priorFailures: expect.closeTo(0.2, 5) });
    expect(priorFor(null, "math", "read")).toEqual({ priorSuccesses: 0, priorFailures: 0 });
  });

  it("first teach picks a modality for an untouched chapter and ties the episode to item 0", async () => {
    media.video.add(CH);
    const m = await chooseFirstTeachModality(repo, mae, CH, T0, () => 0.01);
    expect(m && eligibleArms(CH, "first_teach")).toContain(m);
    const eps = await memoryAdminRepo.modalityEpisodes();
    expect(eps).toHaveLength(1);
    expect(eps[0]).toMatchObject({ context: "first_teach", itemId: getChapter(CH)!.items[0].id });
    expect(await chooseFirstTeachModality(repo, mae, CH, T0 + 1000, () => 0.99)).toBe(m);
    expect(await chooseFirstTeachModality(repo, { role: "admin", learnerId: null }, CH, T0)).toBeNull();
  });

  it("start views fall back when the media is missing", () => {
    const wl = { chapterId: CH, video: "/v", audio: null, flashcards: [] };
    expect(reteachStart(true, "nlm_video", 2, wl)).toEqual({ kind: "media", modality: "nlm_video" });
    expect(reteachStart(true, "nlm_podcast", 2, wl)).toEqual({ kind: "watch" });
    expect(firstTeachStart(false, "nlm_video", wl)).toEqual({ kind: "media", modality: "nlm_video" });
    expect(firstTeachStart(true, "nlm_flashcards", null)).toEqual({ kind: "watch" });
    expect(firstTeachStart(true, "read", null)).toEqual({ kind: "read" });
  });
});

describe("episode scoring", () => {
  it("records follow-up time and the rush flag", async () => {
    const ch = getChapter(CH)!;
    const item = ch.items[0];
    await chooseReteachModality(repo, mae, item.id, T0, () => 0.5);
    const s = await startSession(repo, mae, { entry: "study", chapterId: ch.id, now: T0 + 1000 });
    await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: item.id, response: answer(item, false), latencyMs: 600, now: T0 + 2000 });
    const [ep] = await memoryAdminRepo.modalityEpisodes();
    expect(ep).toMatchObject({ success: false, followupLatencyMs: 600, followupRushed: true });
    const stats = aggregateStats([ep], []);
    const cell = stats.by_subject_modality.find((c) => c.modality === ep.modality)!;
    expect(cell).toMatchObject({ n: 1, accuracy_after: 0, rush_rate: 1 });
  });
});

describe("Grok learning insight", () => {
  async function seedEpisode() {
    const item = getChapter(CH)!.items[0];
    await chooseReteachModality(repo, mae, item.id, T0, () => 0.5);
    const s = await startSession(repo, mae, { entry: "study", chapterId: CH, now: T0 + 1000 });
    await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: item.id, response: answer(item, true), latencyMs: 9000, now: T0 + 2000 });
  }

  it("falls back to a deterministic summary with no key or a bad answer", async () => {
    await seedEpisode();
    const noKey = await generateInsight(memoryAdminRepo, SEEDED_LEARNER_ID, "admin", "admin", { ai: async () => null, now: T0 + 5000 });
    expect(noKey.status).toBe("created");
    expect(noKey.insight).toMatchObject({ source: "deterministic", model: null });
    expect(noKey.insight!.summary.length).toBeGreaterThan(10);
    expect(noKey.insight!.confidence).toMatch(/small|few|early|limited/i);
    const bad = await generateInsight(memoryAdminRepo, SEEDED_LEARNER_ID, "admin", "admin", {
      ai: async () => ({ summary: "", confidence_note: "", weights: [{ subject: "math", modality: "teleport", weight: 9 }] }) as never,
      now: T0 + 6000,
    });
    expect(bad.insight!.source).toBe("deterministic");
  });

  it("uses a valid Grok answer and exposes the per-subject preference", async () => {
    await seedEpisode();
    const subject = getChapter(CH)!.subject;
    const [ep] = await memoryAdminRepo.modalityEpisodes();
    const res = await generateInsight(memoryAdminRepo, SEEDED_LEARNER_ID, "admin", "admin", {
      ai: async () => ({ summary: "Videos help most in math right now.", confidence_note: "Only one try so far.", weights: [{ subject, modality: ep.modality, weight: 0.8 }, { subject, modality: "nlm_video", weight: 0.9 }] }),
      now: T0 + 5000,
    });
    expect(res.insight).toMatchObject({ source: "ai", summary: "Videos help most in math right now." });
    expect(preferredBySubject(res.insight!.weights)[subject]).toBe(ep.modality); // weights for ways with no data are dropped
    expect((await repo.withLearner(SEEDED_LEARNER_ID, async (tx) => tx.latestInsight()))?.id).toBe(res.insight!.id);
  });

  it("caps calls per day and skips a weekly run when one is fresh", async () => {
    const calls: number[] = [];
    const ai = async () => (calls.push(1), null);
    for (let i = 0; i < INSIGHT_DAILY_CAP; i += 1) await generateInsight(memoryAdminRepo, SEEDED_LEARNER_ID, "admin", "admin", { ai, now: T0 + i });
    expect((await generateInsight(memoryAdminRepo, SEEDED_LEARNER_ID, "admin", "admin", { ai, now: T0 + 100 })).status).toBe("capped");
    expect((await generateInsight(memoryAdminRepo, SEEDED_LEARNER_ID, "weekly", null, { ai, now: T0 + 86_400_000 * 2 })).status).toBe("fresh");
  });

  it("never sends her name, email or free text", async () => {
    await seedEpisode();
    const body = JSON.stringify(insightMessages(aggregateStats(await memoryAdminRepo.modalityEpisodes(), [])));
    expect(body).not.toMatch(/mae|woeste|@|definitely-wrong/i);
    expect(body).not.toContain(SEEDED_LEARNER_ID);
  });
});
