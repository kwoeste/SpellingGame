import { buildAssignments, buildKnowledgeMap, buildOverview, buildProgress, buildSessions, buildWrongAnswers, type DashboardSnapshot } from "@/lib/admin/dashboard";
import { buildLearnsBest } from "@/lib/admin/learns-best";
import type { AssignmentRow, LearnerGoal } from "@/lib/admin/types";
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
  const [episodes, plans] = await Promise.all([repo.modalityEpisodes(), repo.sessionPlans(since)]);
  return buildLearnsBest(episodes, plans, DEFAULT_LEARNER.id);
}
