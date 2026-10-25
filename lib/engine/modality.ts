/**
 * Re-teach modality chooser: Thompson sampling over how Mae is re-taught a missed item
 * (watch the recap, careful read, or straight retry), per subject, with a floor of
 * EXPLORE_RATE uniform exploration so a single early result never locks one arm in.
 */
import { chapterVisibleTo } from "@/lib/content/student";
import { getRecap } from "@/lib/content/recaps";
import type { EngineRepo, Modality, ModalityEpisode } from "@/lib/engine/repo";
import { locateItem, type EngineActor } from "@/lib/engine/service";

export const EXPLORE_RATE = 0.15;
/** A reload within this window reuses the open episode instead of re-rolling. */
export const EPISODE_REUSE_MS = 6 * 60 * 60 * 1000;
export const MODALITIES: Modality[] = ["watch", "read", "retry"];

type Rng = () => number;

function normal(random: Rng): number {
  const u = Math.max(random(), 1e-12);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Marsaglia–Tsang gamma sampler (shape >= 1, which Beta(1+s, 1+f) always is). */
function gamma(shape: number, random: Rng): number {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (let i = 0; i < 100; i += 1) {
    const x = normal(random);
    const v = (1 + c * x) ** 3;
    if (v <= 0) continue;
    const u = Math.max(random(), 1e-12);
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
  return d;
}

export function sampleBeta(a: number, b: number, random: Rng = Math.random): number {
  const x = gamma(a, random);
  const y = gamma(b, random);
  return x / (x + y);
}

export type ArmStats = { modality: Modality; successes: number; failures: number };

export function armStats(episodes: ModalityEpisode[], subject: string, arms: Modality[]): ArmStats[] {
  return arms.map((modality) => {
    const done = episodes.filter((e) => e.subject === subject && e.modality === modality && e.success !== null);
    const successes = done.filter((e) => e.success).length;
    return { modality, successes, failures: done.length - successes };
  });
}

/** Pick an arm: explore uniformly with EXPLORE_RATE, else the highest Beta(1+s, 1+f) sample. */
export function chooseArm(stats: ArmStats[], random: Rng = Math.random): Pick<ModalityEpisode, "modality" | "chosenBy" | "samples"> {
  if (stats.length === 1) return { modality: stats[0].modality, chosenBy: "only_option", samples: {} };
  if (random() < EXPLORE_RATE) {
    const pick = stats[Math.min(stats.length - 1, Math.floor(random() * stats.length))];
    return { modality: pick.modality, chosenBy: "explore", samples: {} };
  }
  const samples: Record<string, number> = {};
  let best = stats[0];
  for (const arm of stats) {
    samples[arm.modality] = Math.round(sampleBeta(1 + arm.successes, 1 + arm.failures, random) * 1000) / 1000;
    if (samples[arm.modality] > (samples[best.modality] ?? -1)) best = arm;
  }
  return { modality: best.modality, chosenBy: "thompson", samples };
}

/** Choose (and record) how to re-teach this item. Admin previews and unknown items get the default. */
export async function chooseReteachModality(
  repo: EngineRepo,
  actor: EngineActor,
  itemId: string,
  now = Date.now(),
  random: Rng = Math.random,
): Promise<Modality | null> {
  const located = locateItem(itemId);
  if (!located || !chapterVisibleTo(located.chapter, actor.role)) return null;
  const arms: Modality[] = getRecap(located.chapter.id) ? MODALITIES : ["read", "retry"];
  if (actor.role !== "student" || !actor.learnerId) return arms[0];
  return repo.withLearner(actor.learnerId, async (tx) => {
    const open = await tx.openEpisode(itemId);
    if (open && now - open.startedAt < EPISODE_REUSE_MS && arms.includes(open.modality)) return open.modality;
    const choice = chooseArm(armStats(await tx.listEpisodes(), located.chapter.subject, arms), random);
    await tx.insertEpisode({
      id: crypto.randomUUID(),
      itemId,
      conceptId: located.item.conceptId,
      subject: located.chapter.subject,
      context: "reteach",
      ...choice,
      startedAt: now,
      resolvedAt: null,
      success: null,
    });
    return choice.modality;
  });
}
