import { seededShuffle, shortHash } from "@/lib/content/shuffle";
import type { ChapterItem, ChapterPack, ReviewStatus, SubjectId } from "@/lib/content/types";

export type CompactChapter = {
  id: string;
  book: ChapterPack["book"];
  number: number;
  titleKid: string;
  unit?: string;
  subject: SubjectId;
  bigQuestion: string;
  storyHook?: string;
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
  const vocab = compact.vocab.map((card) => ({
    word: card.word,
    definition: card.definition,
    sentenceId: vocabSentenceId(card, sentences),
  }));
  const sequence = compact.sequence.map((label, idx) => ({
    id: `${compact.id}.card.${shortHash(`${compact.id}:${label}`)}`,
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
    answer: sequence.map((card) => card.id),
    feedbackCorrect: "That's the right order.",
    feedbackWrong: "Not yet. Think about what happened first, next, and last.",
  });
  compact.proofs.forEach((proof, idx) => {
    const evidence = sentences[proof.evidence];
    const id = `${compact.id}.q${idx + 1}`;
    items.push({
      id,
      activityId: `${compact.id}.check`,
      templateId: "ela.evidence_tap",
      conceptId: `${compact.id}.knowledge`,
      type: "tap_evidence",
      stem: proof.stem,
      options: seededShuffle(proof.options, id),
      answer: proof.options[proof.answer] ?? "",
      evidenceSentenceId: evidence?.id,
      feedbackCorrect: "Yes — that sentence proves it.",
      feedbackWrong: proof.why,
    });
  });
  // Kevin approved all religion content on 2026-10-25 ("Approve religion."). New religion content that
  // needs review can set pendingReligionReview again; the gating in chapterVisibleTo still applies.
  const reviewStatus: ReviewStatus = compact.religion ? "kevin_approved" : "draft";
  return {
    id: compact.id,
    book: compact.book,
    number: compact.number,
    titleKid: compact.titleKid,
    unit: compact.unit,
    subject: compact.subject,
    bigQuestion: compact.bigQuestion,
    storyHook: compact.storyHook,
    reviewStatus,
    pendingReligionReview: false,
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

const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "with", "that", "is", "it", "you", "we", "us", "our", "for", "by", "from", "when", "what", "how", "its", "your"]);

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

/** Loose stem match so "tactic" finds "tactics", "loyal" finds "loyalty", "enclose" finds "enclosed". */
function stemMatches(term: string, token: string): boolean {
  if (term === token) return true;
  const stem = term.length > 5 ? term.slice(0, term.length - 2) : term;
  return stem.length >= 4 && token.startsWith(stem);
}

/**
 * Link a vocab card to the sentence that actually uses the word (all words of a multi-word term,
 * e.g. "Lord's Prayer"). If the word never appears, fall back to the sentence that best matches the
 * definition, then to the first sentence.
 */
export function vocabSentenceId(card: { word: string; definition: string }, sentences: { id: string; text: string }[]): string {
  const termWords = tokens(card.word).filter((w) => w.length > 1 && w !== "s");
  const uses = sentences.filter((s) => {
    const toks = tokens(s.text);
    return termWords.every((w) => toks.some((t) => stemMatches(w, t)));
  });
  const defWords = tokens(card.definition).filter((w) => !STOP.has(w) && w.length > 2);
  const overlap = (text: string) => {
    const toks = tokens(text);
    return defWords.filter((w) => toks.some((t) => stemMatches(w, t))).length;
  };
  if (uses.length) {
    // Prefer the sentence that defines the word: it opens with the word ("Heat moves…", "An insulator…"),
    // then the one that shares the most words with the definition.
    const opensWith = (text: string) => {
      const toks = tokens(text).filter((t) => !["a", "an", "the", "to"].includes(t));
      return toks.length > 0 && stemMatches(termWords[0], toks[0]);
    };
    let best = uses[0];
    let bestScore = -1;
    for (const s of uses) {
      const score = (opensWith(s.text) ? 10 : 0) + overlap(s.text);
      if (score > bestScore) {
        best = s;
        bestScore = score;
      }
    }
    return best.id;
  }
  let best = sentences[0];
  let bestScore = 0;
  for (const s of sentences) {
    const score = overlap(s.text);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best?.id ?? "";
}
