/** "How Mae learns best": re-teach modality results per subject, plus the planner's notes. */
import type { LearningInsight, Modality, ModalityEpisode, SessionPlanRecord } from "@/lib/engine/repo";
import { ALL_MODALITIES, EXPLORE_RATE } from "@/lib/engine/modality";

/** Below this many resolved tries an arm is "Still exploring" and can't be called best. */
export const MIN_ATTEMPTS = 8;

export const MODALITY_LABEL: Record<Modality, string> = {
  watch: "Watch the recap",
  read: "Careful read",
  retry: "Straight retry",
  nlm_video: "NotebookLM video",
  nlm_podcast: "NotebookLM podcast",
  nlm_flashcards: "NotebookLM flashcards",
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
  firstTeach: number;
  reteach: number;
  /** Median seconds on the follow-up answer. */
  medianSec: number | null;
  rushRate: number | null;
};

export type InsightView = {
  createdAt: number;
  trigger: LearningInsight["trigger"];
  source: LearningInsight["source"];
  model: string | null;
  summary: string;
  confidence: string;
  weights: Array<{ subject: string; modality: Modality; label: string; weight: number }>;
};

export type LearnsBestView = {
  exploreRate: number;
  minAttempts: number;
  totalEpisodes: number;
  subjects: { subject: string; arms: ArmView[]; best: Modality | null; summary: string }[];
  insight: InsightView | null;
  history: Array<Pick<InsightView, "createdAt" | "trigger" | "source">>;
  notes: { createdAt: number; source: "ai" | "deterministic"; adminNote: string; whyKid: string; preview: boolean }[];
};

export function buildLearnsBest(
  episodes: Array<ModalityEpisode & { learnerId: string }>,
  plans: Array<SessionPlanRecord & { learnerId: string }>,
  learnerId: string,
  insights: LearningInsight[] = [],
): LearnsBestView {
  const latest = [...insights].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  const mine = episodes.filter((e) => e.learnerId === learnerId);
  const subjects = [...new Set(mine.map((e) => e.subject))].sort();
  return {
    exploreRate: EXPLORE_RATE,
    minAttempts: MIN_ATTEMPTS,
    totalEpisodes: mine.length,
    subjects: subjects.map((subject) => {
      const rows = mine.filter((e) => e.subject === subject);
      const arms: ArmView[] = ALL_MODALITIES
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
            firstTeach: done.filter((e) => e.context === "first_teach").length,
            reteach: done.filter((e) => e.context !== "first_teach").length,
            medianSec: medianSec(done.map((e) => e.followupLatencyMs)),
            rushRate: rushRate(done.map((e) => e.followupRushed)),
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
    insight: latest
      ? {
          createdAt: latest.createdAt,
          trigger: latest.trigger,
          source: latest.source,
          model: latest.model,
          summary: latest.summary,
          confidence: latest.confidence,
          weights: Object.entries(latest.weights)
            .flatMap(([subject, byMod]) =>
              Object.entries(byMod ?? {}).map(([modality, weight]) => ({ subject, modality: modality as Modality, label: MODALITY_LABEL[modality as Modality] ?? modality, weight: Number(weight) })),
            )
            .sort((a, b) => a.subject.localeCompare(b.subject) || b.weight - a.weight),
        }
      : null,
    history: [...insights].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map((i) => ({ createdAt: i.createdAt, trigger: i.trigger, source: i.source })),
    notes: plans
      .filter((p) => p.learnerId === learnerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((p) => {
        const plan = p.plan as { adminNote?: unknown; whyKid?: unknown };
        return {
          createdAt: p.createdAt,
          preview: p.loginId.startsWith("preview:"),
          source: p.source,
          adminNote: typeof plan.adminNote === "string" ? plan.adminNote : "",
          whyKid: typeof plan.whyKid === "string" ? plan.whyKid : "",
        };
      }),
  };
}

function medianSec(values: Array<number | null | undefined>): number | null {
  const xs = values.filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const m = Math.floor(xs.length / 2);
  return Math.round((xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2) / 100) / 10;
}

function rushRate(values: Array<boolean | null | undefined>): number | null {
  const known = values.filter((x): x is boolean => typeof x === "boolean");
  return known.length ? known.filter(Boolean).length / known.length : null;
}
