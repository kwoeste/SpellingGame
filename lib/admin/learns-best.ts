/** "How Mae learns best": re-teach modality results per subject, plus the planner's notes. */
import type { Modality, ModalityEpisode, SessionPlanRecord } from "@/lib/engine/repo";
import { EXPLORE_RATE } from "@/lib/engine/modality";

/** Below this many resolved tries an arm is "Still exploring" and can't be called best. */
export const MIN_ATTEMPTS = 8;

export const MODALITY_LABEL: Record<Modality, string> = {
  watch: "Watch the recap",
  read: "Careful read",
  retry: "Straight retry",
};

export type ArmView = {
  modality: Modality;
  label: string;
  attempts: number;
  successes: number;
  successRate: number | null;
  /** Posterior mean of Beta(1+s, 1+f). */
  estimate: number;
  exploring: boolean;
  open: number;
};

export type LearnsBestView = {
  exploreRate: number;
  minAttempts: number;
  totalEpisodes: number;
  subjects: { subject: string; arms: ArmView[]; best: Modality | null; summary: string }[];
  notes: { createdAt: number; source: "ai" | "deterministic"; adminNote: string; whyKid: string }[];
};

export function buildLearnsBest(
  episodes: Array<ModalityEpisode & { learnerId: string }>,
  plans: Array<SessionPlanRecord & { learnerId: string }>,
  learnerId: string,
): LearnsBestView {
  const mine = episodes.filter((e) => e.learnerId === learnerId);
  const subjects = [...new Set(mine.map((e) => e.subject))].sort();
  return {
    exploreRate: EXPLORE_RATE,
    minAttempts: MIN_ATTEMPTS,
    totalEpisodes: mine.length,
    subjects: subjects.map((subject) => {
      const rows = mine.filter((e) => e.subject === subject);
      const arms: ArmView[] = (["watch", "read", "retry"] as Modality[])
        .map((modality) => {
          const all = rows.filter((e) => e.modality === modality);
          const done = all.filter((e) => e.success !== null);
          const successes = done.filter((e) => e.success).length;
          return {
            modality,
            label: MODALITY_LABEL[modality],
            attempts: done.length,
            successes,
            successRate: done.length ? successes / done.length : null,
            estimate: (1 + successes) / (2 + done.length),
            exploring: done.length < MIN_ATTEMPTS,
            open: all.length - done.length,
          };
        })
        .filter((arm) => arm.attempts > 0 || arm.open > 0);
      const ready = arms.filter((arm) => !arm.exploring).sort((a, b) => b.estimate - a.estimate);
      const best = ready[0]?.modality ?? null;
      const summary = best
        ? `${MODALITY_LABEL[best]} works best so far (${Math.round((ready[0].successRate ?? 0) * 100)}% first-try success after it).`
        : `Still exploring: each way needs ${MIN_ATTEMPTS} finished tries before we call a winner.`;
      return { subject, arms, best, summary };
    }),
    notes: plans
      .filter((p) => p.learnerId === learnerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((p) => {
        const plan = p.plan as { adminNote?: unknown; whyKid?: unknown };
        return {
          createdAt: p.createdAt,
          source: p.source,
          adminNote: typeof plan.adminNote === "string" ? plan.adminNote : "",
          whyKid: typeof plan.whyKid === "string" ? plan.whyKid : "",
        };
      }),
  };
}
