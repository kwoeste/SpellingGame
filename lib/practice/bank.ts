import { SPELL_CUE, colonyBlankIndexes, colonyChoices, colonyShown, colonySpellEqual, colonyTiles, gradeColonySpell } from "@/lib/content/colonies-spell";
import { seededRandom, seededShuffle } from "@/lib/content/shuffle";
import { HINT_AT_MISS, SHOW_ME_AT_MISS, letterHint, type StuckHelp } from "@/lib/help/ladder";
import { COLONIES_FACTS, COLONIES_LESSONS } from "@/lib/practice/bank-colonies";
import { OHIO_TRIBES_FACTS, OHIO_TRIBES_LESSONS } from "@/lib/practice/bank-ohio-tribes";
import { SAVVAS_CH3_FACTS, SAVVAS_CH3_LESSONS } from "@/lib/practice/bank-savvas-ch3";
import { gradeBlanks, gradeList, gradeMatch, normalizeAnswer } from "@/lib/practice/grade";
import { assignTestFormats } from "@/lib/spelling/formats";
import { isSpellFormat, type GradeResult, type PracticeBankIntro, type PracticeFact, type PracticeKind, type SpellFormatName, type StudentQuestion } from "@/lib/practice/types";

type Bank = { chapterId: string; facts: PracticeFact[]; lessons: typeof SAVVAS_CH3_LESSONS; intro: PracticeBankIntro };

const BANKS: Record<string, Bank> = {
  "savvas.ch3": {
    chapterId: "savvas.ch3", facts: SAVVAS_CH3_FACTS, lessons: SAVVAS_CH3_LESSONS,
    intro: { heading: "Get ready for your science test", body: "This works like the Guided Notes at school. Read each sentence and type the missing word. Spelling counts, so type carefully!" },
  },
  "ss.ohio-tribes": {
    chapterId: "ss.ohio-tribes", facts: OHIO_TRIBES_FACTS, lessons: OHIO_TRIBES_LESSONS,
    intro: { heading: "Get ready for your social studies test", body: "Your test is open book, so keep your Ohio newspaper next to you. Read every word of each question slowly. Some questions say Find it: look in your paper for the answer!" },
  },
  "ss.colonies": {
    chapterId: "ss.colonies", facts: COLONIES_FACTS, lessons: COLONIES_LESSONS,
    intro: {
      heading: "Get ready for your social studies test",
      body: "This works like your class test. You will sort every colony into its region, label the map, answer which region is farthest south, and spell a few colony names. Read every word before you answer.",
    },
  },
};

/** Every chapter id that has a practice test. */
export function practiceBankIds(): string[] {
  return Object.keys(BANKS);
}

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

function kindOf(fact: PracticeFact): PracticeKind {
  return fact.kind ?? "blank";
}

function exactGrade(correct: boolean, expected: string): GradeResult {
  return { correct, exact: correct, slots: [{ correct, exact: correct, expected }] };
}

function fillSpellQuestion(q: StudentQuestion, fact: PracticeFact, format: SpellFormatName, phrasing: number, seed: string): void {
  const name = fact.answers[0]?.[0] ?? "";
  q.spellFormat = format;
  switch (format) {
    case "listen":
      q.text = SPELL_CUE.listen;
      q.clip = name;
      break;
    case "blanks":
      q.text = SPELL_CUE.blanks;
      q.shown = colonyShown(name, colonyBlankIndexes(name, fact.trickyAt ?? 0, fact.trickyLen ?? 0));
      break;
    case "choice":
      q.text = SPELL_CUE.choice;
      q.choices = colonyChoices(name, fact.oops, `${seed}:spell`);
      break;
    case "scramble":
      q.text = SPELL_CUE.scramble;
      q.tiles = colonyTiles(name, `${seed}:tiles`);
      break;
    case "sentence":
      q.text = fact.phrasings[phrasing] ?? "";
      break;
    default: {
      const unreachable: never = format;
      throw new Error(`Unhandled spell format ${String(unreachable)}`);
    }
  }
}

function findFact(factId: string): { bank: Bank; fact: PracticeFact } | null {
  for (const bank of Object.values(BANKS)) {
    const fact = bank.facts.find((f) => f.id === factId);
    if (fact) return { bank, fact };
  }
  return null;
}

function variantOf(value: string | undefined): "b" | "w" | SpellFormatName {
  if (value === "w") return "w";
  if (isSpellFormat(value)) return value;
  return "b";
}

/** qid = factId~phrasing~variant (b = type it, w = word bank, or a spelling format). */
export function parseQid(qid: string): { bank: Bank; fact: PracticeFact; phrasing: number; variant: "b" | "w" | SpellFormatName } | null {
  const [factId, p, v] = String(qid).split("~");
  const found = findFact(factId ?? "");
  const phrasing = Number(p);
  if (!found || !Number.isInteger(phrasing) || phrasing < 0 || phrasing >= found.fact.phrasings.length) return null;
  return { ...found, phrasing, variant: variantOf(v) };
}

export function toStudentQuestion(qid: string, seed = qid): StudentQuestion | null {
  const parsed = parseQid(qid);
  if (!parsed) return null;
  const { bank, fact, phrasing, variant } = parsed;
  const kind = kindOf(fact);
  const q: StudentQuestion = { qid, factId: fact.id, lesson: fact.lesson, kind, text: fact.phrasings[phrasing], slots: fact.answers.length };
  if (fact.activity) q.activity = fact.activity;
  if (fact.card) q.card = fact.card;
  if (fact.highlightId) q.highlightId = fact.highlightId;
  if (fact.compass) q.compass = true;
  if (kind === "spell" && isSpellFormat(variant)) fillSpellQuestion(q, fact, variant, phrasing, seed);
  if (kind === "match") {
    q.prompts = fact.prompts;
    q.choices = seededShuffle(fact.answers.map((a) => a[0]), `${seed}:choices`);
  }
  if (kind === "choice") q.choices = seededShuffle(fact.options ?? fact.answers.map((a) => a[0]), `${seed}:options`);
  if (kind === "blank" && variant === "w") {
    const others = bank.facts
      .filter((f) => f.lesson === fact.lesson && f.id !== fact.id && kindOf(f) === "blank")
      .flatMap((f) => f.answers.map((a) => a[0]))
      .filter((w) => !fact.answers.some((a) => a.includes(w)));
    const wider = bank.facts
      .filter((f) => f.lesson !== fact.lesson && kindOf(f) === "blank")
      .flatMap((f) => f.answers.map((a) => a[0]))
      .filter((w) => !fact.answers.some((a) => a.includes(w)));
    const near = seededShuffle([...new Set(others)], `${seed}:wb`).slice(0, 3);
    const distractors = [...near, ...seededShuffle([...new Set(wider)].filter((w) => !near.includes(w)), `${seed}:wb2`)].slice(0, 3);
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
  const formats = assignTestFormats(ordered.filter((fact) => fact.activity === "spell").length, seededRandom(`${seed}:formats`));
  const formatById = new Map(ordered.filter((fact) => fact.activity === "spell").map((fact, index) => [fact.id, formats[index] ?? "listen"]));
  return ordered.map((fact, i) => {
    const phrasing = seededShuffle(fact.phrasings.map((_, idx) => idx), `${seed}:${fact.id}`)[0] ?? 0;
    const spellFormat = formatById.get(fact.id);
    const variant = spellFormat ?? (fact.wordBank === "always" || (fact.wordBank && seededShuffle([0, 1, 2], `${seed}:${fact.id}:v`)[0] === 0) ? "w" : "b");
    return toStudentQuestion(`${fact.id}~${phrasing}~${variant}`, `${seed}:${i}`)!;
  });
}

export function gradeQuestion(qid: string, responses: unknown): GradeResult | null {
  const parsed = parseQid(qid);
  if (!parsed) return null;
  const list = Array.isArray(responses) ? responses.slice(0, 8).map((r) => String(r ?? "").slice(0, 60)) : [];
  const { fact } = parsed;
  const kind = kindOf(fact);
  const expected = fact.answers[0]?.[0] ?? "";
  switch (kind) {
    case "list":
      return gradeList(list, fact.answers);
    case "match":
      return gradeMatch(list, fact.answers);
    case "choice":
    case "tap": {
      // Tapped, not typed: exact match only (no typo tolerance, e.g. "eastern" vs "western").
      const correct = normalizeAnswer(list[0]) === normalizeAnswer(expected);
      return exactGrade(correct, expected);
    }
    case "spell": {
      const graded = gradeColonySpell(expected, parsed.variant, list[0] ?? "", fact.trickyAt ?? 0, fact.trickyLen ?? 0);
      return exactGrade(graded.correct, graded.expected);
    }
    case "blank":
      if (fact.exactOnly) return exactGrade(colonySpellEqual(list[0] ?? "", expected), expected);
      return gradeBlanks(list, fact.answers, fact.anyOrder);
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/** Kevin's ladder: nothing before HINT_AT_MISS, then a clue, then Show me. */
export function practiceHelp(qid: string, misses: number): StuckHelp | null {
  const parsed = parseQid(qid);
  if (!parsed || misses < HINT_AT_MISS) return null;
  const { fact, phrasing } = parsed;
  const words = fact.answers.map((a) => a[0]);
  const kind = kindOf(fact);
  if (kind === "tap") {
    const name = fact.card ?? "that colony";
    const hint = "North is up. The ocean is east. Find the shape for the name you read.";
    if (misses < SHOW_ME_AT_MISS) return { stage: "hint", hint };
    return { stage: "show_me", hint, reveal: { answer: `Answer: ${name}`, why: fact.why ?? name, response: words } };
  }
  const hint =
    kind === "choice"
      ? `Read every choice slowly. The answer starts like this: ${letterHint(words[0])}`
      : kind === "match"
      ? `Read each meaning slowly. "${words[0]}" goes with "${fact.prompts?.[0] ?? ""}".`
      : `The answer${words.length > 1 ? "s start" : " starts"} like this: ${words.map((w) => letterHint(w)).join("  /  ")}`;
  if (misses < SHOW_ME_AT_MISS) return { stage: "hint", hint };
  const filled = kind === "blank" ? words.reduce((s, w) => s.replace("___", w), fact.phrasings[phrasing]).replace(/\*\*/g, "") : `${words.join(", ")}.`;
  return {
    stage: "show_me",
    hint,
    reveal: { answer: `Answer: ${words.join(", ")}`, why: fact.why ?? filled, response: words },
  };
}

/** The kind explanation for a question (shown after she answers). */
export function practiceWhy(qid: string): string | null {
  return parseQid(qid)?.fact.why ?? null;
}

export function lessonTitles(chapterId: string): { lesson: number; title: string }[] {
  return practiceBank(chapterId)?.lessons.map(({ lesson, title }) => ({ lesson, title })) ?? [];
}
