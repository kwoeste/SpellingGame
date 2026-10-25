import { describe, expect, it } from "vitest";
import { chapterCount, listChapters, NAMED_GAMES } from "@/lib/content/catalog";

describe("chapter packs", () => {
  it("includes all original chapters plus math", () => {
    const counts = chapterCount();
    expect(counts).toEqual({ total: 51, savvas: 8, ckla: 9, col: 25, math: 9 });
    const nonMathChapters = listChapters().filter((c) => c.subject !== "math");
    const mathChapters = listChapters().filter((c) => c.subject === "math");
    for (const chapter of nonMathChapters) {
      expect(chapter.provenance.original).toBe(true);
      expect(chapter.sentences.length).toBeGreaterThan(1);
      expect(chapter.vocab.length).toBeGreaterThan(0);
      expect(chapter.sequence.length).toBeGreaterThan(2);
      expect(chapter.items.some((item) => item.type === "tap_evidence")).toBe(true);
      expect(JSON.stringify(chapter)).not.toMatch(/photocopy|scan of page|verbatim from the textbook/i);
    }
    for (const chapter of mathChapters) {
      expect(chapter.provenance.original).toBe(true);
      expect(chapter.sentences.length).toBeGreaterThan(0);
      expect(chapter.items.some((item) => item.type === "mc")).toBe(true);
    }
    expect(NAMED_GAMES).toHaveLength(13);
    // Kevin approved all religion content on 2026-10-25.
    const religion = listChapters().filter((c) => c.subject === "religion");
    expect(religion).toHaveLength(25);
    for (const c of religion) {
      expect(c.pendingReligionReview).toBe(false);
      expect(c.reviewStatus).toBe("kevin_approved");
      expect(c.bibleTranslation).toBeTruthy();
    }
    expect(listChapters().filter((c) => c.pendingReligionReview)).toHaveLength(0);
  });
});

const STOP = new Set(["what", "does", "that", "this", "with", "from", "they", "their", "them", "your", "about", "should", "which", "someone", "something", "there", "when", "into", "have", "only", "even"]);

function keyWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((word) => !STOP.has(word)).map((word) => word.slice(0, 5));
}

describe("proof questions", () => {
  const proofs = listChapters().flatMap((chapter) =>
    chapter.items.filter((item) => item.type === "tap_evidence").map((item) => ({ chapter, item })),
  );

  it("point at a proving sentence that exists and talks about the question", () => {
    for (const { chapter, item } of proofs) {
      const evidence = chapter.sentences.find((s) => s.id === item.evidenceSentenceId);
      expect(evidence, `${item.id} evidence`).toBeDefined();
      const proving = new Set(keyWords(evidence?.text ?? ""));
      const overlap = keyWords(`${item.stem} ${String(item.answer)}`).filter((word) => proving.has(word));
      expect(overlap.length, `${item.id}: "${evidence?.text}" does not prove "${item.answer}"`).toBeGreaterThan(0);
      expect(item.options).toContain(item.answer);
    }
  });

  it("do not cluster the right answer in one position", () => {
    const positions = new Map<number, number>();
    for (const { item } of proofs) {
      const pos = (item.options ?? []).indexOf(String(item.answer));
      positions.set(pos, (positions.get(pos) ?? 0) + 1);
    }
    expect(Math.max(...positions.values()) / proofs.length).toBeLessThan(0.6);
  });
});

describe("kid-appropriate wording", () => {
  it("keeps student-facing text free of graphic or scary words", () => {
    const banned = /\b(kill(ed|ing)?|blood(y)?|torture[d]?|gore|corpse|behead\w*|suicide|sex\w*|damn|hell(?!o)|stupid|idiot)\b/i;
    for (const chapter of listChapters()) {
      const text = [chapter.titleKid, chapter.bigQuestion, ...chapter.sentences.map((s) => s.text), ...chapter.items.flatMap((i) => [i.stem, ...(i.options ?? []), i.feedbackWrong])].join(" ");
      expect(text, chapter.id).not.toMatch(banned);
    }
  });
});
