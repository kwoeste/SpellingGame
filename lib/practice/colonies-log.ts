/** Pure helpers for the colonies practice test. No answer keys. */

export function coloniesItemFormat(q: { activity?: string; spellFormat?: string; kind?: string }): string {
  if (q.activity === "spell" && q.spellFormat) return q.spellFormat;
  if (q.activity === "sort" || q.activity === "map-name" || q.activity === "map-tap") return q.activity;
  return q.kind ?? "choice";
}

export type ColoniesStep<T> =
  | { kind: "board"; items: T[]; nextIndex: number }
  | { kind: "one"; item: T; nextIndex: number };

/** A long run of region cards is one sort board. Everything else is one question at a time. */
export function nextColoniesStep<T extends { activity?: string }>(questions: readonly T[], index: number): ColoniesStep<T> | null {
  const current = questions[index];
  if (!current) return null;
  if (current.activity === "sort") {
    let end = index;
    while (end < questions.length && questions[end]?.activity === "sort") end += 1;
    const items = questions.slice(index, end);
    if (items.length >= 8) return { kind: "board", items, nextIndex: end };
  }
  return { kind: "one", item: current, nextIndex: index + 1 };
}

export function coloniesAnswerPayload(chapterId: string, item: string, format: string, correct: boolean): Record<string, unknown> {
  return { game_id: "practice-test", chapter_id: chapterId, detail: "answered", item, format, correct };
}

export function coloniesFinishedPayload(input: {
  chapterId: string;
  mode: string;
  score: number;
  total: number;
  exactSpelling: number;
  byLesson: { lesson: number; right: number; total: number }[];
  missed: string[];
  misspelled: string[];
  formats: string[];
  minutes: number;
}): Record<string, unknown> {
  return {
    game_id: "practice-test",
    chapter_id: input.chapterId,
    detail: "finished",
    mode: input.mode,
    score: input.score,
    total: input.total,
    exact_spelling: input.exactSpelling,
    by_lesson: input.byLesson,
    missed: input.missed.slice(0, 40),
    misspelled: input.misspelled.slice(0, 40),
    formats: input.formats.slice(0, 40),
    minutes: input.minutes,
  };
}

/** engine.recordEvents drops a payload whose JSON is longer than this. */
export const PRACTICE_PAYLOAD_MAX = 2000;

export function payloadFits(payload: Record<string, unknown>): boolean {
  return JSON.stringify(payload).length <= PRACTICE_PAYLOAD_MAX;
}
