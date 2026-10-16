import type { ChapterItem, ChapterPack, ReviewStatus, SubjectId } from "@/lib/content/types";

export type CompactChapter = {
  id: string;
  book: ChapterPack["book"];
  number: number;
  titleKid: string;
  unit?: string;
  subject: SubjectId;
  bigQuestion: string;
  paragraphs: string[];
  vocab: { word: string; definition: string }[];
  sequence: string[];
  proofs: { stem: string; options: string[]; answer: number; evidence: number; why: string }[];
  gameId?: string;
  religion?: boolean;
};

export function bibleTranslation(): string {
  return process.env.BIBLE_TRANSLATION || "NABRE";
}

export function buildChapter(compact: CompactChapter): ChapterPack {
  const sentences = compact.paragraphs.flatMap((paragraph, pIdx) =>
    splitSentences(paragraph).map((text, sIdx) => ({
      id: `${compact.id}.s${pIdx + 1}.${sIdx + 1}`,
      text,
    })),
  );
  const chunks = compact.paragraphs.map((_, pIdx) => ({
    id: `${compact.id}.chunk${pIdx + 1}`,
    sentenceIds: sentences.filter((s) => s.id.startsWith(`${compact.id}.s${pIdx + 1}.`)).map((s) => s.id),
  }));
  const vocab = compact.vocab.map((card, idx) => ({
    word: card.word,
    definition: card.definition,
    sentenceId: sentences[Math.min(idx, sentences.length - 1)]?.id ?? sentences[0]?.id ?? "",
  }));
  const sequence = compact.sequence.map((label, idx) => ({
    id: `${compact.id}.seq${idx + 1}`,
    label,
    order: idx + 1,
  }));
  const items: ChapterItem[] = [];
  items.push({
    id: `${compact.id}.vocab`,
    activityId: `${compact.id}.practice`,
    templateId: "ela.vocab_match",
    conceptId: `${compact.id}.vocab`,
    type: "drag_match",
    stem: "Match each word to its meaning.",
    answer: Object.fromEntries(compact.vocab.map((v) => [v.word, v.definition])),
    feedbackCorrect: "Yes! Those meanings fit the words.",
    feedbackWrong: "Not yet. Read the sentence that uses the word, then try again.",
  });
  items.push({
    id: `${compact.id}.seq`,
    activityId: `${compact.id}.practice`,
    templateId: "ela.sequence",
    conceptId: `${compact.id}.sequence`,
    type: "drag_order",
    stem: "Put the events in the order they happen.",
    options: compact.sequence,
    answer: sequence.map((card) => card.id),
    feedbackCorrect: "That's the right order.",
    feedbackWrong: "Not yet. Think about what happened first, next, and last.",
  });
  compact.proofs.forEach((proof, idx) => {
    const evidence = sentences[proof.evidence];
    items.push({
      id: `${compact.id}.q${idx + 1}`,
      activityId: `${compact.id}.check`,
      templateId: "ela.evidence_tap",
      conceptId: `${compact.id}.knowledge`,
      type: "tap_evidence",
      stem: proof.stem,
      options: proof.options,
      answer: proof.options[proof.answer] ?? "",
      evidenceSentenceId: evidence?.id,
      feedbackCorrect: "Yes — that sentence proves it.",
      feedbackWrong: proof.why,
    });
  });
  const reviewStatus: ReviewStatus = compact.religion ? "pending_religion_review" : "draft";
  return {
    id: compact.id,
    book: compact.book,
    number: compact.number,
    titleKid: compact.titleKid,
    unit: compact.unit,
    subject: compact.subject,
    bigQuestion: compact.bigQuestion,
    reviewStatus,
    pendingReligionReview: compact.religion,
    bibleTranslation: compact.religion ? bibleTranslation() : undefined,
    provenance: {
      author: "Mae Site original summaries",
      date: "2026-10-16",
      original: true,
      sourcesConsulted: ["our research notes on topics and vocabulary only — no textbook text"],
    },
    chunks,
    sentences,
    vocab,
    sequence,
    items,
    gameId: compact.gameId,
  };
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
