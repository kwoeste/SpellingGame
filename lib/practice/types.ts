export type PracticeKind = "blank" | "list" | "match" | "choice" | "tap" | "spell";

/** Spelling-test formats reused for colony names. "choice" here means pick the right spelling. */
export const SPELL_FORMATS = ["listen", "blanks", "choice", "sentence", "scramble"] as const;
export type SpellFormatName = (typeof SPELL_FORMATS)[number];

export function isSpellFormat(value: string | undefined): value is SpellFormatName {
  return !!value && (SPELL_FORMATS as readonly string[]).includes(value);
}

export type ColonyActivity = "sort" | "map-name" | "map-tap" | "spell";

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
  /** Colonies pack only. Tells the practice page which activity to draw. */
  activity?: ColonyActivity;
  /** Colony name shown on a sort card or a tap prompt. Not the region answer. */
  card?: string;
  /** Shape to light up for "name this colony". Never set on tap questions. */
  highlightId?: string;
  /** Typed answers must match the spelling (map names and colony spelling). */
  exactOnly?: boolean;
  /** Near-miss spelling used to build the pick-the-spelling choices. */
  oops?: string;
  /** Missing-letter bias, counted on the colony name. */
  trickyAt?: number;
  trickyLen?: number;
  /** Show the compass rose beside a direction question. */
  compass?: boolean;
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
  activity?: ColonyActivity;
  card?: string;
  highlightId?: string;
  spellFormat?: SpellFormatName;
  /** Missing-letter view. Empty string is a box she fills. */
  shown?: string[];
  /** Unscramble tiles. A single space is the gap between words. */
  tiles?: string[];
  /** Hear-and-type only. */
  clip?: string;
  compass?: boolean;
};

export type PracticeBankIntro = { heading: string; body: string };

export type SlotResult = { correct: boolean; exact: boolean; expected: string };

export type GradeResult = {
  correct: boolean;
  /** Every slot spelled exactly. */
  exact: boolean;
  slots: SlotResult[];
};
