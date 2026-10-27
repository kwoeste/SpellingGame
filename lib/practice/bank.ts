import { HINT_AT_MISS, SHOW_ME_AT_MISS, letterHint, type StuckHelp } from "@/lib/help/ladder";
import { seededShuffle } from "@/lib/content/shuffle";
import { SAVVAS_CH3_FACTS, SAVVAS_CH3_LESSONS } from "@/lib/practice/bank-savvas-ch3";
import { gradeBlanks, gradeList, gradeMatch } from "@/lib/practice/grade";
import type { GradeResult, PracticeFact, StudentQuestion } from "@/lib/practice/types";

type Bank = { chapterId: string; facts: PracticeFact[]; lessons: typeof SAVVAS_CH3_LESSONS };

const BANKS: Record<string, Bank> = {
  "savvas.ch3": { chapterId: "savvas.ch3", facts: SAVVAS_CH3_FACTS, lessons: SAVVAS_CH3_LESSONS },
};

export function practiceBank(chapterId: string): Bank | null {
  return BANKS[chapterId] ?? null;
}

export function hasPracticeTest(chapterId: string): boolean {
  return chapterId in BANKS;
}

/** Total phrasings (the size of the question bank). */
export function bankSize(chapterId: string): number {
  return practiceBank(chapterId)?.facts.reduce((n, f) => n + f.phrasings.length, 0) ?? 0;
}

function kindOf(fact: PracticeFact) {
  return fact.kind ?? "blank";
}

function findFact(factId: string): { bank: Bank; fact: PracticeFact } | null {
  for (const bank of Object.values(BANKS)) {
    const fact = bank.facts.find((f) => f.id === factId);
    if (fact) return { bank, fact };
  }
  return null;
}

/** qid = factId~phrasing~variant (b = type it, w = word bank). */
export function parseQid(qid: string): { bank: Bank; fact: PracticeFact; phrasing: number; variant: "b" | "w" } | null {
  const [factId, p, v] = String(qid).split("~");
  const found = findFact(factId ?? "");
  const phrasing = Number(p);
  if (!found || !Number.isInteger(phrasing) || phrasing < 0 || phrasing >= found.fact.phrasings.length) return null;
  return { ...found, phrasing, variant: v === "w" ? "w" : "b" };
}

export function toStudentQuestion(qid: string, seed = qid): StudentQuestion | null {
  const parsed = parseQid(qid);
  if (!parsed) return null;
  const { bank, fact, phrasing, variant } = parsed;
  const kind = kindOf(fact);
  const q: StudentQuestion = { qid, factId: fact.id, lesson: fact.lesson, kind, text: fact.phrasings[phrasing], slots: fact.answers.length };
  if (kind === "match") {
    q.prompts = fact.prompts;
    q.choices = seededShuffle(fact.answers.map((a) => a[0]), `${seed}:choices`);
  }
  if (kind === "blank" && variant === "w") {
    const others = bank.facts
      .filter((f) => f.lesson === fact.lesson && f.id !== fact.id && kindOf(f) === "blank")
      .flatMap((f) => f.answers.map((a) => a[0]))
      .filter((w) => !fact.answers.some((a) => a.includes(w)));
    const distractors = seededShuffle([...new Set(others)], `${seed}:wb`).slice(0, 3);
    q.wordBank = seededShuffle([...fact.answers.map((a) => a[0]), ...distractors], `${seed}:bank`);
  }
  return q;
}

/** One attempt: one phrasing per fact, shuffled, about a third as word-bank variants. */
export function buildAttempt(chapterId: string, seed: string, onlyFactIds?: string[]): StudentQuestion[] {
  const bank = practiceBank(chapterId);
  if (!bank) return [];
  const only = onlyFactIds?.length ? new Set(onlyFactIds) : null;
  const facts = bank.facts.filter((f) => !only || only.has(f.id));
  const ordered = seededShuffle(facts, `${seed}:order`);
  // Keep the worksheet feel: lessons in order, questions shuffled inside each lesson.
  ordered.sort((a, b) => a.lesson - b.lesson);
  return ordered.map((fact, i) => {
    const phrasing = seededShuffle(fact.phrasings.map((_, idx) => idx), `${seed}:${fact.id}`)[0];
    const variant = fact.wordBank && seededShuffle([0, 1, 2], `${seed}:${fact.id}:v`)[0] === 0 ? "w" : "b";
    return toStudentQuestion(`${fact.id}~${phrasing}~${variant}`, `${seed}:${i}`)!;
  });
}

export function gradeQuestion(qid: string, responses: unknown): GradeResult | null {
  const parsed = parseQid(qid);
  if (!parsed) return null;
  const list = Array.isArray(responses) ? responses.slice(0, 8).map((r) => String(r ?? "").slice(0, 60)) : [];
  const { fact } = parsed;
  const kind = kindOf(fact);
  if (kind === "list") return gradeList(list, fact.answers);
  if (kind === "match") return gradeMatch(list, fact.answers);
  return gradeBlanks(list, fact.answers, fact.anyOrder);
}

/** Kevin's ladder: nothing before HINT_AT_MISS, then a clue, then Show me. */
export function practiceHelp(qid: string, misses: number): StuckHelp | null {
  const parsed = parseQid(qid);
  if (!parsed || misses < HINT_AT_MISS) return null;
  const { fact, phrasing } = parsed;
  const words = fact.answers.map((a) => a[0]);
  const kind = kindOf(fact);
  const hint =
    kind === "match"
      ? `Read each meaning slowly. "${words[0]}" goes with "${fact.prompts?.[0] ?? ""}".`
      : `The answer${words.length > 1 ? "s start" : " starts"} like this: ${words.map((w) => letterHint(w)).join("  /  ")}`;
  if (misses < SHOW_ME_AT_MISS) return { stage: "hint", hint };
  const filled = kind === "blank" ? words.reduce((s, w) => s.replace("___", w), fact.phrasings[phrasing]) : `${words.join(", ")}.`;
  return {
    stage: "show_me",
    hint,
    reveal: { answer: `Answer: ${words.join(", ")}`, why: filled, response: words },
  };
}

export function lessonTitles(chapterId: string): { lesson: number; title: string }[] {
  return practiceBank(chapterId)?.lessons.map(({ lesson, title }) => ({ lesson, title })) ?? [];
}
