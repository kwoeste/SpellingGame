export type PracticeKind = "blank" | "list" | "match" | "choice";

export type PracticeFact = {
  id: string;
  lesson: number;
  kind?: PracticeKind;
  /** Accepted forms per blank / list slot / match row. First form is the taught spelling. */
  answers: string[][];
  phrasings: string[];
  /** Blanks may be filled in either order. */
  anyOrder?: boolean;
  /** Offer a tap-to-fill word bank on some attempts ("always" = every attempt). */
  wordBank?: boolean | "always";
  /** Multiple choice options (kind "choice"); answers[0][0] is the right one. */
  options?: string[];
  /** Short kind explanation shown after she answers (or after Show me). */
  why?: string;
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

export type PracticeBankIntro = { heading: string; body: string };

export type SlotResult = { correct: boolean; exact: boolean; expected: string };

export type GradeResult = {
  correct: boolean;
  /** Every slot spelled exactly. */
  exact: boolean;
  slots: SlotResult[];
};
