/**
 * The stuck-help ladder, shared by every activity that has a right answer.
 *
 * Misses 1..3: the normal gentle "try again" only.
 * Miss HINT_AT_MISS: one strong hint (highlight, remove wrong choices, show letters, read slowly).
 * Miss SHOW_ME_AT_MISS and later: a big "Show me" button (after a short pause) plus "Skip for now".
 * Reaching HINT_AT_MISS means "not learned yet": the engine re-queues the item for a re-teach.
 *
 * Pure and client-safe: no content or answers live here.
 */
export const HINT_AT_MISS = 4;
export const SHOW_ME_AT_MISS = 5;
/** Show me unlocks after this pause so it is not tapped by reflex. */
export const SHOW_ME_PAUSE_MS = 3000;
/** hintLevel recorded on the answer event: 2 = answered after the strong hint, 3 = answered after Show me. */
export const HINT_LEVEL_HINTED = 2;
export const HINT_LEVEL_REVEALED = 3;

export type HelpStage = "none" | "hint" | "show_me";

export function helpStage(misses: number): HelpStage {
  if (!Number.isFinite(misses) || misses < HINT_AT_MISS) return "none";
  return misses >= SHOW_ME_AT_MISS ? "show_me" : "hint";
}

/** True once the item counts as "not learned yet" and needs a re-teach. */
export function needsReteach(misses: number): boolean {
  return helpStage(misses) !== "none";
}

/** hintLevel to record with the next answer, given the help she has seen. */
export function hintLevelFor(stage: HelpStage, revealed: boolean): number {
  if (revealed) return HINT_LEVEL_REVEALED;
  return stage === "none" ? 0 : HINT_LEVEL_HINTED;
}

/** Show about half the letters, starting from the front: "elephant" -> "e l e p _ _ _ _". */
export function letterHint(word: string, shown = Math.ceil(word.length / 2)): string {
  return [...word].map((ch, i) => (i < shown || !/[a-z]/i.test(ch) ? ch : "_")).join(" ");
}

/** Text for the TTS to read a word slowly, letter by letter, then whole. */
export function slowSpelling(word: string): string {
  const letters = [...word].filter((ch) => /[a-z]/i.test(ch)).map((ch) => ch.toUpperCase());
  return `${word}. ${letters.join(", ")}. ${word}.`;
}

function stableHash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Wrong choices to take away, leaving the right one plus `keep` wrong ones. Deterministic per seed. */
export function eliminateChoices<T extends string>(choices: readonly T[], correct: T, keep = 1, seed = ""): T[] {
  const wrong = choices.filter((c) => c !== correct);
  const keepIdx = new Set<number>();
  for (let k = 0; k < Math.min(keep, wrong.length); k += 1) {
    let idx = stableHash(`${seed}:${k}`) % wrong.length;
    while (keepIdx.has(idx)) idx = (idx + 1) % wrong.length;
    keepIdx.add(idx);
  }
  return wrong.filter((_, i) => !keepIdx.has(i));
}

/** What the server (or a client game) hands back when she is stuck. Never sent before HINT_AT_MISS. */
export type StuckHelp = {
  stage: Exclude<HelpStage, "none">;
  /** Kind, short hint text (also read aloud). */
  hint: string;
  /** Wrong choices to grey out / remove. */
  removeChoices?: string[];
  /** Sentence to glow. */
  highlightSentenceId?: string;
  /** Pieces to place for her (vocab pairs or first/last order cards). */
  lockMatches?: Record<string, string>;
  lockOrder?: { first?: string; last?: string };
  /** Only at the show_me stage. */
  reveal?: {
    /** One line: what the answer is. */
    answer: string;
    /** One line: why. */
    why: string;
    /** The response to place for her; she taps/types it once and checks. */
    response: unknown;
  };
};

export const STUCK_COPY = {
  hintLead: "Here is a clue.",
  showMeLead: "This one is tricky. That's okay!",
  showMe: "Show me",
  skip: "Skip for now",
  afterReveal: "Now you try it once, then tap Next.",
} as const;
