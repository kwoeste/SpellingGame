import { seededShuffle } from "@/lib/content/shuffle";
import { applyMissing, blankCount, letterBlankScore } from "@/lib/spelling/formats";
import type { SpellFormatName } from "@/lib/practice/types";

/** Instructions spoken and shown for each spelling format. Keep in sync with tts-prewarm. */
export const SPELL_CUE: Record<Exclude<SpellFormatName, "sentence">, string> = {
  listen: "Listen, then type the colony name.",
  blanks: "Fill in the missing letters.",
  choice: "Which spelling is right?",
  scramble: "Tap the letters in order to spell the colony.",
};

export function colonySpellKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Capitals and extra spaces do not count. A missing space between words does not match. */
export function colonySpellEqual(typed: string, expected: string): boolean {
  return colonySpellKey(typed) === colonySpellKey(expected);
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Three different wrong spellings. The listed oops comes first when it is a real miss. */
export function colonyMisses(name: string, oops?: string): [string, string, string] {
  const target = colonySpellKey(name);
  const out: string[] = [];
  const push = (candidate: string) => {
    const titled = titleCaseWords(candidate);
    const key = colonySpellKey(titled);
    if (!key || key === target || out.some((item) => colonySpellKey(item) === key)) return;
    out.push(titled);
  };
  if (oops) push(oops);
  const lower = name.toLowerCase();
  for (let i = 1; i < lower.length; i += 1) {
    if (lower[i] === lower[i - 1] && lower[i] !== " ") push(lower.slice(0, i) + lower.slice(i + 1));
  }
  const vowel: Record<string, string> = { a: "e", e: "i", i: "e", o: "u", u: "a" };
  for (let i = 0; i < lower.length; i += 1) {
    const swapped = vowel[lower[i] ?? ""];
    if (swapped) push(lower.slice(0, i) + swapped + lower.slice(i + 1));
  }
  for (let i = 1; i < lower.length; i += 1) {
    if (lower[i] !== " ") push(lower.slice(0, i) + lower.slice(i + 1));
  }
  for (let i = 0; i < lower.length - 1; i += 1) {
    if (lower[i] === " " || lower[i + 1] === " ") continue;
    push(lower.slice(0, i) + lower[i + 1] + lower[i] + lower.slice(i + 2));
  }
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i] ?? "";
    if (ch !== " " && !"aeiou".includes(ch)) push(lower.slice(0, i) + ch + lower.slice(i));
  }
  let pad = 1;
  while (out.length < 3 && pad < 6) {
    push(`${lower}${"e".repeat(pad)}`);
    pad += 1;
  }
  return [out[0] ?? `${name}e`, out[1] ?? `${name}ee`, out[2] ?? `${name}eee`];
}

export function colonyChoices(name: string, oops: string | undefined, seed: string): string[] {
  return seededShuffle([name, ...colonyMisses(name, oops)], seed);
}

/** Hide 1 to 3 letters, always keeping the tricky spot when one is marked, never the space. */
export function colonyBlankIndexes(name: string, trickyAt = 0, trickyLen = 0): number[] {
  const lower = name.toLowerCase();
  const letters = [...lower].map((ch, index) => index).filter((index) => lower[index] !== " ");
  const count = Math.min(blankCount(letters.length), Math.max(0, letters.length - 1));
  const ranked = letters.map((index) => ({ index, score: letterBlankScore(lower, index, trickyAt, trickyLen) }));
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, count).map((row) => row.index).sort((a, b) => a - b);
}

/** Shown letters keep their capitals. "" is a blank box. */
export function colonyShown(name: string, indexes: readonly number[]): string[] {
  const hidden = new Set(indexes);
  return [...name].map((ch, index) => (hidden.has(index) ? "" : ch));
}

export function colonyTiles(name: string, seed: string): string[] {
  const letters = [...name.toLowerCase()];
  if (letters.length < 2) return letters;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = seededShuffle(letters, `${seed}:${attempt}`);
    if (next.join("") !== name.toLowerCase()) return next;
  }
  const next = [...letters];
  const swapAt = next.findIndex((ch, index) => index > 0 && ch !== next[0]);
  const at = swapAt > 0 ? swapAt : 1;
  const first = next[0];
  const second = next[at];
  if (first !== undefined && second !== undefined) {
    next[0] = second;
    next[at] = first;
  }
  return next;
}

/** Grade a colony spelling. Blanks send only the missing letters, in order. */
export function gradeColonySpell(name: string, format: string, raw: string, trickyAt = 0, trickyLen = 0): { correct: boolean; expected: string } {
  const attempt = format === "blanks" ? applyMissing(name, colonyBlankIndexes(name, trickyAt, trickyLen), raw) : raw;
  return { correct: colonySpellEqual(attempt, name), expected: name };
}
