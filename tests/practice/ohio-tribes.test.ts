import { describe, expect, it } from "vitest";
import { bankSize, buildAttempt, gradeQuestion, practiceBank, practiceHelp, practiceWhy } from "@/lib/practice/bank";
import { activeUpcomingTests, DEFAULT_UPCOMING } from "@/lib/practice/upcoming";
import { getChapter } from "@/lib/content/catalog";

const CH = "ss.ohio-tribes";
const bank = practiceBank(CH)!;

describe("Ohio tribes practice test", () => {
  it("has a visible chapter and 20-30 questions of every type", () => {
    expect(getChapter(CH)?.subject).toBe("social");
    expect(bank.facts.length).toBeGreaterThanOrEqual(20);
    expect(bank.facts.length).toBeLessThanOrEqual(30);
    expect(bankSize(CH)).toBeGreaterThanOrEqual(bank.facts.length);
    const kinds = new Set(bank.facts.map((f) => f.kind ?? "blank"));
    for (const k of ["blank", "choice", "match", "list"]) expect(kinds.has(k as never)).toBe(true);
  });
  it("every question has an explanation and a valid answer", () => {
    for (const f of bank.facts) {
      expect(f.why, f.id).toBeTruthy();
      if (f.kind === "choice") expect(f.options, f.id).toContain(f.answers[0][0]);
      const r = gradeQuestion(`${f.id}~0~w`, f.answers.map((a) => a[0]));
      expect(r?.correct, f.id).toBe(true);
      expect(practiceWhy(`${f.id}~0~b`)).toBe(f.why);
    }
  });
  it("multiple choice is exact (no typo credit)", () => {
    expect(gradeQuestion("m-mingo~0~b", ["western"])?.correct).toBe(false);
    expect(gradeQuestion("m-toledo~0~b", ["Ottawa"])?.correct).toBe(true);
  });
  it("word-bank blanks always show a bank with the answer and choices never leak the answer field", () => {
    const qs = buildAttempt(CH, "seed-1");
    expect(qs).toHaveLength(bank.facts.length);
    for (const q of qs) {
      const f = bank.facts.find((x) => x.id === q.factId)!;
      if (f.wordBank === "always") {
        expect(q.wordBank).toContain(f.answers[0][0]);
        expect(q.wordBank!.length).toBeGreaterThanOrEqual(3);
      }
      if (q.kind === "choice") expect(q.choices).toEqual(expect.arrayContaining(f.options!));
      expect(JSON.stringify(q)).not.toContain("\"answers\"");
    }
  });
  it("retakes shuffle", () => {
    const a = buildAttempt(CH, "a").map((q) => q.factId).join();
    const b = buildAttempt(CH, "b").map((q) => q.factId).join();
    expect(a).not.toBe(b);
  });
  it("Show me uses the kind explanation", () => {
    expect(practiceHelp("c-enemies~0~b", 9)?.reveal?.why).toContain("Wyandot and Seneca");
  });
  it("is first on the plan tonight, before spelling D-2", () => {
    const active = activeUpcomingTests(Date.parse("2026-11-02T23:30:00Z"), DEFAULT_UPCOMING);
    expect(active.map((t) => t.refId)).toEqual(["ss.ohio-tribes", "spelling-d2"]);
  });
});
