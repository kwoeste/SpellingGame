import { formatAnswer } from "@/lib/admin/format";
import type { ChapterItem, ChapterPack } from "@/lib/content/types";

/** One line of a resolved answer, in plain words. `wrong` marks the parts she got wrong. */
export type AnswerLine = { text: string; wrong?: boolean };

/** A human-readable answer: `ordered` means show it as a numbered list (sequence items). */
export type ResolvedAnswer = { lines: AnswerLine[]; ordered: boolean };

/** Payloads store the answer key as a JSON string; parse it back when it looks like JSON. */
export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function cardText(chapter: ChapterPack | null, id: string): string {
  return chapter?.sequence.find((card) => card.id === id)?.label ?? "(an event card)";
}

function sentenceText(chapter: ChapterPack | null, id: string): string | null {
  return chapter?.sentences.find((s) => s.id === id)?.text ?? null;
}

function text(value: string): ResolvedAnswer {
  return { lines: [{ text: value }], ordered: false };
}

/**
 * Turn a stored response or answer key into the words she actually saw, never raw ids.
 * Pass `compareTo` (the correct answer) when resolving her answer so wrong parts get marked.
 */
export function resolveAnswer(
  value: unknown,
  located: { chapter: ChapterPack; item: ChapterItem } | null,
  compareTo?: unknown,
): ResolvedAnswer {
  const v = parseMaybeJson(value);
  const key = compareTo === undefined ? undefined : parseMaybeJson(compareTo);
  const chapter = located?.chapter ?? null;
  const type = located?.item.type;
  if (v === null || v === undefined || v === "") return text("—");

  // Sequence: a list of event-card ids.
  if (Array.isArray(v) && (type === "drag_order" || v.every((x) => typeof x === "string" && x.includes(".card.")))) {
    const keyList = Array.isArray(key) ? key : null;
    return {
      ordered: true,
      lines: v.map((id, idx) => ({
        text: typeof id === "string" ? cardText(chapter, id) : formatAnswer(id),
        wrong: keyList ? keyList[idx] !== id : undefined,
      })),
    };
  }

  // Evidence tap: { choice, evidence: sentenceId }.
  if (typeof v === "object" && !Array.isArray(v) && "choice" in (v as Record<string, unknown>)) {
    const rec = v as Record<string, unknown>;
    const choice = formatAnswer(rec.choice);
    const keyChoice = typeof key === "object" && key && "choice" in (key as object) ? formatAnswer((key as Record<string, unknown>).choice) : typeof key === "string" ? key : null;
    const lines: AnswerLine[] = [{ text: choice, wrong: keyChoice === null ? undefined : keyChoice !== choice }];
    if (typeof rec.evidence === "string") {
      const proof = sentenceText(chapter, rec.evidence);
      const wrongProof = located?.item.evidenceSentenceId ? located.item.evidenceSentenceId !== rec.evidence : undefined;
      lines.push({ text: `Proof she tapped: “${proof ?? "a sentence"}”`, wrong: compareTo === undefined ? undefined : wrongProof });
    }
    return { lines, ordered: false };
  }

  // Word match: { word: meaning }.
  if (typeof v === "object" && !Array.isArray(v)) {
    const keyRec = typeof key === "object" && key && !Array.isArray(key) ? (key as Record<string, unknown>) : null;
    return {
      ordered: false,
      lines: Object.entries(v as Record<string, unknown>).map(([word, meaning]) => ({
        text: `${word} → ${formatAnswer(meaning)}`,
        wrong: keyRec ? keyRec[word] !== meaning : undefined,
      })),
    };
  }

  if (Array.isArray(v)) return { lines: v.map((part) => ({ text: formatAnswer(part) })), ordered: false };
  return text(formatAnswer(v));
}

/** The correct answer as words. For evidence items, include the proof sentence. */
export function resolveCorrect(
  payloadCorrect: unknown,
  located: { chapter: ChapterPack; item: ChapterItem } | null,
): ResolvedAnswer {
  const item = located?.item;
  const base = resolveAnswer(item ? item.answer : payloadCorrect, located);
  if (item?.type === "tap_evidence" && item.evidenceSentenceId) {
    const proof = sentenceText(located!.chapter, item.evidenceSentenceId);
    if (proof) base.lines.push({ text: `Proof: “${proof}”` });
  }
  if (!item && (payloadCorrect === null || payloadCorrect === undefined)) return text("—");
  return base;
}

export function answerToPlain(answer: ResolvedAnswer): string {
  return answer.lines.map((line, idx) => (answer.ordered ? `${idx + 1}. ${line.text}` : line.text)).join("; ");
}
