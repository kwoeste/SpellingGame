import { beforeEach, describe, expect, it, vi } from "vitest";
import { editDistance, gradeSlot, normalizeAnswer } from "@/lib/practice/grade";
import { bankSize, buildAttempt, gradeQuestion, practiceBank, practiceHelp } from "@/lib/practice/bank";
import { activeUpcomingTest } from "@/lib/practice/upcoming";
import { decideRequest } from "@/lib/auth/decide";
import { memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { todayPlan } from "@/lib/engine/plan";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const CH = "savvas.ch3";
const facts = practiceBank(CH)!.facts;
const fact = (id: string) => facts.find((f) => f.id === id)!;
const qidFor = (id: string, mode: "b" | "w" = "b") => `${id}~0~${mode}`;

describe("grading", () => {
  it("normalizes case, punctuation and articles", () => {
    expect(normalizeAnswer("  The Vertebrates! ")).toBe("vertebrates");
  });
  it("accepts close spellings on long words but flags them", () => {
    const r = gradeSlot("vertebrats", ["vertebrates"]);
    expect(r.correct).toBe(true);
    expect(r.exact).toBe(false);
    expect(r.expected).toBe("vertebrates");
  });
  it("is strict on short words", () => {
    expect(gradeSlot("fur", ["fur"]).exact).toBe(true);
    expect(gradeSlot("far", ["fur"]).correct).toBe(false);
  });
  it("rejects far-off answers", () => {
    expect(gradeSlot("mammals", ["vertebrates"]).correct).toBe(false);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
  it("accepts any listed alternate", () => {
    const f = facts.find((x) => x.answers.some((slot) => slot.length > 1))!;
    const slotIdx = f.answers.findIndex((s) => s.length > 1);
    const responses = f.answers.map((s) => s[0]);
    responses[slotIdx] = f.answers[slotIdx][1];
    expect(gradeQuestion(qidFor(f.id), responses).correct).toBe(true);
  });
  it("grades the vertebrate list in any order", () => {
    const f = fact("l1-groups");
    const answers = f.answers.map((s) => s[0]).reverse();
    expect(gradeQuestion(qidFor(f.id), answers).correct).toBe(true);
    const wrong = [...answers];
    wrong[0] = "insects";
    expect(gradeQuestion(qidFor(f.id), wrong).correct).toBe(false);
  });
  it("grades the instinct examples in any order", () => {
    const f = fact("l4-examples");
    expect(gradeQuestion(qidFor(f.id), f.answers.map((s) => s[0]).reverse()).correct).toBe(true);
  });
  it("grades matching exactly", () => {
    const f = fact("l1-match");
    expect(gradeQuestion(qidFor(f.id), f.answers.map((s) => s[0])).correct).toBe(true);
    expect(gradeQuestion(qidFor(f.id), f.answers.map((s) => s[0]).reverse()).correct).toBe(false);
  });
});

describe("help ladder", () => {
  it("gives nothing before 4 misses, a hint at 4, and the answer at 5", () => {
    const q = qidFor(facts[0].id);
    for (const m of [0, 1, 2, 3]) expect(practiceHelp(q, m)).toBeNull();
    expect(practiceHelp(q, 4)?.stage).toBe("hint");
    expect(practiceHelp(q, 5)?.stage).toBe("show_me");
  });
});

describe("attempts", () => {
  it("covers the whole bank, hides answers, and shuffles per seed", () => {
    const a = buildAttempt(CH, "s1")!;
    const b = buildAttempt(CH, "s2")!;
    expect(a.length).toBe(facts.length);
    expect(JSON.stringify(a)).not.toContain('"answers"');
    expect(a.map((q) => q.qid).join()).not.toBe(b.map((q) => q.qid).join());
    expect(a.map((q) => q.lesson)).toEqual([...a.map((q) => q.lesson)].sort());
    expect(bankSize(CH)).toBeGreaterThan(facts.length * 1.5);
  });
  it("can rebuild just the missed facts", () => {
    const a = buildAttempt(CH, "s3", ["l1-groups", "l4-examples"])!;
    expect(a.map((q) => q.factId).sort()).toEqual(["l1-groups", "l4-examples"]);
  });
});

describe("test date and Today plan", () => {
  beforeEach(() => resetMemoryRepo());
  const mae = { role: "student" as const, learnerId: SEEDED_LEARNER_ID };
  it("is active through test day only", () => {
    expect(activeUpcomingTest(Date.parse("2026-10-27T23:00:00Z"))?.isTestDay).toBe(false);
    expect(activeUpcomingTest(Date.parse("2026-10-28T12:00:00Z"))?.isTestDay).toBe(true);
    expect(activeUpcomingTest(Date.parse("2026-10-29T16:00:00Z"))).toBeNull();
  });
  it("puts the practice test first on 10/27 and the retry first on 10/28", async () => {
    const ai = vi.fn(async (f: { candidates: { id: string; locked?: boolean }[] }) => ({ order: f.candidates.filter((c) => !c.locked).map((c) => c.id).reverse(), why_kid: "ok", admin_note: "ok" }));
    const tue = await todayPlan(memoryEngineRepo, mae, null, Date.parse("2026-10-27T22:00:00Z"), { ai: ai as never });
    expect(tue?.blocks[0].href).toBe("/study/savvas.ch3/practice-test");
    expect(tue?.blocks[0].done).toBe(false);
    resetMemoryRepo();
    const wed = await todayPlan(memoryEngineRepo, mae, null, Date.parse("2026-10-28T11:00:00Z"), { ai: ai as never });
    expect(wed?.blocks[0].href).toBe("/study/savvas.ch3/practice-test?mode=retry");
  });
});

describe("gating", () => {
  it("keeps the practice test behind sign-in", () => {
    expect(decideRequest({ pathname: "/study/savvas.ch3/practice-test", hasSession: false, role: null }).kind).toBe("redirect-signin");
    expect(decideRequest({ pathname: "/api/engine/practice-test", hasSession: false, role: null }).kind).toBe("unauthorized");
  });
});
