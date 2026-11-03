import { beforeEach, describe, expect, it } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { progressSummary, recordEvents, type EngineActor } from "@/lib/engine/service";
import { todayPlan } from "@/lib/engine/plan";
import { buildPastTestRows } from "@/lib/admin/practice-review";
import { OHIO_TRIBES_FACTS } from "@/lib/practice/bank-ohio-tribes";
import { DEFAULT_UPCOMING, type UpcomingTest } from "@/lib/practice/upcoming";
import { PRACTICE_FACT_TARGET, REVIEW_BLOCK_SIZE, RIGHT_START_BOX, dueFacts, factReviews, pastPracticeTests, practiceReviewStates, recordPracticeReview } from "@/lib/practice/review";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const repo = memoryEngineRepo;
const DAY = 86_400_000;
const NOV3 = Date.parse("2026-11-03T15:00:00Z");
const NOV10 = Date.parse("2026-11-10T15:00:00Z");
const noAi = { ai: async () => null };
const missedIds = OHIO_TRIBES_FACTS.slice(0, 2).map((f) => f.id);

async function finishFull(now: number, missed: string[], chapterId = "ss.ohio-tribes") {
  await recordEvents(repo, mae, {
    now,
    events: [{ type: "game_event", activityId: chapterId, payload: { game_id: "practice-test", chapter_id: chapterId, detail: "finished", mode: "full", score: OHIO_TRIBES_FACTS.length - missed.length, total: OHIO_TRIBES_FACTS.length, missed, misspelled: [] } }],
  } as never);
}

beforeEach(() => resetMemoryRepo());

describe("past practice tests become review", () => {
  it("a practice test is in review only after its date passes (generic, from the dated list)", () => {
    expect(pastPracticeTests(NOV3).map((t) => t.chapterId)).toEqual(["savvas.ch3"]);
    expect(pastPracticeTests(NOV3 + DAY).map((t) => t.chapterId)).toEqual(["ss.ohio-tribes", "savvas.ch3"]);
    const custom: UpcomingTest[] = [{ id: "x", kind: "practice-test", refId: "savvas.ch3", title: "Any test", startDate: "2026-12-01", testDate: "2026-12-02" }];
    expect(pastPracticeTests(Date.parse("2026-12-02T15:00:00Z"), custom)).toHaveLength(0);
    expect(pastPracticeTests(Date.parse("2026-12-03T15:00:00Z"), custom)[0].chapterId).toBe("savvas.ch3");
    // Spelling and chapter items never become practice review.
    expect(pastPracticeTests(NOV10).some((t) => t.kind !== "practice-test")).toBe(false);
  });

  it("missed questions come back first; right ones wait longer", () => {
    const last = { serverTs: NOV3, mode: "full", score: 0, total: 0, missed: missedIds, misspelled: [] };
    const reviews = factReviews("ss.ohio-tribes", "2026-11-03", last, []);
    const due = dueFacts(reviews, NOV3 + DAY);
    expect(due.map((r) => r.targetId).sort()).toEqual([...missedIds].sort());
    const right = reviews.find((r) => r.targetId === OHIO_TRIBES_FACTS[3].id)!;
    expect(right.box).toBe(RIGHT_START_BOX);
    expect(right.dueAt).toBeGreaterThan(NOV3 + 6 * DAY);
    // Never answered: everything is due, but a block is only a few questions.
    expect(dueFacts(factReviews("ss.ohio-tribes", "2026-11-03", null, []), NOV3 + DAY)).toHaveLength(REVIEW_BLOCK_SIZE);
  });

  it("puts one small review block on the Today plan, after dated items, and marks it done once reviewed", async () => {
    await finishFull(NOV3 - 3600_000, missedIds);
    const plan = (await todayPlan(repo, mae, null, NOV10, noAi))!;
    const review = plan.blocks.filter((b) => b.id.startsWith("review:"));
    expect(review).toHaveLength(1);
    expect(review[0].href).toMatch(/practice-test\?mode=review$/);
    expect(review[0].minutes).toBeLessThanOrEqual(3);
    expect(plan.blocks.some((b) => b.kind === "chapter" && b.id.startsWith("chapter:"))).toBe(true);

    await repo.withLearner(SEEDED_LEARNER_ID, async (tx) => {
      const ohio = (await practiceReviewStates(tx, NOV10, DEFAULT_UPCOMING)).find((s) => s.test.chapterId === "ss.ohio-tribes")!;
      expect(ohio.due.slice(0, 2).map((r) => r.targetId).sort()).toEqual([...missedIds].sort());
      expect(await recordPracticeReview(tx, "ss.ohio-tribes", "2026-11-03", [{ factId: missedIds[0], correct: true }, { factId: missedIds[1], correct: false }, { factId: "bogus", correct: true }], NOV10)).toBe(2);
      const a = await tx.getReview(PRACTICE_FACT_TARGET, missedIds[0]);
      const b = await tx.getReview(PRACTICE_FACT_TARGET, missedIds[1]);
      expect(a!.box).toBe(1);
      expect(b!.lastResult).toBe("fail");
      expect(b!.lapses).toBe(1);
    });
    await recordEvents(repo, mae, { now: NOV10 + 1000, events: [{ type: "game_event", activityId: "ss.ohio-tribes", payload: { game_id: "practice-test", chapter_id: "ss.ohio-tribes", detail: "finished", mode: "review", score: 1, total: 2 } }] } as never);
    const after = (await todayPlan(repo, mae, null, NOV10 + 2000, noAi))!;
    expect(after.blocks.find((b) => b.id.startsWith("review:"))?.done).toBe(true);
  });

  it("stays out of the way during a test crunch", async () => {
    const plan = (await todayPlan(repo, mae, null, Date.parse("2026-11-06T15:00:00Z"), noAi))!;
    expect(plan.blocks.some((b) => b.id.startsWith("review:"))).toBe(false);
  });

  it("counts past-test chapters toward subject progress", async () => {
    const before = await progressSummary(repo, mae, NOV10, DEFAULT_UPCOMING);
    await finishFull(NOV3 - 3600_000, []);
    const after = await progressSummary(repo, mae, NOV10, DEFAULT_UPCOMING);
    const ring = (s: typeof after, id: string) => s.rings.find((r) => r.id === id)?.pct ?? 0;
    expect(ring(after, "subject:social")).toBeGreaterThan(ring(before, "subject:social"));
    expect(ring(after, "ss.ohio-tribes")).toBeGreaterThan(0);
  });

  it("admin rows show past tests in review with her last score", () => {
    const events = [{ type: "game_event", serverTs: NOV3 - 1000, isPreview: false, payload: { game_id: "practice-test", chapter_id: "ss.ohio-tribes", detail: "finished", mode: "full", score: 20, total: 25, missed: missedIds } }];
    const rows = buildPastTestRows(DEFAULT_UPCOMING, [], events, NOV10);
    const ohio = rows.find((r) => r.chapterId === "ss.ohio-tribes")!;
    expect(ohio.lastScore).toEqual({ right: 20, total: 25, at: NOV3 - 1000 });
    expect(ohio.dueNow).toBe(2);
    expect(rows.find((r) => r.chapterId === "savvas.ch3")!.lastScore).toBeNull();
  });
});
