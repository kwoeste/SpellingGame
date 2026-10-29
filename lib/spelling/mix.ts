/**
 * Which spelling games work best for Mae, and today's guided session.
 *
 * Effectiveness is measured on LATER retrieval, not in-game accuracy: for each attempt in game M on
 * word W, find the next first try at W in a test-like game (Listen & spell or the mock test) at least
 * one occasion later. Easy games (tiles) can't inflate their own score that way.
 *
 * Weights: explore (near-equal) until every game has MIN_SAMPLES later checks, then exploit
 * (weight grows with effectiveness), always with a FLOOR per game so each keeps being measured.
 * At plan-build time (once per sign-in) Grok may suggest weights + a parent note from aggregated
 * stats only; its answer is validated and clamped, and any problem falls back to the deterministic weights.
 */
import { OCCASION_GAP_MS, practiceQueue, type SpellingAttempt, type WordStat } from "@/lib/spelling/engine";
import { D2_WORDS } from "@/lib/spelling/list-d2";

export const PRACTICE_MODES = ["listen", "flash", "tiles", "fix", "sort"] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];
/** Later-retrieval games: closest to the real test. */
export const RETRIEVAL_MODES: readonly string[] = ["listen", "mock"];
/** Later checks per game before we trust its score (explore phase until all reach it). */
export const MIN_SAMPLES = 6;
/** Every game keeps at least this share. */
export const FLOOR = 0.12;
/** No game gets more than this share (keeps the mix a mix). */
export const CAP = 0.45;
/** Word-slots in one guided session (spread across rounds by weight), plus the mock check. */
export const SESSION_SLOTS = 16;
export const FOCUS_WORDS = 8;
export const CHECK_WORDS = 5;
export const MIX_MODEL = process.env.XAI_INSIGHT_MODEL || process.env.XAI_PLANNER_MODEL || "grok-4.20-0309-non-reasoning";

export type Weights = Record<PracticeMode, number>;
export type ModeStat = { mode: string; attempts: number; first_try_correct: number; in_game_accuracy: number | null; later_n: number; later_right: number; later_accuracy: number | null; score: number };
export type SpellingMix = { weights: Weights; note: string; source: "ai" | "deterministic"; phase: "explore" | "exploit"; model: string | null; createdAt: number; stats: ModeStat[] };

const r2 = (x: number) => Math.round(x * 100) / 100;

export function modeStats(attempts: SpellingAttempt[]): ModeStat[] {
  const all = [...attempts].sort((a, b) => a.at - b.at);
  const modes = [...PRACTICE_MODES, "mock"];
  return modes.map((mode) => {
    const mine = all.filter((a) => a.mode === mode);
    const first = mine.filter((a) => a.firstTry);
    let n = 0;
    let right = 0;
    for (const a of mine) {
      const later = all.find((b) => b.word === a.word && b.firstTry && RETRIEVAL_MODES.includes(b.mode) && b.at - a.at > OCCASION_GAP_MS);
      if (later) {
        n += 1;
        if (later.correct) right += 1;
      }
    }
    return {
      mode,
      attempts: mine.length,
      first_try_correct: first.filter((a) => a.correct).length,
      in_game_accuracy: first.length ? r2(first.filter((a) => a.correct).length / first.length) : null,
      later_n: n,
      later_right: right,
      later_accuracy: n ? r2(right / n) : null,
      score: r2((1 + right) / (2 + n)),
    };
  });
}

/** Normalize, then enforce FLOOR and CAP (iteratively), summing to 1. */
export function clampWeights(raw: Partial<Record<string, number>>): Weights {
  const w = Object.fromEntries(PRACTICE_MODES.map((m) => { const v = raw[m]; return [m, typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0]; })) as Weights;
  let sum = PRACTICE_MODES.reduce((s, m) => s + w[m], 0);
  if (sum <= 0) PRACTICE_MODES.forEach((m) => (w[m] = 1)), (sum = PRACTICE_MODES.length);
  PRACTICE_MODES.forEach((m) => (w[m] /= sum));
  for (let i = 0; i < 20; i++) {
    const fixed = PRACTICE_MODES.filter((m) => w[m] <= FLOOR || w[m] >= CAP);
    PRACTICE_MODES.forEach((m) => (w[m] = Math.min(CAP, Math.max(FLOOR, w[m]))));
    const free = PRACTICE_MODES.filter((m) => !fixed.includes(m));
    const total = PRACTICE_MODES.reduce((s, m) => s + w[m], 0);
    if (Math.abs(total - 1) < 1e-9 || !free.length) break;
    const freeSum = free.reduce((s, m) => s + w[m], 0);
    const target = 1 - (total - freeSum);
    free.forEach((m) => (w[m] = freeSum > 0 ? (w[m] * target) / freeSum : target / free.length));
  }
  PRACTICE_MODES.forEach((m) => (w[m] = r2(w[m])));
  return w;
}

export function deterministicWeights(stats: ModeStat[]): { weights: Weights; phase: "explore" | "exploit" } {
  const by = new Map(stats.map((s) => [s.mode, s]));
  const explore = PRACTICE_MODES.some((m) => (by.get(m)?.later_n ?? 0) < MIN_SAMPLES);
  if (explore) {
    // Near-equal; games with fewer checks so far get a little more so they catch up.
    const raw = Object.fromEntries(PRACTICE_MODES.map((m) => [m, 1 + Math.max(0, MIN_SAMPLES - (by.get(m)?.later_n ?? 0)) / MIN_SAMPLES / 2]));
    return { weights: clampWeights(raw), phase: "explore" };
  }
  // Exploit: weight by effectiveness squared (sharpens differences), clamped to FLOOR/CAP.
  const raw = Object.fromEntries(PRACTICE_MODES.map((m) => [m, (by.get(m)?.score ?? 0.5) ** 2]));
  return { weights: clampWeights(raw), phase: "exploit" };
}

const LABEL: Record<string, string> = { listen: "Listen & spell", flash: "Flashcards", tiles: "Letter tiles", fix: "Fix the misspelling", sort: "Sort by sound", mock: "Mock test" };
export const modeLabel = (m: string) => LABEL[m] ?? m;

export function deterministicNote(stats: ModeStat[], phase: "explore" | "exploit"): string {
  if (phase === "explore") {
    const total = stats.reduce((s, x) => s + x.later_n, 0);
    return `Still exploring: every game gets a fair share until each has ${MIN_SAMPLES} later checks (${total} so far).`;
  }
  const best = [...stats].filter((s) => s.mode !== "mock").sort((a, b) => b.score - a.score)[0];
  return `${modeLabel(best.mode)} leads: ${Math.round((best.later_accuracy ?? 0) * 100)}% of words practiced there were right later (${best.later_n} checks).`;
}

/** Aggregated stats sent to Grok: list words and counts only. No name, email, or anything she typed. */
export function mixPayload(stats: ModeStat[], words: WordStat[]) {
  return {
    student: "4th grader, list of 25 spelling words",
    min_samples: MIN_SAMPLES,
    floor: FLOOR,
    cap: CAP,
    modes: stats.map(({ mode, attempts, in_game_accuracy, later_n, later_accuracy }) => ({ mode, attempts, in_game_accuracy, later_n, later_accuracy })),
    words: words.filter((w) => w.attempts > 0).map((w) => ({ word: w.word, attempts: w.attempts, correct: w.correct, streak: w.streak, mastered: w.mastered })),
  };
}

const SYSTEM = [
  "You analyze aggregated spelling practice stats for one 4th-grade student (no identity is given).",
  "Games: listen (hear and type), flash (look, cover, spell), tiles (unscramble letters), fix (correct a misspelling), sort (pick the vowel sound).",
  "later_accuracy = share of words practiced in that game that were spelled right on the first try in a later test-like session; in_game_accuracy is easy to inflate, prefer later_accuracy. Be modest when later_n < min_samples.",
  "Return weights (0..1, one per game: listen, flash, tiles, fix, sort) for how much of the next session each game should get, and note: 1-3 plain sentences for the parent on which way of practicing connects best and which words are hardest. No names. Max 300 characters.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    weights: { type: "array", items: { type: "object", additionalProperties: false, properties: { mode: { type: "string" }, weight: { type: "number" } }, required: ["mode", "weight"] } },
    note: { type: "string" },
  },
  required: ["weights", "note"],
} as const;

export function mixMessages(payload: ReturnType<typeof mixPayload>) {
  return [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(payload) }];
}

/** Validate Grok's answer: all five games, finite numbers, a clean short note. Null = fall back. */
export function validateMix(result: unknown): { weights: Weights; note: string } | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { weights?: unknown; note?: unknown };
  if (!Array.isArray(r.weights) || typeof r.note !== "string") return null;
  const note = r.note.replace(/\s+/g, " ").trim();
  if (!note || note.length > 400 || /https?:|www\.|<|>|@/i.test(note)) return null;
  const raw: Record<string, number> = {};
  for (const w of r.weights as Array<Record<string, unknown>>) {
    if (!w || typeof w.mode !== "string" || !(PRACTICE_MODES as readonly string[]).includes(w.mode)) continue;
    if (typeof w.weight !== "number" || !Number.isFinite(w.weight) || w.weight < 0) return null;
    raw[w.mode] = w.weight;
  }
  if (PRACTICE_MODES.some((m) => raw[m] === undefined)) return null;
  if (PRACTICE_MODES.every((m) => raw[m] === 0)) return null;
  return { weights: clampWeights(raw), note };
}

export type MixAi = (payload: ReturnType<typeof mixPayload>) => Promise<unknown>;

export async function grokMix(payload: ReturnType<typeof mixPayload>, doFetch: typeof fetch = fetch, key = process.env.XAI_API_KEY): Promise<unknown> {
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await doFetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MIX_MODEL, messages: mixMessages(payload), temperature: 0.2, max_tokens: 400, response_format: { type: "json_schema", json_schema: { name: "spelling_mix", strict: true, schema: SCHEMA } } }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" ? JSON.parse(content) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Build the mix (deterministic, or Grok-validated when `ai` is given). Never throws. */
export async function buildMix(attempts: SpellingAttempt[], words: WordStat[], now: number, ai?: MixAi | null): Promise<SpellingMix> {
  const stats = modeStats(attempts);
  const det = deterministicWeights(stats);
  let checked: { weights: Weights; note: string } | null = null;
  if (ai && attempts.length > 0) checked = validateMix(await ai(mixPayload(stats, words)).catch(() => null));
  // While exploring, Grok can't push a game below the explore mix by much: blend 50/50.
  const weights = checked ? (det.phase === "explore" ? clampWeights(Object.fromEntries(PRACTICE_MODES.map((m) => [m, (checked!.weights[m] + det.weights[m]) / 2]))) : checked.weights) : det.weights;
  return { weights, note: checked?.note ?? deterministicNote(stats, det.phase), source: checked ? "ai" : "deterministic", phase: det.phase, model: checked ? MIX_MODEL : null, createdAt: now, stats };
}

/** Read a stored mix back (from the cached plan JSON); null when missing or malformed. */
export function parseMix(value: unknown): SpellingMix | null {
  if (!value || typeof value !== "object") return null;
  const v = value as SpellingMix;
  if (!v.weights || typeof v.note !== "string") return null;
  return { ...v, weights: clampWeights(v.weights) };
}

export type SessionRound = { mode: PracticeMode | "mock"; words: string[] };

/** Slots per game by largest remainder; every game gets at least one slot (so it keeps measuring). */
export function allocateSlots(weights: Weights, slots = SESSION_SLOTS): Record<PracticeMode, number> {
  const exact = PRACTICE_MODES.map((m) => ({ m, x: weights[m] * slots }));
  const out = Object.fromEntries(exact.map(({ m, x }) => [m, Math.max(1, Math.floor(x))])) as Record<PracticeMode, number>;
  let left = slots - PRACTICE_MODES.reduce((s, m) => s + out[m], 0);
  const byRem = [...exact].sort((a, b) => (b.x - Math.floor(b.x)) - (a.x - Math.floor(a.x)) || weights[b.m] - weights[a.m]);
  for (let i = 0; left > 0; i = (i + 1) % byRem.length, left--) out[byRem[i].m] += 1;
  return out;
}

/** Warm-up order: see it, build it, hear it, fix it, then spell from sound. */
const ROUND_ORDER: PracticeMode[] = ["flash", "tiles", "sort", "fix", "listen"];

/**
 * Today's guided session: focus words = unmastered + most missed first; one short round per game
 * (round length = its share of the slots), cycling through the focus words, then a mock check on
 * the weakest words.
 */
export function planSession(stats: WordStat[], weights: Weights, now: number): SessionRound[] {
  const byMiss = (a: WordStat, b: WordStat) => (b.attempts - b.correct) - (a.attempts - a.correct);
  const queue = practiceQueue(stats, now, D2_WORDS.length);
  const rank = new Map(queue.map((w, i) => [w, i]));
  const unmastered = stats.filter((s) => !s.mastered).sort((a, b) => byMiss(a, b) || (rank.get(a.word) ?? 99) - (rank.get(b.word) ?? 99));
  const pool = (unmastered.length ? unmastered : [...stats].sort(byMiss)).map((s) => s.word);
  const focus = pool.slice(0, FOCUS_WORDS);
  const slots = allocateSlots(weights);
  const rounds: SessionRound[] = [];
  let k = 0;
  for (const mode of ROUND_ORDER) {
    const n = slots[mode];
    const words: string[] = [];
    for (let i = 0; i < n; i++) {
      // Pick the next focus word not already in this round.
      let w = focus[k % focus.length];
      for (let j = 0; j < focus.length && words.includes(w); j++) w = focus[(k + j + 1) % focus.length];
      k += 1;
      if (!words.includes(w)) words.push(w);
    }
    if (words.length) rounds.push({ mode, words });
  }
  rounds.push({ mode: "mock", words: focus.slice(0, CHECK_WORDS) });
  return rounds;
}

