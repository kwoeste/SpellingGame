import { buildAssignments, buildKnowledgeMap, buildOverview, buildProgress, buildSessions, buildWrongAnswers, type DashboardSnapshot } from "@/lib/admin/dashboard";
import { buildLearnsBest } from "@/lib/admin/learns-best";
import { subjectLabel, type AssignmentRow, type LearnerGoal } from "@/lib/admin/types";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { adminRepo } from "@/lib/engine/repos";

const DEFAULT_LEARNER = { id: SEEDED_LEARNER_ID, nickname: "Mae" };

export async function loadSnapshot(now = Date.now(), learnerId = DEFAULT_LEARNER.id): Promise<DashboardSnapshot> {
  const repo = adminRepo();
  const [mastery, events, sessions, reviews, xp, strategies, assignments, goals, gatedChapterIds] = await Promise.all([
    repo.mastery(),
    repo.events(2000),
    repo.sessions(200),
    repo.reviews(),
    repo.xpLedger(),
    repo.strategies(2000),
    repo.assignments(),
    repo.goals(),
    repo.gatedChapterIds(learnerId),
  ]);
  const goalRow = goals.find((row) => row.learnerId === learnerId) ?? null;
  const goal: LearnerGoal | null = goalRow
    ? {
        learnerId: goalRow.learnerId,
        weeklyXpGoal: goalRow.weeklyXpGoal,
        dailyMinutesGoal: goalRow.dailyMinutesGoal,
        updatedAt: goalRow.updatedAt,
        updatedBy: goalRow.updatedBy,
      }
    : null;
  return {
    learnerId,
    nickname: DEFAULT_LEARNER.nickname,
    now,
    mastery,
    events,
    sessions,
    reviews,
    xp,
    strategies,
    assignments: assignments as AssignmentRow[],
    goal,
    gatedChapterIds,
  };
}

export async function loadOverview(now = Date.now()) {
  return buildOverview(await loadSnapshot(now));
}

export async function loadProgress(now = Date.now()) {
  return buildProgress(await loadSnapshot(now));
}

export async function loadKnowledgeMap(now = Date.now()) {
  return buildKnowledgeMap(await loadSnapshot(now));
}

export async function loadWrongAnswers(now = Date.now()) {
  return buildWrongAnswers(await loadSnapshot(now));
}

export async function loadSessions(now = Date.now()) {
  return buildSessions(await loadSnapshot(now));
}

export async function loadAssignments(now = Date.now()) {
  return buildAssignments(await loadSnapshot(now));
}

export async function loadLearnsBest(now = Date.now()) {
  const repo = adminRepo();
  const since = new Date(now - 14 * 86_400_000).toISOString().slice(0, 10);
  const [episodes, plans, insights] = await Promise.all([
    repo.modalityEpisodes(),
    repo.sessionPlans(since),
    repo.insights(DEFAULT_LEARNER.id, 6).catch(() => []),
  ]);
  return buildLearnsBest(episodes, plans, DEFAULT_LEARNER.id, insights);
}

import { groupByKey } from "@/lib/admin/group";
import { targetName } from "@/lib/admin/names";

export type HomeSummary = {
  plan: { title: string; minutes: number; done: boolean; href: string }[] | null;
  planGoalMinutes: number | null;
  planNote: string | null;
  /** One row per question (repeats collapsed), newest first. */
  recentMisses: { id: string; question: string; chapter: string | null; at: number; count?: number }[];
  needsReteach: { key: string; label: string; chapter?: string | null }[];
  learnsBest: { subject: string; summary: string }[];
  lowStock: string[];
  inventoryError: boolean;
};

/** Everything the admin home "Quick look" needs. Reads stored data only; never calls an AI. */
export async function loadHome(now = Date.now()): Promise<HomeSummary> {
  const repo = adminRepo();
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const snapshot = await loadSnapshot(now);
  const wrong = buildWrongAnswers(snapshot);
  const [plans, learns, inventory] = await Promise.all([
    repo.sessionPlans(today).catch(() => []),
    loadLearnsBest(now).catch(() => null),
    (async () => {
      try {
        const inv = await import("@/lib/admin/inventory-repo");
        const [spools, items] = await Promise.all([inv.listFilamentSpools(), inv.listStoreItems()]);
        return {
          low: [
            ...spools.filter((s) => s.lowStock).map((s) => `${s.color} ${s.material} filament`),
            ...items.filter((i) => i.lowStock).map((i) => i.name),
          ],
          error: false,
        };
      } catch {
        return { low: [] as string[], error: true };
      }
    })(),
  ]);
  const mine = plans
    .filter((p) => p.learnerId === DEFAULT_LEARNER.id && p.day === today)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const raw = mine?.plan as { blocks?: unknown; goalMinutes?: unknown; adminNote?: unknown } | undefined;
  const blocks = Array.isArray(raw?.blocks) ? (raw!.blocks as Record<string, unknown>[]) : null;
  return {
    plan: blocks
      ? blocks.map((b) => ({
          title: String(b.title ?? "Activity"),
          minutes: Number(b.minutes) || 0,
          done: Boolean(b.done),
          href: typeof b.href === "string" && b.href.startsWith("/") ? b.href : "/study",
        }))
      : null,
    planGoalMinutes: typeof raw?.goalMinutes === "number" ? raw.goalMinutes : null,
    // The planner's own note is written for the engine, not parents; keep it off the page.
    planNote: null,
    recentMisses: groupByKey(wrong.rows, (r) => r.itemId, (r) => r.ts)
      .slice(0, 5)
      .map((g) => ({ id: g.first.eventId, question: g.first.itemText, chapter: g.first.chapterLabel ?? null, at: g.latestAt, count: g.count })),
    needsReteach: groupByKey(
      wrong.needsReteach.filter((r) => !r.cleared),
      (r) => `${r.chapterId ?? r.source}|${r.label}`,
      (r) => r.lastTs,
    )
      .slice(0, 5)
      .map((g) => ({ key: g.first.key, label: g.first.label, chapter: g.first.chapterId ? targetName(g.first.chapterId) : null })),
    learnsBest: learns?.insight?.summary
      ? [{ subject: "all", summary: learns.insight.summary }]
      : (learns?.subjects ?? []).filter((s) => s.best).map((s) => ({ subject: s.subject, summary: `${subjectLabel(s.subject)}: ${s.summary}` })),
    lowStock: inventory.low,
    inventoryError: inventory.error,
  };
}
