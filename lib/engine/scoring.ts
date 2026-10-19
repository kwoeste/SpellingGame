import type { ChapterItem, ChapterPack, Sentence } from "@/lib/content/types";

export type ScoreResult = {
  correct: boolean;
  explanation: string;
  proving: Sentence | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function norm(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/** Server-side scoring. The client never decides correctness. */
export function scoreItem(chapter: ChapterPack, item: ChapterItem, response: unknown): ScoreResult {
  const proving = item.evidenceSentenceId
    ? (chapter.sentences.find((s) => s.id === item.evidenceSentenceId) ?? null)
    : null;
  switch (item.type) {
    case "drag_match": {
      const expected = asRecord(item.answer) ?? {};
      const got = asRecord(response) ?? {};
      const correct = Object.entries(expected).every(([word, definition]) => got[word] === definition);
      return { correct, explanation: correct ? item.feedbackCorrect : item.feedbackWrong, proving: null };
    }
    case "drag_order": {
      const expected = Array.isArray(item.answer) ? item.answer : [];
      const got = Array.isArray(response) ? response : [];
      const correct = got.length === expected.length && expected.every((id, idx) => got[idx] === id);
      return { correct, explanation: correct ? item.feedbackCorrect : item.feedbackWrong, proving: null };
    }
    case "tap_evidence": {
      const got = asRecord(response) ?? {};
      const choiceRight = got.choice === item.answer;
      const evidenceRight = !item.evidenceSentenceId || got.evidence === item.evidenceSentenceId;
      if (choiceRight && evidenceRight) return { correct: true, explanation: item.feedbackCorrect, proving };
      const explanation = choiceRight
        ? "Good answer! Now find the sentence that proves it."
        : item.feedbackWrong;
      return {
        correct: false,
        explanation: proving ? `${explanation} Listen: ${proving.text}` : explanation,
        proving,
      };
    }
    case "mc":
    case "spell":
    case "cloze": {
      const got = asRecord(response)?.choice ?? response;
      const correct = norm(got) === norm(item.answer);
      return { correct, explanation: correct ? item.feedbackCorrect : item.feedbackWrong, proving };
    }
    default: {
      const unreachable: never = item.type;
      throw new Error(`Unhandled item type ${String(unreachable)}`);
    }
  }
}
