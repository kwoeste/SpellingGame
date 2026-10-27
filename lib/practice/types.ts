export type PracticeKind = "blank" | "list" | "match";

export type PracticeFact = {
  id: string;
  lesson: number;
  kind?: PracticeKind;
  /** Accepted forms per blank / list slot / match row. First form is the taught spelling. */
  answers: string[][];
  phrasings: string[];
  /** Blanks may be filled in either order. */
  anyOrder?: boolean;
  /** Offer a tap-to-fill word bank on some attempts. */
  wordBank?: boolean;
  /** Match rows (definitions); answers[i][0] is the word for row i. */
  prompts?: string[];
};

/** What the student page receives: no answers. */
export type StudentQuestion = {
  qid: string;
  factId: string;
  lesson: number;
  kind: PracticeKind;
  text: string;
  slots: number;
  wordBank?: string[];
  prompts?: string[];
  choices?: string[];
};

export type SlotResult = { correct: boolean; exact: boolean; expected: string };

export type GradeResult = {
  correct: boolean;
  /** Every slot spelled exactly. */
  exact: boolean;
  slots: SlotResult[];
};
