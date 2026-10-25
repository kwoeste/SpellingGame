import { beforeEach, describe, expect, it } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { getChapter } from "@/lib/content/catalog";
import type { ChapterItem } from "@/lib/content/types";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { SESSION_IDLE_MS, skipItem, startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-19T14:00:00Z");
const ch = getChapter("col.ch4")!;
const byType = (t: ChapterItem["type"]) => ch.items.find((i) => i.type === t)!;
const TYPES: ChapterItem["type"][] = ["drag_order", "drag_match", "tap_evidence"];

function wrong(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: "definitely not it", evidence: item.evidenceSentenceId };
  if (item.type === "drag_order") return [...(item.answer as string[])].reverse();
  return {};
}
function right(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: item.answer, evidence: item.evidenceSentenceId };
  return item.answer;
}
async function session(now: number) {
  return (await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: ch.id, now })).sessionId;
}
const send = (sessionId: string, item: ChapterItem, response: unknown, now: number) =>
  submitAnswer(memoryEngineRepo, mae, { sessionId, itemId: item.id, response, latencyMs: 8000, now });

describe("stuck-help ladder: same rule for every question type", () => {
  beforeEach(() => resetMemoryRepo());

  for (const type of TYPES) {
    it(`${type}: no help on misses 1-3, hint at 4, Show me at 5, re-teach queued, skip allowed`, async () => {
      const item = byType(type);
      const s = await session(T0);
      const stages: string[] = [];
      for (let n = 1; n <= 5; n += 1) stages.push((await send(s, item, wrong(item), T0 + n * 5000)).help?.stage ?? "none");
      expect(stages).toEqual(["none", "none", "none", "hint", "show_me"]);
      const decisions = await memoryAdminRepo.decisions(50);
      expect(decisions.some((d) => d.decision === "reteach_queued" && (d.inputs as { item_id: string }).item_id === item.id)).toBe(true);
      await expect(skipItem(memoryEngineRepo, mae, { sessionId: s, itemId: item.id, now: T0 + 40000 })).resolves.toBeTruthy();
    });
  }

  it("keeps counting across sessions (idle gap / new day)", async () => {
    const item = byType("drag_order");
    const s1 = await session(T0);
    for (let n = 1; n <= 3; n += 1) expect((await send(s1, item, wrong(item), T0 + n * 5000)).help).toBeNull();
    const later = T0 + SESSION_IDLE_MS + 60_000;
    const s2 = await session(later);
    expect(s2).not.toBe(s1);
    const fourth = await send(s2, item, wrong(item), later + 5000);
    expect(fourth.session_id).toBe(s2);
    expect(fourth.help?.stage).toBe("hint");
    expect((await send(s2, item, wrong(item), later + 10000)).help?.stage).toBe("show_me");
    // Skip works in the new session too, because it uses the same count.
    await expect(skipItem(memoryEngineRepo, mae, { sessionId: s2, itemId: item.id, now: later + 20000 })).resolves.toBeTruthy();
  });

  it("starts over after a right answer", async () => {
    const item = byType("drag_match");
    const s = await session(T0);
    for (let n = 1; n <= 3; n += 1) await send(s, item, wrong(item), T0 + n * 5000);
    expect((await send(s, item, right(item), T0 + 20000)).correct).toBe(true);
    expect((await send(s, item, wrong(item), T0 + 25000)).help).toBeNull();
  });

  it("starts over after Skip, so the later re-teach begins with no hints", async () => {
    const item = byType("tap_evidence");
    const s = await session(T0);
    for (let n = 1; n <= 5; n += 1) await send(s, item, wrong(item), T0 + n * 5000);
    await skipItem(memoryEngineRepo, mae, { sessionId: s, itemId: item.id, now: T0 + 30000 });
    const next = T0 + 2 * 86_400_000;
    const s2 = await session(next);
    for (let n = 1; n <= 3; n += 1) expect((await send(s2, item, wrong(item), next + n * 5000)).help).toBeNull();
    expect((await send(s2, item, wrong(item), next + 20000)).help?.stage).toBe("hint");
  });
});
