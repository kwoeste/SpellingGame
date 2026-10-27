import type { GradeResult, SlotResult } from "@/lib/practice/types";

export function normalizeAnswer(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z' -]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(a|an|the) /, "");
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Small typos allowed only on longer words: 0 under 5 letters, 1 for 5–7, 2 for 8+. */
export function allowedTypos(word: string): number {
  const n = word.replace(/[^a-z]/g, "").length;
  if (n >= 8) return 2;
  if (n >= 5) return 1;
  return 0;
}

/** Grade one typed answer against its accepted forms. */
export function gradeSlot(response: unknown, forms: string[]): SlotResult & { distance: number } {
  const said = normalizeAnswer(response);
  const normForms = forms.map(normalizeAnswer);
  const exactIdx = normForms.indexOf(said);
  if (said && exactIdx >= 0) return { correct: true, exact: true, expected: forms[exactIdx], distance: 0 };
  let best = { idx: 0, d: Number.POSITIVE_INFINITY };
  normForms.forEach((form, idx) => {
    const d = editDistance(said, form);
    if (d < best.d) best = { idx, d };
  });
  const ok = Boolean(said) && best.d <= allowedTypos(normForms[best.idx]);
  return { correct: ok, exact: false, expected: forms[ok ? best.idx : 0], distance: best.d };
}

function summarize(slots: SlotResult[]): GradeResult {
  return { correct: slots.every((s) => s.correct), exact: slots.every((s) => s.correct && s.exact), slots };
}

const strip = ({ correct, exact, expected }: SlotResult & { distance?: number }): SlotResult => ({ correct, exact, expected });

/** Fill-in blanks, in order (or either order when anyOrder). */
export function gradeBlanks(responses: unknown[], answers: string[][], anyOrder = false): GradeResult {
  const inOrder = answers.map((forms, i) => gradeSlot(responses[i], forms));
  if (!anyOrder || answers.length !== 2) return summarize(inOrder.map(strip));
  const swapped = [gradeSlot(responses[0], answers[1]), gradeSlot(responses[1], answers[0])];
  const score = (r: SlotResult[]) => r.filter((s) => s.correct).length * 10 + r.filter((s) => s.exact).length;
  return summarize((score(swapped) > score(inOrder) ? swapped : inOrder).map(strip));
}

/** A list in any order: each typed item may match one unused slot. */
export function gradeList(responses: unknown[], answers: string[][]): GradeResult {
  const used = new Set<number>();
  const slots: SlotResult[] = answers.map(() => ({ correct: false, exact: false, expected: "" }));
  const results: SlotResult[] = [];
  for (let r = 0; r < answers.length; r += 1) {
    let pick: { i: number; g: ReturnType<typeof gradeSlot> } | null = null;
    for (let i = 0; i < answers.length; i += 1) {
      if (used.has(i)) continue;
      const g = gradeSlot(responses[r], answers[i]);
      if (g.correct && (!pick || g.distance < pick.g.distance)) pick = { i, g };
    }
    if (pick) {
      used.add(pick.i);
      results[r] = strip(pick.g);
    } else results[r] = { correct: false, exact: false, expected: "" };
  }
  // Fill expected for unmatched boxes with the leftover answers, so the review shows what was missing.
  const leftover = answers.map((a, i) => (used.has(i) ? null : a[0])).filter((x): x is string => Boolean(x));
  for (let r = 0; r < results.length; r += 1) {
    slots[r] = results[r].correct ? results[r] : { ...results[r], expected: leftover.shift() ?? "" };
  }
  return summarize(slots);
}

/** Matching: each row's chosen word must be exactly the right word. */
export function gradeMatch(responses: unknown[], answers: string[][]): GradeResult {
  return summarize(answers.map((forms, i) => {
    const ok = normalizeAnswer(responses[i]) === normalizeAnswer(forms[0]);
    return { correct: ok, exact: ok, expected: forms[0] };
  }));
}
