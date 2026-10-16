import { describe, expect, it } from "vitest";
import { chapterCount, listChapters, NAMED_GAMES } from "@/lib/content/catalog";

describe("chapter packs", () => {
  it("includes all 42 original chapters", () => {
    const counts = chapterCount();
    expect(counts).toEqual({ total: 42, savvas: 8, ckla: 9, col: 25 });
    for (const chapter of listChapters()) {
      expect(chapter.provenance.original).toBe(true);
      expect(chapter.sentences.length).toBeGreaterThan(1);
      expect(chapter.vocab.length).toBeGreaterThan(0);
      expect(chapter.sequence.length).toBeGreaterThan(2);
      expect(chapter.items.some((item) => item.type === "tap_evidence")).toBe(true);
      expect(JSON.stringify(chapter)).not.toMatch(/photocopy|scan of page|verbatim from the textbook/i);
    }
    expect(NAMED_GAMES).toHaveLength(13);
    expect(listChapters().filter((c) => c.pendingReligionReview)).toHaveLength(25);
  });
});
