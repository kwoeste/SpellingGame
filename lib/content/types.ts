export type SubjectId = "math" | "science" | "ela" | "religion";

export type ReviewStatus = "draft" | "kevin_approved" | "pending_religion_review";

export type Sentence = { id: string; text: string };

export type VocabCard = {
  word: string;
  definition: string;
  sentenceId: string;
};

export type SequenceCard = {
  id: string;
  label: string;
  order: number;
};

export type ChapterItem = {
  id: string;
  activityId: string;
  templateId: string;
  conceptId: string;
  type: "mc" | "tap_evidence" | "drag_match" | "drag_order" | "spell" | "cloze";
  stem: string;
  options?: string[];
  answer: string | string[] | Record<string, string>;
  evidenceSentenceId?: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type ChapterPack = {
  id: string;
  book: "savvas" | "ckla" | "col";
  number: number;
  titleKid: string;
  unit?: string;
  subject: SubjectId;
  bigQuestion: string;
  storyHook?: string;
  headerImage?: string;
  reviewStatus: ReviewStatus;
  pendingReligionReview?: boolean;
  bibleTranslation?: string;
  provenance: {
    author: string;
    date: string;
    original: true;
    sourcesConsulted: string[];
  };
  chunks: { id: string; sentenceIds: string[] }[];
  sentences: Sentence[];
  vocab: VocabCard[];
  sequence: SequenceCard[];
  items: ChapterItem[];
  gameId?: string;
};
