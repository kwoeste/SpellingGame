import type { EngineRepo, LearnerTx, StoredEvent } from "@/lib/engine/repo";
import { awardMinute, currentSession, type EngineActor } from "@/lib/engine/service";
import { findListWord, isVowelId, spellingList, type SpellingList } from "@/lib/spelling/catalog";
import { LIST_ID, VOWEL_KEY, type Vowel } from "@/lib/spelling/list-d2";
import { buildMix, parseMix, planSession, type SessionRound, type SpellingMix } from "@/lib/spelling/mix";
import { SPELLING_MODES, gradeSpelling, helpLevelNumber, masteredCount, practiceQueue, spellingHelp, wordStats, type SpellingAttempt, type WordStat } from "@/lib/spelling/engine";

export const SPELLING_EVENT = "spelling_attempt";

function listOrDefault(id: unknown): SpellingList | null {
  return spellingList(typeof id === "string" && id ? id : LIST_ID);
}

export function attemptsFromEvents(events: Pick<StoredEvent, "type" | "isCorrect" | "payload" | "serverTs" | "activityId" | "isPreview">[], listId: string = LIST_ID): SpellingAttempt[] {
  return events
    .filter((e) => e.type === SPELLING_EVENT && e.activityId === listId && !e.isPreview && typeof e.payload?.word === "string")
    .map((e) => ({
      word: String(e.payload!.word),
      correct: e.isCorrect === true,
      firstTry: e.payload?.first_try === true,
      mode: String(e.payload?.mode ?? ""),
      at: e.serverTs,
      neededHelp: e.payload?.needed_help === true,
    }));
}

export async function learnerSpellingStats(tx: LearnerTx, listId: string = LIST_ID): Promise<WordStat[]> {
  const list = listOrDefault(listId);
  return wordStats(attemptsFromEvents(await tx.eventsSince(0, [SPELLING_EVENT]), list?.id ?? listId), list?.words);
}

export type SpellingSummary = { stats: WordStat[]; mastered: number; total: number; queue: string[] };

export async function spellingSummary(repo: EngineRepo, actor: EngineActor, now = Date.now(), listId: string = LIST_ID): Promise<SpellingSummary | null> {
  const list = listOrDefault(listId);
  if (!list) return null;
  if (!actor.learnerId) return { stats: wordStats([], list.words), mastered: 0, total: list.words.length, queue: practiceQueue(wordStats([], list.words), now) };
  return repo.withLearner(actor.learnerId, async (tx) => {
    const stats = await learnerSpellingStats(tx, list.id);
    return { stats, mastered: masteredCount(stats), total: list.words.length, queue: practiceQueue(stats, now) };
  });
}

export type CheckInput = { word: unknown; typed?: unknown; vowel?: unknown; sort?: unknown; mode: unknown; misses: unknown; retry?: unknown; phase?: unknown; sessionId?: string | null; list?: unknown };
export type CheckResult = {
  correct: boolean;
  help: ReturnType<typeof spellingHelp>;
  stat: WordStat | null;
  vowel?: { answer: Vowel; label: string } | null;
  sort?: { answer: string; label: string } | null;
};

/** Grades on the server and stores the attempt (per learner, so progress follows her across devices). */
export async function checkSpelling(repo: EngineRepo, actor: EngineActor, input: CheckInput, now = Date.now()): Promise<CheckResult | null> {
  const list = listOrDefault(input.list);
  const word = list ? findListWord(list, input.word) : null;
  const mode = SPELLING_MODES.find((m) => m === input.mode);
  if (!list || !word || !mode) return null;
  const misses = typeof input.misses === "number" && Number.isFinite(input.misses) ? Math.max(0, Math.min(20, Math.floor(input.misses))) : 0;
  const sortId = list.sortKey(word);
  const picked = typeof input.sort === "string" ? input.sort : typeof input.vowel === "string" ? input.vowel : "";
  const correct = mode === "sort" ? picked === sortId : gradeSpelling(word, input.typed);
  const phase = input.phase === "copy" || input.phase === "memory" ? input.phase : "try";
  const neededHelp = misses > 0 || phase !== "try";
  const choice = list.sortChoices.find((item) => item.id === sortId);
  const help = phase !== "try" ? { level: "none" as const } : correct ? { level: "none" as const } : mode === "sort" ? { level: "reveal" as const, hint: choice?.hint } : spellingHelp(word, misses + 1);
  const vowel = mode === "sort" && isVowelId(sortId) ? { answer: sortId, label: VOWEL_KEY[sortId].label } : null;
  const sort = mode === "sort" ? { answer: sortId, label: choice?.label ?? sortId } : null;
  if (!actor.learnerId) return { correct, help, stat: null, vowel, sort };
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
      activityId: list.id,
      attemptNo: misses + 1,
      response: mode === "sort" ? picked.slice(0, 12) : String(input.typed ?? "").slice(0, 40),
      isCorrect: correct,
      latencyMs: null,
      hintLevel: phase !== "try" ? 3 : helpLevelNumber(misses),
      payload: { word: word.word, mode, first_try: misses === 0 && phase === "try" && input.retry !== true, needed_help: neededHelp, ...(phase !== "try" ? { phase } : {}), list: list.id },
      isPreview: false,
    });
    await awardMinute(tx, session.id, now, false);
    session.lastEventAt = now;
    await tx.updateSession(session);
    const stat = (await learnerSpellingStats(tx, list.id)).find((s) => s.word === word.word) ?? null;
    return { correct, help, stat, vowel, sort };
  });
}

/** End-of-round summary (mock test score, missed words) for the admin page. */
export async function finishSpellingRound(repo: EngineRepo, actor: EngineActor, input: { mode: unknown; score: unknown; total: unknown; missed: unknown; sessionId?: string | null; list?: unknown }, now = Date.now()) {
  const list = listOrDefault(input.list);
  if (!actor.learnerId || !list) return;
  const mode = SPELLING_MODES.find((m) => m === input.mode) ?? "listen";
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.floor(v))) : 0);
  const missed = Array.isArray(input.missed) ? input.missed.map((x) => findListWord(list, x)?.word).filter((x): x is string => Boolean(x)).slice(0, 30) : [];
  await repo.withLearner(actor.learnerId, async (tx) => {
    const session = await currentSession(tx, input.sessionId ?? null, "spelling", now);
    await tx.insertEvent({
      id: crypto.randomUUID(), sessionId: session.id, learnerId: tx.learnerId, seq: Math.min(2 ** 31 - 1, Math.max(0, now - session.startedAt)),
      clientTs: null, serverTs: now, type: "game_event", itemId: null, activityId: list.id, attemptNo: null, response: null, isCorrect: null,
      latencyMs: null, hintLevel: null, payload: { game_id: list.id, detail: "finished", mode, score: num(input.score), total: num(input.total), missed }, isPreview: false,
    });
    session.lastEventAt = now;
    await tx.updateSession(session);
  });
}

/**
 * Today's guided session for the spelling page: the mix stored with this sign-in's plan (built once,
 * maybe by Grok), else deterministic weights from her attempts; rounds use live word stats.
 */
function mixForList(cached: SpellingMix | null, listId: string): SpellingMix | null {
  if (!cached) return null;
  if (cached.listId === listId) return cached;
  if (!cached.listId && listId === LIST_ID) return cached;
  return null;
}

export async function spellingSession(repo: EngineRepo, learnerId: string | null, loginId: string | null, now = Date.now(), listId: string = LIST_ID): Promise<{ mix: SpellingMix; rounds: SessionRound[] }> {
  const list = listOrDefault(listId);
  const words = list?.words;
  if (!list) {
    const mix = await buildMix([], wordStats([]), now, null);
    return { mix, rounds: planSession(wordStats([]), mix.weights, now) };
  }
  if (!learnerId) {
    const stats = wordStats([], words);
    const mix = await buildMix([], stats, now, null);
    return { mix, rounds: planSession(stats, mix.weights, now) };
  }
  return repo.withLearner(learnerId, async (tx) => {
    const attempts = attemptsFromEvents(await tx.eventsSince(0, [SPELLING_EVENT]), list.id);
    const stats = wordStats(attempts, words);
    const cached = loginId ? await tx.getSessionPlan(loginId).catch(() => null) : null;
    const mix = mixForList(parseMix((cached?.plan as { spellingMix?: unknown } | undefined)?.spellingMix), list.id) ?? (await buildMix(attempts, stats, now, null));
    return { mix, rounds: planSession(stats, mix.weights, now) };
  });
}
