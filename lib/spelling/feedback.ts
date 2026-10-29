import { editDistance } from "@/lib/practice/grade";
import { normalizeSpelling } from "@/lib/spelling/engine";
import { SPELLING_SO_CLOSE, SPELLING_YAYS } from "@/lib/spelling/list-d2";

export type LetterMark = { ch: string; ok: boolean };

/**
 * Marks HER letters only (green = right letter in the right spot, red = not), so a miss never
 * shows the answer. `prefix` = how many letters in a row are right from the start.
 */
export function markLetters(target: string, typed: string): { marks: LetterMark[]; prefix: number; lengthHint: "short" | "long" | "same" } {
  const t = normalizeSpelling(target);
  const y = normalizeSpelling(typed);
  const marks = [...y].map((ch, i) => ({ ch, ok: t[i] === ch }));
  let prefix = 0;
  while (prefix < y.length && y[prefix] === t[prefix]) prefix += 1;
  return { marks, prefix, lengthHint: y.length < t.length ? "short" : y.length > t.length ? "long" : "same" };
}

const NUDGES = [
  "Not quite. You can do it!",
  "Good try! Look closely and try again.",
  "Almost there. Check each letter.",
  "Keep going, you're learning it!",
];

/** Varied encouragement; "So close!" when she's one letter away. */
export function missMessage(target: string, typed: string, missNo: number): string {
  const { prefix, lengthHint } = markLetters(target, typed);
  const d = editDistance(normalizeSpelling(typed), normalizeSpelling(target));
  const parts: string[] = [d === 1 ? SPELLING_SO_CLOSE : NUDGES[(missNo - 1 + NUDGES.length) % NUDGES.length]];
  if (prefix > 0) parts.push(prefix === 1 ? "The first letter is right." : `The first ${prefix} letters are right.`);
  if (lengthHint === "short") parts.push("It needs more letters.");
  if (lengthHint === "long") parts.push("It has fewer letters than that.");
  return parts.join(" ");
}

export function rightMessage(n: number): string {
  return SPELLING_YAYS[n % SPELLING_YAYS.length];
}

/** Guessing guard: 2 wrong submits within this window trigger a short pause. */
export const QUICK_WINDOW_MS = 3000;
export const COOLDOWN_MS = 3000;
export function tooQuick(wrongTimes: number[], now: number): boolean {
  const recent = wrongTimes.filter((t) => now - t <= QUICK_WINDOW_MS);
  return recent.length >= 2;
}

/** Flashcards: she must hear the word or look for this long before covering it. */
export const FLASH_STUDY_MS = 2000;
export function canCover(shownAt: number, heard: boolean, now: number): boolean {
  return heard || now - shownAt >= FLASH_STUDY_MS;
}

/** Mock test start: starting never waits on audio (a scripted or touch tap starts immediately). */
export type MockState = { started: boolean; idx: number; missed: string[] };
export function mockStep(s: MockState, a: { type: "start" } | { type: "answer"; word: string; correct: boolean }): MockState {
  if (a.type === "start") return s.started ? s : { ...s, started: true };
  if (!s.started) return s;
  return { ...s, idx: s.idx + 1, missed: a.correct ? s.missed : [...s.missed, a.word] };
}
