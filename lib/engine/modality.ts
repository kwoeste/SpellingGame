/**
 * Modality chooser: Thompson sampling over how Mae is taught (first teach) or re-taught a missed
 * item: the Watch it recap, a careful read, a straight retry, or the chapter's NotebookLM video,
 * podcast, or flashcards. Per subject, with a floor of EXPLORE_RATE uniform exploration so every
 * offered way keeps getting tried and one early result never locks an arm in. The latest learning
 * insight's suggested weights are only a weak prior (PRIOR_STRENGTH pseudo-tries); results decide.
 */
import { getChapter } from "@/lib/content/catalog";
import { mediaEntry, flashcardsFor } from "@/lib/content/nlm";
import { chapterVisibleTo } from "@/lib/content/student";
import { getRecap } from "@/lib/content/recaps";
import type { EngineRepo, EpisodeContext, Modality, ModalityEpisode, ModalityWeights } from "@/lib/engine/repo";
import { locateItem, type EngineActor } from "@/lib/engine/service";

export const EXPLORE_RATE = 0.15;
/** A reload within this window reuses the open episode instead of re-rolling. */
export const EPISODE_REUSE_MS = 6 * 60 * 60 * 1000;
export const MODALITIES: Modality[] = ["watch", "read", "retry"];
export const NLM_MODALITIES: Modality[] = ["nlm_video", "nlm_podcast", "nlm_flashcards"];
export const ALL_MODALITIES: Modality[] = [...MODALITIES, ...NLM_MODALITIES];
/** How many pseudo-tries the Grok prior is worth (each arm's real tries quickly outweigh it). */
export const PRIOR_STRENGTH = 4;

export function isModality(value: unknown): value is Modality {
  return typeof value === "string" && (ALL_MODALITIES as string[]).includes(value);
}

/** NotebookLM arms this chapter actually has media for. */
export function nlmArms(chapterId: string): Modality[] {
  const arms: Modality[] = [];
  if (mediaEntry(chapterId, "video")) arms.push("nlm_video");
  if (mediaEntry(chapterId, "audio")) arms.push("nlm_podcast");
  if (flashcardsFor(chapterId).length > 0) arms.push("nlm_flashcards");
  return arms;
}

/** Ways this chapter can be taught: a way is offered only when its content exists. */
export function eligibleArms(chapterId: string, context: EpisodeContext): Modality[] {
  const recap = Boolean(getRecap(chapterId));
  const base: Modality[] = context === "reteach" ? (recap ? ["watch", "read", "retry"] : ["read", "retry"]) : recap ? ["watch", "read"] : ["read"];
  return [...base, ...nlmArms(chapterId)];
}

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

export type ArmStats = { modality: Modality; successes: number; failures: number; priorSuccesses?: number; priorFailures?: number };

/** Turn a 0..1 suggested weight into Beta pseudo-counts worth PRIOR_STRENGTH tries. */
export function priorFor(weights: ModalityWeights | null | undefined, subject: string, modality: Modality): { priorSuccesses: number; priorFailures: number } {
  const w = weights?.[subject]?.[modality];
  if (typeof w !== "number" || !Number.isFinite(w)) return { priorSuccesses: 0, priorFailures: 0 };
  const p = Math.min(0.95, Math.max(0.05, w));
  return { priorSuccesses: PRIOR_STRENGTH * p, priorFailures: PRIOR_STRENGTH * (1 - p) };
}

/** Success counts pool first-teach and re-teach episodes per subject (same scoring rule). */
export function armStats(episodes: ModalityEpisode[], subject: string, arms: Modality[], weights?: ModalityWeights | null): ArmStats[] {
  return arms.map((modality) => {
    const done = episodes.filter((e) => e.subject === subject && e.modality === modality && e.success !== null);
    const successes = done.filter((e) => e.success).length;
    return { modality, successes, failures: done.length - successes, ...priorFor(weights, subject, modality) };
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
    samples[arm.modality] = Math.round(sampleBeta(1 + arm.successes + (arm.priorSuccesses ?? 0), 1 + arm.failures + (arm.priorFailures ?? 0), random) * 1000) / 1000;
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
  const arms = eligibleArms(located.chapter.id, "reteach");
  if (actor.role !== "student" || !actor.learnerId) return arms[0];
  return repo.withLearner(actor.learnerId, async (tx) => {
    const open = await tx.openEpisode(itemId);
    if (open && open.context === "reteach" && now - open.startedAt < EPISODE_REUSE_MS && arms.includes(open.modality)) return open.modality;
    const insight = await tx.latestInsight().catch(() => null);
    const choice = chooseArm(armStats(await tx.listEpisodes(), located.chapter.subject, arms, insight?.weights), random);
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

/**
 * First teach: before she has answered anything in a chapter, choose how to start it (e.g. "Start
 * with the video, then practice"). The episode is tied to the chapter's first question and scored
 * on her first answer there, exactly like a re-teach. Returns null (normal flow) for admins, chapters
 * already started, or chapters with only one way to start.
 */
export async function chooseFirstTeachModality(
  repo: EngineRepo,
  actor: EngineActor,
  chapterId: string,
  now = Date.now(),
  random: Rng = Math.random,
): Promise<Modality | null> {
  const chapter = getChapter(chapterId);
  if (!chapter || !chapterVisibleTo(chapter, actor.role) || chapter.items.length === 0) return null;
  const arms = eligibleArms(chapter.id, "first_teach");
  if (arms.length < 2 || actor.role !== "student" || !actor.learnerId) return null;
  const firstItem = chapter.items[0];
  return repo.withLearner(actor.learnerId, async (tx) => {
    const answered = await tx.answeredItemIds();
    if (chapter.items.some((item) => answered.has(item.id))) return null;
    const open = await tx.openEpisode(firstItem.id);
    if (open && open.context === "first_teach" && arms.includes(open.modality)) return open.modality;
    const insight = await tx.latestInsight().catch(() => null);
    const choice = chooseArm(armStats(await tx.listEpisodes(), chapter.subject, arms, insight?.weights), random);
    await tx.insertEpisode({
      id: crypto.randomUUID(),
      itemId: firstItem.id,
      conceptId: firstItem.conceptId,
      subject: chapter.subject,
      context: "first_teach",
      ...choice,
      startedAt: now,
      resolvedAt: null,
      success: null,
    });
    return choice.modality;
  });
}
