import type { ChapterItem, ChapterPack } from "@/lib/content/types";
import { eliminateChoices, helpStage, type StuckHelp } from "@/lib/help/ladder";

const strip = (text: string) => text.replace(/^(Yes!|Yes —|Not yet\.)\s*/i, "").trim();

function sentenceText(chapter: ChapterPack, id: string | undefined): string | null {
  return id ? (chapter.sentences.find((s) => s.id === id)?.text ?? null) : null;
}

/**
 * Server-side help for a chapter step after `misses` wrong tries. Returns null before HINT_AT_MISS.
 * Hints reuse the item's own feedback text and evidence sentence; nothing is invented.
 */
export function chapterItemHelp(chapter: ChapterPack, item: ChapterItem, misses: number): StuckHelp | null {
  const stage = helpStage(misses);
  if (stage === "none") return null;
  const help = baseHelp(chapter, item);
  if (stage === "show_me") return { ...help, stage, reveal: reveal(chapter, item) };
  return { ...help, stage };
}

function baseHelp(chapter: ChapterPack, item: ChapterItem): Omit<StuckHelp, "stage"> {
  switch (item.type) {
    case "drag_match": {
      const pairs = Object.entries((item.answer as Record<string, string>) ?? {});
      const give = pairs.slice(0, Math.max(1, Math.floor(pairs.length / 2)));
      const lockMatches = Object.fromEntries(give);
      const clue = give.map(([w, d]) => `"${w}" means "${d}".`).join(" ");
      return { hint: `${clue} I put ${give.length === 1 ? "that one" : "those"} in for you. Match the rest.`, lockMatches };
    }
    case "drag_order": {
      const ids = Array.isArray(item.answer) ? (item.answer as string[]) : [];
      const label = (id: string | undefined) => chapter.sequence.find((c) => c.id === id)?.label ?? "";
      const first = ids[0];
      const last = ids[ids.length - 1];
      return {
        hint: `First: "${label(first)}". Last: "${label(last)}". Put the middle ones in between.`,
        lockOrder: { first, last },
      };
    }
    default: {
      const answer = String(item.answer);
      const removeChoices = item.options ? eliminateChoices(item.options, answer, 1, item.id) : undefined;
      const evidence = sentenceText(chapter, item.evidenceSentenceId);
      const clue = strip(item.feedbackWrong);
      const hint = evidence
        ? `Read the glowing sentence: "${evidence}" ${removeChoices?.length ? "Now pick from the two answers left." : ""}`.trim()
        : `${clue}${removeChoices?.length ? " Now pick from the two answers left." : ""}`.trim();
      return { hint, removeChoices, highlightSentenceId: item.evidenceSentenceId };
    }
  }
}

function reveal(chapter: ChapterPack, item: ChapterItem): NonNullable<StuckHelp["reveal"]> {
  switch (item.type) {
    case "drag_match": {
      const answer = item.answer as Record<string, string>;
      return {
        answer: Object.entries(answer).map(([w, d]) => `${w} = ${d}`).join("; "),
        why: "Each word goes with the meaning that fits its sentence in the story.",
        response: answer,
      };
    }
    case "drag_order": {
      const ids = item.answer as string[];
      const labels = ids.map((id) => chapter.sequence.find((c) => c.id === id)?.label ?? id);
      return { answer: labels.map((l, i) => `${i + 1}. ${l}`).join("  "), why: "That is the order it happens in the story.", response: ids };
    }
    case "tap_evidence": {
      const evidence = sentenceText(chapter, item.evidenceSentenceId);
      return {
        answer: `The answer is "${String(item.answer)}".${evidence ? ` Proof: "${evidence}"` : ""}`,
        why: strip(item.feedbackWrong),
        response: { choice: item.answer, evidence: item.evidenceSentenceId },
      };
    }
    default:
      return { answer: `The answer is "${String(item.answer)}".`, why: strip(item.feedbackCorrect) || strip(item.feedbackWrong), response: { choice: item.answer } };
  }
}
