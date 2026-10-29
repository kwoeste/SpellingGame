import type { EngineRepo, LearnerTx, StoredEvent } from "@/lib/engine/repo";
import { awardMinute, currentSession, type EngineActor } from "@/lib/engine/service";
import { D2_WORDS, LIST_ID, VOWEL_KEY, findWord, type Vowel } from "@/lib/spelling/list-d2";
import { buildMix, parseMix, planSession, type SessionRound, type SpellingMix } from "@/lib/spelling/mix";
import { SPELLING_MODES, gradeSpelling, masteredCount, practiceQueue, spellingHelp, wordStats, type SpellingAttempt, type WordStat } from "@/lib/spelling/engine";

export const SPELLING_EVENT = "spelling_attempt";

export function attemptsFromEvents(events: Pick<StoredEvent, "type" | "isCorrect" | "payload" | "serverTs" | "activityId" | "isPreview">[]): SpellingAttempt[] {
  return events
    .filter((e) => e.type === SPELLING_EVENT && e.activityId === LIST_ID && !e.isPreview && typeof e.payload?.word === "string")
    .map((e) => ({
      word: String(e.payload!.word),
      correct: e.isCorrect === true,
      firstTry: e.payload?.first_try === true,
      mode: String(e.payload?.mode ?? ""),
      at: e.serverTs,
    }));
}

export async function learnerSpellingStats(tx: LearnerTx): Promise<WordStat[]> {
  return wordStats(attemptsFromEvents(await tx.eventsSince(0, [SPELLING_EVENT])));
}

export type SpellingSummary = { stats: WordStat[]; mastered: number; total: number; queue: string[] };

export async function spellingSummary(repo: EngineRepo, actor: EngineActor, now = Date.now()): Promise<SpellingSummary | null> {
  if (!actor.learnerId) return null;
  return repo.withLearner(actor.learnerId, async (tx) => {
    const stats = await learnerSpellingStats(tx);
    return { stats, mastered: masteredCount(stats), total: D2_WORDS.length, queue: practiceQueue(stats, now) };
  });
}

export type CheckInput = { word: unknown; typed?: unknown; vowel?: unknown; mode: unknown; misses: unknown; retry?: unknown; sessionId?: string | null };
export type CheckResult = {
  correct: boolean;
  help: ReturnType<typeof spellingHelp>;
  stat: WordStat | null;
  vowel?: { answer: Vowel; label: string } | null;
};

/** Grades on the server and stores the attempt (per learner, so progress follows her across devices). */
export async function checkSpelling(repo: EngineRepo, actor: EngineActor, input: CheckInput, now = Date.now()): Promise<CheckResult | null> {
  const word = findWord(input.word);
  const mode = SPELLING_MODES.find((m) => m === input.mode);
  if (!word || !mode) return null;
  const misses = typeof input.misses === "number" && Number.isFinite(input.misses) ? Math.max(0, Math.min(20, Math.floor(input.misses))) : 0;
  const correct = mode === "sort" ? input.vowel === word.vowel : gradeSpelling(word, input.typed);
  const help = correct ? { level: "none" as const } : mode === "sort" ? { level: "reveal" as const, hint: VOWEL_KEY[word.vowel].example } : spellingHelp(word, misses + 1);
  const vowel = mode === "sort" ? { answer: word.vowel, label: VOWEL_KEY[word.vowel].label } : null;
  if (!actor.learnerId) return { correct, help, stat: null, vowel };
  return repo.withLearner(actor.learnerId, async (tx) => {
    const session = await currentSession(tx, input.sessionId ?? null, "spelling", now);
    await tx.insertEvent({
      id: crypto.randomUUID(),
      sessionId: session.id,
      learnerId: tx.learnerId,
      seq: Math.min(2 ** 31 - 1, Math.max(0, now - session.startedAt)),
      clientTs: null,
      serverTs: now,
      type: SPELLING_EVENT,
      itemId: null,
      activityId: LIST_ID,
      attemptNo: misses + 1,
      response: mode === "sort" ? String(input.vowel ?? "").slice(0, 2) : String(input.typed ?? "").slice(0, 40),
      isCorrect: correct,
      latencyMs: null,
      hintLevel: misses + 1 >= 5 ? 3 : misses + 1 >= 4 ? 1 : 0,
      payload: { word: word.word, mode, first_try: misses === 0 && input.retry !== true, list: LIST_ID },
      isPreview: false,
    });
    await awardMinute(tx, session.id, now, false);
    session.lastEventAt = now;
    await tx.updateSession(session);
    const stat = (await learnerSpellingStats(tx)).find((s) => s.word === word.word) ?? null;
    return { correct, help, stat, vowel };
  });
}

/** End-of-round summary (mock test score, missed words) for the admin page. */
export async function finishSpellingRound(repo: EngineRepo, actor: EngineActor, input: { mode: unknown; score: unknown; total: unknown; missed: unknown; sessionId?: string | null }, now = Date.now()) {
  if (!actor.learnerId) return;
  const mode = SPELLING_MODES.find((m) => m === input.mode) ?? "listen";
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.floor(v))) : 0);
  const missed = Array.isArray(input.missed) ? input.missed.map((x) => findWord(x)?.word).filter((x): x is string => Boolean(x)).slice(0, 30) : [];
  await repo.withLearner(actor.learnerId, async (tx) => {
    const session = await currentSession(tx, input.sessionId ?? null, "spelling", now);
    await tx.insertEvent({
      id: crypto.randomUUID(), sessionId: session.id, learnerId: tx.learnerId, seq: Math.min(2 ** 31 - 1, Math.max(0, now - session.startedAt)),
      clientTs: null, serverTs: now, type: "game_event", itemId: null, activityId: LIST_ID, attemptNo: null, response: null, isCorrect: null,
      latencyMs: null, hintLevel: null, payload: { game_id: LIST_ID, detail: "finished", mode, score: num(input.score), total: num(input.total), missed }, isPreview: false,
    });
    session.lastEventAt = now;
    await tx.updateSession(session);
  });
}

/**
 * Today's guided session for the spelling page: the mix stored with this sign-in's plan (built once,
 * maybe by Grok), else deterministic weights from her attempts; rounds use live word stats.
 */
export async function spellingSession(repo: EngineRepo, learnerId: string | null, loginId: string | null, now = Date.now()): Promise<{ mix: SpellingMix; rounds: SessionRound[] }> {
  if (!learnerId) {
    const mix = await buildMix([], wordStats([]), now, null);
    return { mix, rounds: planSession(wordStats([]), mix.weights, now) };
  }
  return repo.withLearner(learnerId, async (tx) => {
    const attempts = attemptsFromEvents(await tx.eventsSince(0, [SPELLING_EVENT]));
    const stats = wordStats(attempts);
    const cached = loginId ? await tx.getSessionPlan(loginId).catch(() => null) : null;
    const mix = parseMix((cached?.plan as { spellingMix?: unknown } | undefined)?.spellingMix) ?? (await buildMix(attempts, stats, now, null));
    return { mix, rounds: planSession(stats, mix.weights, now) };
  });
}
