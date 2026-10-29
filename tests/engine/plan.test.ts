import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChapter } from "@/lib/content/catalog";
import type { ChapterItem } from "@/lib/content/types";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { resumePoint, startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { AI_PLAN_DAILY_CAP, todayPlan, validateAiPlan, type PlanBlock } from "@/lib/engine/plan";
import { aiOrderPlan, plannerMessages, type PlannerFacts } from "@/lib/engine/ai-planner";
import { warmupEntries } from "@/lib/engine/warmup";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const repo = memoryEngineRepo;
const T0 = Date.parse("2026-10-19T14:00:00Z");
const DAY = 86_400_000;

function right(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: item.answer, evidence: item.evidenceSentenceId };
  return item.answer;
}

async function finishChapter(id: string, now: number) {
  const ch = getChapter(id)!;
  const s = await startSession(repo, mae, { entry: "study", chapterId: id, now });
  let t = now;
  for (const item of ch.items) await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: item.id, response: right(item), latencyMs: 8000, now: (t += 5000) });
  return ch;
}

/** A fake planner that reverses the unlocked candidates. */
function fakeAi() {
  return vi.fn(async (facts: PlannerFacts) => ({
    order: facts.candidates.filter((c) => !c.locked).map((c) => c.id).reverse(),
    why_kid: "Warm up, then a game and your chapter!",
    admin_note: "Game placed before the chapter because accuracy is solid.",
  }));
}

beforeEach(() => resetMemoryRepo());

describe("warm-up", () => {
  it("serves due reviews later, in review mode without moving resume or re-running the gate", async () => {
    const ch = await finishChapter("savvas.ch1", T0);
    expect(await warmupEntries(repo, mae, T0 + 60_000)).toHaveLength(0);
    const later = T0 + 3 * DAY;
    const entries = await warmupEntries(repo, mae, later);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBeLessThanOrEqual(8);
    expect(JSON.stringify(entries)).not.toMatch(/"answer"/);
    await finishChapter("savvas.ch2", later - DAY);
    const before = await resumePoint(repo, mae);
    const item = ch.items.find((i) => i.id === entries[0].step.itemId)!;
    const fb = await submitAnswer(repo, mae, { itemId: item.id, response: right(item), latencyMs: 8000, now: later, mode: "review" });
    expect(fb.correct).toBe(true);
    expect(fb.gate).toBeNull();
    expect((await resumePoint(repo, mae))?.chapterId).toBe(before?.chapterId);
    // Answered today, so it leaves the queue.
    const again = await warmupEntries(repo, mae, later + 1000);
    expect(again.map((e) => e.step.itemId)).not.toContain(item.id);
  });
});

describe("today's plan", () => {
  it("builds blocks with a minutes goal and shows Time back! once met", async () => {
    await memoryAdminRepo.upsertGoal({ learnerId: SEEDED_LEARNER_ID, weeklyXpGoal: 600, dailyMinutesGoal: 1, updatedAt: T0, updatedBy: "dad" });
    const empty = await todayPlan(repo, mae, null, T0, { ai: fakeAi() });
    expect(empty?.goalMinutes).toBe(1);
    expect(empty?.timeBack).toBe(false);
    expect(empty?.blocks.map((b) => b.kind)).toEqual(["chapter", "chapter", "game"]);
    await finishChapter("savvas.ch1", T0);
    const after = await todayPlan(repo, mae, null, T0 + 120_000, { ai: fakeAi() });
    expect(after?.minutesToday).toBeGreaterThanOrEqual(1);
    expect(after?.timeBack).toBe(true);
  });

  it("calls the AI once per sign-in, reuses it on page loads, and regenerates on a new sign-in", async () => {
    const ai = fakeAi();
    const first = await todayPlan(repo, mae, "login-1", T0, { ai });
    expect(ai).toHaveBeenCalledTimes(1);
    expect(first?.source).toBe("ai");
    // The least-recent subject stays pinned first; the AI orders the rest.
    expect(first?.blocks.map((b) => b.kind)).toEqual(["chapter", "game", "chapter"]);
    await todayPlan(repo, mae, "login-1", T0 + 1000, { ai });
    expect(ai).toHaveBeenCalledTimes(1);
    // Progress updates checkmarks locally: the chapter block is checked off without a new call.
    const ch = await finishChapter(first!.blocks.find((b) => b.kind === "chapter")!.href.split("/").pop()!, T0 + 2000);
    const reload = await todayPlan(repo, mae, "login-1", T0 + 600_000, { ai });
    expect(ai).toHaveBeenCalledTimes(1);
    expect(reload?.blocks.find((b) => b.id === `chapter:${ch.id}`)?.done).toBe(true);
    await todayPlan(repo, mae, "login-2", T0 + 700_000, { ai });
    expect(ai).toHaveBeenCalledTimes(2);
  });

  it("caps AI calls per day against sign-in loops", async () => {
    const ai = fakeAi();
    for (let i = 0; i < AI_PLAN_DAILY_CAP + 3; i += 1) await todayPlan(repo, mae, `loop-${i}`, T0 + i, { ai });
    expect(ai).toHaveBeenCalledTimes(AI_PLAN_DAILY_CAP);
    const next = await todayPlan(repo, mae, "loop-x", T0 + 100, { ai });
    expect(next?.source).toBe("deterministic");
  });

  it("falls back to the deterministic plan when the AI fails or answers badly", async () => {
    const boom = await todayPlan(repo, mae, "a", T0, { ai: async () => { throw new Error("down"); } });
    expect(boom?.source).toBe("deterministic");
    expect(boom?.blocks.map((b) => b.kind)).toEqual(["chapter", "chapter", "game"]);
    const bad = await todayPlan(repo, mae, "b", T0, { ai: async () => ({ order: ["made-up"], why_kid: "hi", admin_note: "x" }) });
    expect(bad?.source).toBe("deterministic");
    const missingKey = await aiOrderPlan({ minutes_goal: 15, minutes_today: 0, recent_accuracy: null, recent_answers: 0, rush_rate: 0, candidates: [] }, fetch, "");
    expect(missingKey).toBeNull();
  });

  it("admin previews never call the AI", async () => {
    const ai = fakeAi();
    expect(await todayPlan(repo, { role: "admin", learnerId: null }, "x", T0, { ai })).toBeNull();
    expect(ai).not.toHaveBeenCalled();
  });
});

describe("validateAiPlan", () => {
  const block = (id: string, locked = false, done = false): PlanBlock => ({ id, kind: "chapter", title: id, href: "/", minutes: 5, done, locked, conceptIds: [] });
  const blocks = [block("warmup", true), block("chapter:a"), block("game"), block("assignment:1", false, true)];
  const ok = { why_kid: "Let's go!", admin_note: "Chapter first." };

  it("accepts a permutation and keeps locked first and done last", () => {
    expect(validateAiPlan({ order: ["game", "chapter:a"], ...ok }, blocks)?.order).toEqual(["warmup", "game", "chapter:a", "assignment:1"]);
  });
  it("rejects invented, missing, duplicate, or locked ids", () => {
    expect(validateAiPlan({ order: ["game", "chapter:zzz"], ...ok }, blocks)).toBeNull();
    expect(validateAiPlan({ order: ["game"], ...ok }, blocks)).toBeNull();
    expect(validateAiPlan({ order: ["game", "game"], ...ok }, blocks)).toBeNull();
    expect(validateAiPlan({ order: ["warmup", "game"], ...ok }, blocks)).toBeNull();
  });
  it("rejects links, markup, emails, and over-long lines", () => {
    for (const why of ["see https://x.ai", "<b>hi</b>", "mail me@x.com", "a".repeat(200), ""]) {
      expect(validateAiPlan({ order: ["game", "chapter:a"], why_kid: why, admin_note: "ok" }, blocks)).toBeNull();
    }
  });
});

describe("no PII to the planner", () => {
  it("sends only de-identified facts", async () => {
    await memoryAdminRepo.createAssignment({
      learnerId: SEEDED_LEARNER_ID,
      kind: "manual",
      targetType: "chapter",
      targetId: "savvas.ch2",
      title: "Mae please do this SECRET-NOTE",
      reason: "free text from dad",
      status: "open",
      createdBy: "kevin@example.com",
    });
    let seen: PlannerFacts | null = null;
    await todayPlan(repo, mae, "pii", T0, { ai: async (facts) => { seen = facts; return null; } });
    expect(seen).not.toBeNull();
    const body = JSON.stringify(plannerMessages(seen!));
    for (const bad of ["Mae", "SECRET-NOTE", "free text", "@", SEEDED_LEARNER_ID]) expect(body).not.toContain(bad);
    expect(Object.keys(seen!).sort()).toEqual(["candidates", "minutes_goal", "minutes_today", "recent_accuracy", "recent_answers", "rush_rate"]);
  });

  it("posts JSON-schema chat completions to xAI and survives bad responses", async () => {
    const facts: PlannerFacts = { minutes_goal: 15, minutes_today: 0, recent_accuracy: 0.8, recent_answers: 5, rush_rate: 0, candidates: [] };
    const fetchOk = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.response_format.type).toBe("json_schema");
      expect(String(init.body)).not.toContain("Mae");
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"order":[],"why_kid":"Go!","admin_note":"Fine."}' } }] }));
    });
    expect(await aiOrderPlan(facts, fetchOk as unknown as typeof fetch, "test-key")).toEqual({ order: [], why_kid: "Go!", admin_note: "Fine." });
    const fetchBad = vi.fn(async () => new Response("not json"));
    expect(await aiOrderPlan(facts, fetchBad as unknown as typeof fetch, "test-key")).toBeNull();
    const fetch500 = vi.fn(async () => new Response("", { status: 500 }));
    expect(await aiOrderPlan(facts, fetch500 as unknown as typeof fetch, "test-key")).toBeNull();
  });
});
