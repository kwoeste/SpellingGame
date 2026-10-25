import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WrongAnswerTable } from "@/app/admin/_ui/wrong-answers";
import { resolveAnswer, resolveCorrect } from "@/lib/admin/answer-text";
import { locateAdminItem } from "@/lib/admin/catalog";
import { buildWrongAnswers } from "@/lib/admin/dashboard";
import { demoSnapshot } from "@/lib/admin/demo-fixture";
import { NOT_ENOUGH_DATA, strategyLabel } from "@/lib/admin/strategy-labels";
import type { AdminEventRow } from "@/lib/engine/repo";

const seq = locateAdminItem("col.ch4.seq")!;
const cards = seq.chapter.sequence.map((c) => c.id);
const swapped = [cards[1], cards[0], ...cards.slice(2)];

function wrongEvent(itemId: string, response: unknown, correct: unknown, extra: Partial<AdminEventRow> = {}): AdminEventRow {
  const snap = demoSnapshot();
  const base = snap.events.find((e) => e.type === "answer_submitted")!;
  return {
    ...base,
    id: `evt-${itemId}`,
    itemId,
    isCorrect: false,
    attemptNo: 2,
    hintLevel: 0,
    latencyMs: 12000,
    response,
    payload: { item_stem: "x", chapter_id: itemId.split(".").slice(0, 2).join("."), correct_answer: JSON.stringify(correct) },
    isPreview: false,
    ...extra,
  } as AdminEventRow;
}

describe("answer text resolution", () => {
  it("turns sequence card ids into a numbered list of event text and marks wrong positions", () => {
    const her = resolveAnswer(swapped, seq, cards);
    expect(her.ordered).toBe(true);
    expect(her.lines.map((l) => l.text)).toEqual([seq.chapter.sequence[1]!.label, seq.chapter.sequence[0]!.label, ...seq.chapter.sequence.slice(2).map((c) => c.label)]);
    expect(her.lines.map((l) => l.wrong)).toEqual([true, true, ...cards.slice(2).map(() => false)]);
    expect(JSON.stringify(her)).not.toContain(".card.");
  });

  it("parses the JSON-string answer key stored in payloads", () => {
    const correct = resolveCorrect(JSON.stringify(cards), seq);
    expect(correct.ordered).toBe(true);
    expect(correct.lines[0]!.text).toBe(seq.chapter.sequence[0]!.label);
    const noCatalog = resolveCorrect(JSON.stringify(["a", "b"]), null);
    expect(noCatalog.lines.map((l) => l.text)).toEqual(["a", "b"]);
  });

  it("shows evidence choices with the proof sentence text, not a sentence id", () => {
    const q = locateAdminItem("col.ch1.q1")!;
    const wrongSentence = q.chapter.sentences.find((s) => s.id !== q.item.evidenceSentenceId)!;
    const her = resolveAnswer({ choice: q.item.answer, evidence: wrongSentence.id }, q, q.item.answer);
    expect(her.lines[0]).toEqual({ text: q.item.answer, wrong: false });
    expect(her.lines[1]!.text).toContain(wrongSentence.text);
    expect(her.lines[1]!.wrong).toBe(true);
  });

  it("marks swapped word meanings", () => {
    const v = locateAdminItem("col.ch6.vocab")!;
    const key = v.item.answer as Record<string, string>;
    const words = Object.keys(key);
    const resp = { ...key, [words[0]!]: key[words[1]!], [words[1]!]: key[words[0]!] };
    const her = resolveAnswer(resp, v, JSON.stringify(key));
    expect(her.lines.filter((l) => l.wrong)).toHaveLength(2);
  });
});

describe("strategy display", () => {
  it("never shows raw labels; unknown reads Not enough data yet", () => {
    expect(strategyLabel("unknown")).toBe(NOT_ENOUGH_DATA);
    expect(strategyLabel(null)).toBe(NOT_ENOUGH_DATA);
    expect(strategyLabel("skim_suspected")).toBe("Read too fast");
    expect(strategyLabel("my_custom_label")).toBe("My custom label");
  });

  it("ignores the engine's placeholder unknown and infers from the item type", () => {
    const snap = demoSnapshot();
    const event = wrongEvent("col.ch4.seq", swapped, cards);
    const view = buildWrongAnswers({
      ...snap,
      events: [event],
      strategies: [{ eventId: event.id, learnerId: snap.learnerId, conceptId: "col.ch4.sequence", strategy: "unknown", source: "inferred_rules", confidence: 0.3, misconception: null } as never],
    });
    expect(view.rows[0]!.strategy).toBe("order_mixup");
    expect(view.patterns[0]!.label).toBe("Mixed up the order");
    expect(view.rows[0]!.chapterLabel).toBe("Christ Our Life Ch 4");
    const html = renderToStaticMarkup(createElement(WrongAnswerTable, { data: view }));
    expect(html).not.toMatch(/inferred_rule|\.card\.|col\.ch4/);
    expect(html).toContain(seq.chapter.sequence[0]!.label.replace(/'/g, "&#x27;"));
    expect(html).toContain("Mixed up the order");
  });

  it("keeps a parent's label over inference", () => {
    const snap = demoSnapshot();
    const event = wrongEvent("col.ch4.seq", swapped, cards);
    const view = buildWrongAnswers({
      ...snap,
      events: [event],
      strategies: [{ eventId: event.id, learnerId: snap.learnerId, conceptId: "c", strategy: "guess", source: "admin_label", confidence: 1, misconception: null } as never],
    });
    expect(view.rows[0]!.strategy).toBe("guess");
    expect(view.rows[0]!.strategySource).toBe("admin_label");
  });
});
