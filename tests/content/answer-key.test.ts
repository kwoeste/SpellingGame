import { describe, expect, it } from "vitest";
import { listChapters } from "@/lib/content/catalog";
import { NAMED_GAMES } from "@/lib/content/catalog";
import { gameSpec, type GameId } from "@/lib/content/games";
import { SPELLING_LISTS } from "@/lib/games/spelling-lists";

describe("answer keys", () => {
  const chapters = listChapters();

  it("every multiplication fact is computed correctly with four unique options", () => {
    let checked = 0;
    for (const ch of chapters) {
      for (const item of ch.items.filter((i) => i.templateId === "math.mult_fact")) {
        const m = item.stem.match(/^What is (\d+) × (\d+)\?$/);
        expect(m, item.id).not.toBeNull();
        const product = Number(m![1]) * Number(m![2]);
        const opts = item.options!.map(Number);
        expect(item.answer, item.id).toBe(String(product));
        expect(opts.filter((o) => o === product), item.id).toHaveLength(1);
        expect(new Set(opts).size, item.id).toBe(4);
        expect(opts.every((o) => Number.isInteger(o) && o > 0), item.id).toBe(true);
        expect(item.feedbackCorrect).toContain(`= ${product}`);
        checked++;
      }
    }
    expect(checked).toBe(45);
  });

  it("every evidence question has its answer exactly once and a real evidence sentence", () => {
    for (const ch of chapters) {
      for (const item of ch.items.filter((i) => i.type === "tap_evidence")) {
        expect(item.options!.filter((o) => o === item.answer), item.id).toHaveLength(1);
        expect(new Set(item.options).size, item.id).toBe(item.options!.length);
        expect(ch.sentences.some((s) => s.id === item.evidenceSentenceId), item.id).toBe(true);
      }
    }
  });

  it("no sentence silently swallows a second sentence (split failure after a closing quote)", () => {
    for (const ch of chapters) {
      for (const s of ch.sentences) {
        expect(/[.!?][”"’]\s+[A-Z]/.test(s.text), s.id).toBe(false);
      }
    }
  });

  it("every game item lands in a declared bin and every bin is used", () => {
    for (const game of NAMED_GAMES) {
      const spec = gameSpec(game.id as GameId);
      for (const item of spec.items) expect(spec.bins, `${game.id}: ${item.label}`).toContain(item.bin);
      for (const bin of spec.bins) expect(spec.items.some((i) => i.bin === bin), `${game.id}: ${bin}`).toBe(true);
    }
  });

  it("every spelling word has a sentence that uses it", () => {
    for (const list of SPELLING_LISTS) {
      expect(new Set(list.words).size, list.id).toBe(list.words.length);
      for (const word of list.words) {
        const sentence = list.sentences[word];
        expect(sentence, `${list.id}: ${word}`).toBeTruthy();
        expect(sentence.toLowerCase(), `${list.id}: ${word}`).toContain(word.toLowerCase());
      }
    }
  });
});

describe("vocab links", () => {
  const stem = (w: string) => (w.length > 5 ? w.slice(0, -2) : w);
  it("each vocab word links to a sentence that uses it whenever the word appears in the chapter", () => {
    let linked = 0;
    for (const ch of listChapters()) {
      for (const card of ch.vocab) {
        const parts = card.word.toLowerCase().match(/[a-z]+/g)!.filter((w) => w.length > 1 && w !== "s");
        const uses = (text: string) => {
          const toks = text.toLowerCase().match(/[a-z]+/g) ?? [];
          return parts.every((p) => toks.some((t) => t === p || (stem(p).length >= 4 && t.startsWith(stem(p)))));
        };
        const linkedSentence = ch.sentences.find((s) => s.id === card.sentenceId);
        expect(linkedSentence, `${ch.id}: ${card.word}`).toBeTruthy();
        if (ch.sentences.some((s) => uses(s.text))) {
          expect(uses(linkedSentence!.text), `${ch.id}: ${card.word} -> ${linkedSentence!.text}`).toBe(true);
          linked++;
        }
      }
    }
    expect(linked).toBeGreaterThan(100);
  });

  it("links regression: savvas ch1 'data' no longer points at the first sentence by position", () => {
    const ch = listChapters().find((c) => c.id === "savvas.ch1")!;
    const card = ch.vocab.find((v) => v.word === "data")!;
    expect(ch.sentences.find((s) => s.id === card.sentenceId)!.text).toMatch(/data/);
  });
});
