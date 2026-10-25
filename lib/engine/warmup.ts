import type { AppRole } from "@/lib/auth/allowlist";
import type { EngineRepo, LearnerTx } from "@/lib/engine/repo";
import { chapterVisibleTo, toStudentChapter, type StudentChapter, type StudentStep } from "@/lib/content/student";
import { predictedCorrect } from "@/lib/engine/elo";
import { etDayStart } from "@/lib/engine/plan-time";
import { itemSelectionScore, pickBestItem } from "@/lib/engine/zone";
import { RETEACH_TARGET, guessRate, locateItem } from "@/lib/engine/service";

export const WARMUP_MAX = 8;
/** Warm-up aims a little easier than new work: retrieval should feel winnable. */
export const WARMUP_TARGET = 0.85;

export type WarmupItem = { itemId: string; chapterId: string; conceptId: string; predicted: number; dueAt: number };

/**
 * Due spaced reviews for the warm-up, best first. Skips items with an open re-teach flag (that path
 * owns them) and items already answered today, whose review box would not move (attemptNo > 1).
 */
export async function warmupQueue(tx: LearnerTx, role: AppRole, nowMs: number, random = Math.random): Promise<WarmupItem[]> {
  const reviews = await tx.listReviews("item");
  const reteach = new Set(
    (await tx.listReviews(RETEACH_TARGET)).filter((row) => row.lastResult === "fail").map((row) => row.targetId),
  );
  const answeredToday = new Set(
    (await tx.eventsSince(etDayStart(nowMs) - 1, ["answer_submitted"])).map((event) => event.itemId).filter(Boolean) as string[],
  );
  const pool: WarmupItem[] = [];
  for (const row of reviews) {
    if (row.dueAt > nowMs || reteach.has(row.targetId) || answeredToday.has(row.targetId)) continue;
    const located = locateItem(row.targetId);
    if (!located || !chapterVisibleTo(located.chapter, role)) continue;
    const mastery = await tx.getMastery(located.item.conceptId);
    const rating = await tx.getItemRating(located.item.id);
    const predicted = predictedCorrect(mastery?.theta ?? 0, rating?.difficulty ?? 0, guessRate(located.item));
    pool.push({ itemId: located.item.id, chapterId: located.chapter.id, conceptId: located.item.conceptId, predicted, dueAt: row.dueAt });
  }
  const out: WarmupItem[] = [];
  const seenConcepts = new Set<string>();
  while (out.length < WARMUP_MAX && pool.length) {
    const best = pickBestItem(
      pool,
      (c) =>
        itemSelectionScore({
          predicted: c.predicted,
          target: WARMUP_TARGET,
          dueReview: true,
          holeFill: false,
          interestMatch: false,
          // Spread concepts: a concept not yet in the warm-up counts as novel.
          templateNovelty: !seenConcepts.has(c.conceptId),
        }),
      random,
    );
    if (!best) break;
    out.push(best);
    seenConcepts.add(best.conceptId);
    pool.splice(pool.indexOf(best), 1);
  }
  return out;
}

/** Browser-safe warm-up entries (no answers), for the /study/warmup page. */
export async function warmupEntries(
  repo: EngineRepo,
  actor: { role: AppRole; learnerId: string | null },
  nowMs = Date.now(),
): Promise<Array<{ chapter: StudentChapter; step: StudentStep }>> {
  if (!actor.learnerId) return [];
  const queue = await repo.withLearner(actor.learnerId, (tx) => warmupQueue(tx, actor.role, nowMs));
  const out: Array<{ chapter: StudentChapter; step: StudentStep }> = [];
  for (const row of queue) {
    const located = locateItem(row.itemId);
    if (!located) continue;
    const chapter = toStudentChapter(located.chapter);
    const step = chapter.steps.find((s) => s.itemId === row.itemId);
    if (step) out.push({ chapter, step });
  }
  return out;
}
