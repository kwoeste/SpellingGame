import type { SpellingMode } from "@/lib/spelling/engine";
import { normalizeSpelling } from "@/lib/spelling/engine";

/**
 * Question formats inside the spelling practice test.
 * "listen" is hear-and-type. The other four are mixed in with it.
 * Each value is also the attempt mode stored for the planner.
 */
export const TEST_FORMATS = ["listen", "blanks", "choice", "sentence", "scramble"] as const satisfies readonly SpellingMode[];
export type TestFormat = (typeof TEST_FORMATS)[number];

/** She types an answer, so a miss uses the help ladder and comes back later in the test. */
export const LADDER_FORMATS = ["listen", "blanks", "sentence"] as const satisfies readonly TestFormat[];

export function formatUsesLadder(format: TestFormat): boolean {
  return (LADDER_FORMATS as readonly string[]).includes(format);
}

const VOWEL_SWAP: Record<string, string> = { a: "e", e: "i", i: "e", o: "u", u: "a" };
const UNCOMMON = new Set(["q", "x", "z", "j", "v", "w", "y", "k"]);

function pushUnique(out: string[], word: string, candidate: string): void {
  const next = candidate.toLowerCase();
  if (!/^[a-z]+$/.test(next) || next === word || out.includes(next)) return;
  out.push(next);
}

/**
 * Three plausible misspellings, always the same for the same word.
 * Order: the list's common oops, then a dropped double, a doubled consonant,
 * a swapped vowel, a neighbor swap, and a dropped letter.
 */
export function spellingDistractors(word: string, oops?: string): [string, string, string] {
  const target = word.toLowerCase();
  const out: string[] = [];
  if (oops) pushUnique(out, target, oops);
  for (let i = 1; i < target.length; i += 1) {
    if (target[i] === target[i - 1]) pushUnique(out, target, target.slice(0, i) + target.slice(i + 1));
  }
  for (let i = 0; i < target.length; i += 1) {
    if (!"aeiou".includes(target[i] ?? "")) pushUnique(out, target, target.slice(0, i) + target[i] + target.slice(i));
  }
  for (let i = 0; i < target.length; i += 1) {
    const swapped = VOWEL_SWAP[target[i] ?? ""];
    if (swapped) pushUnique(out, target, target.slice(0, i) + swapped + target.slice(i + 1));
  }
  for (let i = 0; i < target.length - 1; i += 1) {
    const left = target[i] ?? "";
    const right = target[i + 1] ?? "";
    if ("aeiou".includes(left) || "aeiou".includes(right)) pushUnique(out, target, target.slice(0, i) + right + left + target.slice(i + 2));
  }
  for (let i = 0; i < target.length - 1; i += 1) {
    pushUnique(out, target, target.slice(0, i) + target[i + 1] + target[i] + target.slice(i + 2));
  }
  for (let i = 1; i < target.length; i += 1) pushUnique(out, target, target.slice(0, i) + target.slice(i + 1));
  for (let i = 0; i < target.length; i += 1) pushUnique(out, target, target.slice(0, i) + target[i] + target.slice(i));
  for (const extra of ["e", "s", "x"]) {
    pushUnique(out, target, `${target}${extra}`);
    pushUnique(out, target, `${extra}${target}`);
  }
  let pad = 1;
  while (out.length < 3 && pad < 8) {
    pushUnique(out, target, `${target}${"x".repeat(pad)}`);
    pad += 1;
  }
  return [out[0] ?? `${target}x`, out[1] ?? `${target}xx`, out[2] ?? `${target}xxx`];
}

export function shuffleWith<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const left = copy[i];
    const right = copy[j];
    if (left === undefined || right === undefined) continue;
    copy[i] = right;
    copy[j] = left;
  }
  return copy;
}

/** The right spelling plus three near-misses, order shuffled. */
export function spellingChoices(word: string, oops: string | undefined, random: () => number = Math.random): string[] {
  return shuffleWith([word, ...spellingDistractors(word, oops)], random);
}

/** 1 letter on short words, 2 on medium, 3 on long, always leaving at least one letter showing. */
export function blankCount(length: number): number {
  if (length <= 1) return length > 0 ? 1 : 0;
  const wanted = length <= 5 ? 1 : length <= 8 ? 2 : 3;
  return Math.min(wanted, length - 1);
}

/** Higher means blank this letter first: the marked tricky spot, then doubles and harder consonants. */
export function letterBlankScore(word: string, index: number, trickyAt: number, trickyLen: number): number {
  const ch = word[index] ?? "";
  let score = 0;
  if (trickyLen > 0 && index >= trickyAt && index < trickyAt + trickyLen) score += 10;
  if ((index > 0 && word[index - 1] === ch) || (index + 1 < word.length && word[index + 1] === ch)) score += 6;
  if (UNCOMMON.has(ch)) score += 4;
  if (ch === "e" && index === word.length - 1) score += 3;
  if (!"aeiou".includes(ch)) score += 2;
  if (index === 0) score -= 3;
  return score;
}

export function blankIndexes(word: string, trickyAt = 0, trickyLen = 0): number[] {
  const count = blankCount(word.length);
  const ranked = [...word].map((_, index) => ({ index, score: letterBlankScore(word, index, trickyAt, trickyLen) }));
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, count).map((row) => row.index).sort((a, b) => a - b);
}

/** "acquire" with index 3 hidden is "a c q _ i r e". */
export function blankDisplay(word: string, indexes: readonly number[]): string {
  const hidden = new Set(indexes);
  return [...word].map((ch, index) => (hidden.has(index) ? "_" : ch)).join(" ");
}

/** Missing letters that sit inside the ladder's revealed prefix, in order. */
export function lockedBlankLetters(word: string, indexes: readonly number[], revealedPrefix: number): string {
  return indexes.filter((index) => index < revealedPrefix).map((index) => word[index] ?? "").join("");
}

/**
 * Put her letters into the blanks. The right number of letters rebuilds a word.
 * Any other length is returned as she typed it, so a full correct spelling still counts.
 */
export function applyMissing(word: string, indexes: readonly number[], typed: string): string {
  const letters = normalizeSpelling(typed);
  if (letters.length !== indexes.length) return letters;
  const chars = [...word];
  indexes.forEach((index, n) => {
    chars[index] = letters[n] ?? "";
  });
  return chars.join("");
}

export function answerForFormat(format: TestFormat, word: string, blanks: readonly number[], raw: string): string {
  if (format === "blanks") return applyMissing(word, blanks, raw);
  return raw;
}

/** Letter tiles in a new order. Never the word itself when the letters can be rearranged. */
export function scrambleLetters(word: string, random: () => number = Math.random): string[] {
  const letters = [...word];
  if (letters.length < 2 || new Set(letters).size <= 1) return letters;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = shuffleWith(letters, random);
    if (next.join("") !== word) return next;
  }
  const next = [...letters];
  const other = next.findIndex((ch, index) => index > 0 && ch !== next[0]);
  const swapAt = other > 0 ? other : 1;
  const first = next[0];
  const second = next[swapAt];
  if (first !== undefined && second !== undefined) {
    next[0] = second;
    next[swapAt] = first;
  }
  return next;
}

/**
 * One format per word, round-robin through a shuffled cycle so neighbors differ.
 * Hear-and-type is always in the test.
 */
export function assignTestFormats(count: number, random: () => number = Math.random): TestFormat[] {
  if (count <= 0) return [];
  const order = shuffleWith(TEST_FORMATS, random);
  const listenAt = order.indexOf("listen");
  if (listenAt >= count && order[0] !== undefined && order[listenAt] !== undefined) {
    order[listenAt] = order[0];
    order[0] = "listen";
  }
  const out: TestFormat[] = [];
  for (let i = 0; i < count; i += 1) {
    const format = order[i % order.length];
    if (format) out.push(format);
  }
  return out;
}
