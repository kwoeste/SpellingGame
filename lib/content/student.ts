import type { AppRole } from "@/lib/auth/allowlist";
import { seededShuffle } from "@/lib/content/shuffle";
import type { ChapterPack, Sentence } from "@/lib/content/types";
import { getRecap, toStudentRecap, type StudentRecap } from "@/lib/content/recaps";

export type StudentStep =
  | { kind: "vocab"; itemId: string; prompt: string; words: string[]; definitions: string[] }
  | { kind: "order"; itemId: string; prompt: string; cards: { id: string; label: string }[] }
  | { kind: "proof"; itemId: string; prompt: string; options: string[]; needsEvidence: boolean };

/** What the browser receives for a chapter: text and choices, never answers or wrong-answer feedback. */
export type StudentChapter = {
  id: string;
  number: number;
  titleKid: string;
  subject: ChapterPack["subject"];
  bigQuestion: string;
  storyHook: string | null;
  headerImage: string | null;
  keywords: { word: string; definition: string }[];
  pendingReligionReview: boolean;
  bibleTranslation: string | null;
  sentences: Sentence[];
  steps: StudentStep[];
  /** "Watch it" narrated picture recap shown before Careful Read, when the chapter has one. */
  recap: StudentRecap | null;
};

/** Religion content stays admin-only until Kevin (or the school) signs off on it. */
export function chapterVisibleTo(chapter: ChapterPack, role: AppRole): boolean {
  return role === "admin" || !chapter.pendingReligionReview;
}

export function toStudentChapter(chapter: ChapterPack): StudentChapter {
  const steps: StudentStep[] = chapter.items.map((item) => {
    switch (item.type) {
      case "drag_match":
        return {
          kind: "vocab",
          itemId: item.id,
          prompt: item.stem,
          words: chapter.vocab.map((card) => card.word),
          definitions: seededShuffle(
            chapter.vocab.map((card) => card.definition),
            item.id,
          ),
        };
      case "drag_order":
        return {
          kind: "order",
          itemId: item.id,
          prompt: item.stem,
          cards: seededShuffle(
            chapter.sequence.map((card) => ({ id: card.id, label: card.label })),
            item.id,
          ),
        };
      case "tap_evidence":
      case "mc":
      case "spell":
      case "cloze":
        return {
          kind: "proof",
          itemId: item.id,
          prompt: item.stem,
          options: item.options ?? [],
          needsEvidence: item.type === "tap_evidence" && Boolean(item.evidenceSentenceId),
        };
      default: {
        const unreachable: never = item.type;
        throw new Error(`Unhandled item type ${String(unreachable)}`);
      }
    }
  });
  return {
    id: chapter.id,
    number: chapter.number,
    titleKid: chapter.titleKid,
    subject: chapter.subject,
    bigQuestion: chapter.bigQuestion,
    storyHook: chapter.storyHook ?? null,
    headerImage: chapter.headerImage ?? null,
    keywords: chapter.vocab.map((v) => ({ word: v.word, definition: v.definition })),
    pendingReligionReview: Boolean(chapter.pendingReligionReview),
    bibleTranslation: chapter.bibleTranslation ?? null,
    sentences: chapter.sentences,
    steps,
    recap: toStudentRecap(getRecap(chapter.id)),
  };
}
