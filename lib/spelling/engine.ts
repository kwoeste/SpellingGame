import { etDateKey } from "@/lib/engine/scheduler";
import { D2_WORDS, type SpellingWord } from "@/lib/spelling/list-d2";

/** One graded spelling attempt, as stored in engine.interaction_event (type spelling_attempt). */
export type SpellingAttempt = { word: string; correct: boolean; firstTry: boolean; mode: string; at: number };

export const SPELLING_MODES = ["flash", "listen", "tiles", "fix", "mock", "sort"] as const;
export type SpellingMode = (typeof SPELLING_MODES)[number];
/** Sorting by vowel sound is practice, but it doesn't prove she can spell the word. */
export const MASTERY_MODES: readonly string[] = ["flash", "listen", "tiles", "fix", "mock"];

export const MASTERY_STREAK = 3;
export const MASTERY_OCCASIONS = 2;
/** Attempts more than this far apart are separate practice occasions. */
export const OCCASION_GAP_MS = 30 * 60_000;
export const HINT_AT_MISS = 4;
export const REVEAL_AT_MISS = 5;

export type WordStat = {
  word: string;
  attempts: number;
  correct: number;
  streak: number;
  mastered: boolean;
  lastAt: number | null;
  lastMissAt: number | null;
  dueAt: number;
};

export function normalizeSpelling(text: unknown): string {
  return typeof text === "string" ? text.trim().toLowerCase().replace(/\s+/g, "") : "";
}

export function gradeSpelling(word: SpellingWord, typed: unknown): boolean {
  return normalizeSpelling(typed) === word.word;
}

/** Help ladder by miss count on this word in this round: nothing early, then a hint, then the answer. */
export function spellingHelp(word: SpellingWord, misses: number): { level: "none" | "hint" | "reveal"; hint?: string; answer?: string } {
  if (misses >= REVEAL_AT_MISS) return { level: "reveal", hint: word.trick, answer: word.word };
  if (misses >= HINT_AT_MISS) return { level: "hint", hint: `${word.trick} It starts with "${word.word[0]}" and has ${word.word.length} letters.` };
  return { level: "none" };
}

/** Groups attempt times into occasions (gaps longer than OCCASION_GAP_MS, or a new ET day). */
function occasionIndex(times: number[]): number[] {
  const out: number[] = [];
  let idx = 0;
  times.forEach((t, i) => {
    if (i > 0 && (t - times[i - 1] > OCCASION_GAP_MS || etDateKey(new Date(t)) !== etDateKey(new Date(times[i - 1])))) idx += 1;
    out.push(idx);
  });
  return out;
}

/**
 * Per-word stats. A streak counts first-try correct answers in a row (any miss resets it).
 * Mastered = the last MASTERY_STREAK answers were first-try correct and they span at least
 * MASTERY_OCCASIONS separate occasions.
 */
export function wordStats(attempts: SpellingAttempt[], words: SpellingWord[] = D2_WORDS): WordStat[] {
  const all = attempts.filter((a) => MASTERY_MODES.includes(a.mode)).sort((a, b) => a.at - b.at);
  const occ = occasionIndex(all.map((a) => a.at));
  const occOf = new Map(all.map((a, i) => [a, occ[i]]));
  return words.map((x) => {
    const mine = all.filter((a) => a.word === x.word);
    let streak = 0;
    const streakOcc: number[] = [];
    for (const a of mine) {
      if (a.correct && a.firstTry) {
        streak += 1;
        streakOcc.push(occOf.get(a)!);
      } else {
        streak = 0;
        streakOcc.length = 0;
      }
    }
    const lastOccasions = new Set(streakOcc.slice(-MASTERY_STREAK));
    const mastered = streak >= MASTERY_STREAK && lastOccasions.size >= MASTERY_OCCASIONS;
    const last = mine.at(-1) ?? null;
    const lastMiss = [...mine].reverse().find((a) => !(a.correct && a.firstTry)) ?? null;
    // Spaced repetition: missed → due now; then 10 min, next occasion, a day, and 2 days once mastered.
    const gap = mastered ? 2 * 86_400_000 : [0, 10 * 60_000, OCCASION_GAP_MS, 86_400_000][Math.min(streak, 3)];
    return {
      word: x.word,
      attempts: mine.length,
      correct: mine.filter((a) => a.correct).length,
      streak,
      mastered,
      lastAt: last?.at ?? null,
      lastMissAt: lastMiss?.at ?? null,
      dueAt: last ? last.at + gap : 0,
    };
  });
}

export function masteredCount(stats: WordStat[]): number {
  return stats.filter((s) => s.mastered).length;
}

/**
 * The next practice round: due words first (recently missed first, then never tried), then the
 * not-yet-due unmastered words by due time. Mastered words only come back when due.
 */
export function practiceQueue(stats: WordStat[], now: number, size = 10): string[] {
  const due = stats.filter((s) => s.dueAt <= now);
  const missed = due.filter((s) => !s.mastered && s.lastMissAt !== null).sort((a, b) => (b.lastMissAt ?? 0) - (a.lastMissAt ?? 0));
  const fresh = due.filter((s) => s.attempts === 0);
  const rest = due.filter((s) => !missed.includes(s) && !fresh.includes(s)).sort((a, b) => Number(a.mastered) - Number(b.mastered) || a.dueAt - b.dueAt);
  const later = stats.filter((s) => s.dueAt > now && !s.mastered).sort((a, b) => a.dueAt - b.dueAt);
  const order = [...missed, ...fresh, ...rest, ...later].map((s) => s.word);
  return [...new Set(order)].slice(0, size);
}

/** Days until the test (0 on test day), in ET calendar days. */
export function daysUntil(testDate: string, nowMs: number): number {
  const today = etDateKey(new Date(nowMs));
  return Math.round((Date.parse(`${testDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}
