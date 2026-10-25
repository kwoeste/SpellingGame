/**
 * "How Mae learns best right now": a weekly (and on-demand) Grok summary over aggregated,
 * de-identified modality stats. Only subjects, modality names, concept kinds, and numbers are sent:
 * never a name, email, item text, or anything she typed. Without an xAI key, past the call cap, or on
 * any bad answer it falls back to a deterministic summary computed from the same stats.
 * The suggested weights become a weak prior for the Thompson chooser (Thompson still decides).
 */
import { MATH_CONCEPTS } from "@/lib/content/concepts";
import type { AdminRepo, LearningInsight, Modality, ModalityEpisode, ModalityWeights } from "@/lib/engine/repo";
import { ALL_MODALITIES, EXPLORE_RATE, isModality } from "@/lib/engine/modality";
import { locateItem } from "@/lib/engine/service";

export const INSIGHT_MODEL = process.env.XAI_INSIGHT_MODEL || process.env.XAI_PLANNER_MODEL || "grok-4.20-0309-non-reasoning";
export const INSIGHT_TIMEOUT_MS = 12_000;
/** Max insight rows (AI or not) per rolling 24 hours: weekly job + a few admin clicks. */
export const INSIGHT_DAILY_CAP = 5;
/** Weekly job skips when an insight is newer than this. */
export const WEEKLY_MIN_GAP_MS = 6 * 86_400_000;
/** Below this many finished tries a cell is "small sample". */
export const SMALL_SAMPLE = 8;
/** A later review counts toward retention when it is at least this long after the episode. */
export const RETENTION_GAP_MS = 20 * 60 * 60 * 1000;

const SUBJECTS = ["math", "science", "ela", "religion", "social_studies"];

export type Cell = {
  subject: string;
  modality: Modality;
  n: number;
  open: number;
  accuracy_after: number | null;
  retention_n: number;
  retention: number | null;
  median_followup_sec: number | null;
  rush_rate: number | null;
  first_teach_n: number;
  reteach_n: number;
};

export type InsightStats = {
  explore_rate: number;
  small_sample_below: number;
  total_finished: number;
  by_subject_modality: Cell[];
  by_concept_kind: Array<{ concept_kind: string; modality: Modality; n: number; accuracy_after: number | null }>;
};

const round2 = (x: number) => Math.round(x * 100) / 100;
const conceptKind = new Map(MATH_CONCEPTS.map((c) => [c.id, c.kind as string]));

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Aggregate episodes (+ later first-try answers for retention). Pure; no identifiers leave here. */
export function aggregateStats(
  episodes: ModalityEpisode[],
  firstTries: Array<{ conceptId: string; isCorrect: boolean; serverTs: number }>,
): InsightStats {
  const cells: Cell[] = [];
  const subjects = [...new Set(episodes.map((e) => e.subject))].sort();
  for (const subject of subjects) {
    for (const modality of ALL_MODALITIES) {
      const all = episodes.filter((e) => e.subject === subject && e.modality === modality);
      if (all.length === 0) continue;
      const done = all.filter((e) => e.success !== null);
      const retained: boolean[] = [];
      for (const e of done) {
        const later = firstTries.find((a) => a.conceptId === e.conceptId && a.serverTs >= (e.resolvedAt ?? e.startedAt) + RETENTION_GAP_MS);
        if (later) retained.push(later.isCorrect);
      }
      const lat = done.map((e) => e.followupLatencyMs).filter((x): x is number => typeof x === "number");
      const rushKnown = done.filter((e) => typeof e.followupRushed === "boolean");
      cells.push({
        subject: SUBJECTS.includes(subject) ? subject : "other",
        modality,
        n: done.length,
        open: all.length - done.length,
        accuracy_after: done.length ? round2(done.filter((e) => e.success).length / done.length) : null,
        retention_n: retained.length,
        retention: retained.length ? round2(retained.filter(Boolean).length / retained.length) : null,
        median_followup_sec: lat.length ? Math.round((median(lat) ?? 0) / 100) / 10 : null,
        rush_rate: rushKnown.length ? round2(rushKnown.filter((e) => e.followupRushed).length / rushKnown.length) : null,
        first_teach_n: done.filter((e) => e.context === "first_teach").length,
        reteach_n: done.filter((e) => e.context === "reteach").length,
      });
    }
  }
  const byKind = new Map<string, { kind: string; modality: Modality; n: number; ok: number }>();
  for (const e of episodes) {
    if (e.success === null) continue;
    // Concept kind from the concept map, else the question type (mc, spell, tap_evidence...).
    const kind = conceptKind.get(e.conceptId) ?? (locateItem(e.itemId)?.item.type ? `question:${locateItem(e.itemId)!.item.type}` : "other");
    const key = `${kind}|${e.modality}`;
    const row = byKind.get(key) ?? { kind, modality: e.modality, n: 0, ok: 0 };
    row.n += 1;
    if (e.success) row.ok += 1;
    byKind.set(key, row);
  }
  return {
    explore_rate: EXPLORE_RATE,
    small_sample_below: SMALL_SAMPLE,
    total_finished: episodes.filter((e) => e.success !== null).length,
    by_subject_modality: cells,
    by_concept_kind: [...byKind.values()].map((r) => ({ concept_kind: r.kind, modality: r.modality, n: r.n, accuracy_after: r.n ? round2(r.ok / r.n) : null })),
  };
}

const LABEL: Record<Modality, string> = {
  watch: "the Watch it recap",
  read: "a careful read",
  retry: "a straight retry",
  nlm_video: "the video",
  nlm_podcast: "the podcast",
  nlm_flashcards: "flashcards",
};

/** Posterior-mean weights per subject (the deterministic fallback, and the shape Grok must match). */
export function deterministicWeights(stats: InsightStats): ModalityWeights {
  const out: ModalityWeights = {};
  for (const c of stats.by_subject_modality) {
    const ok = Math.round((c.accuracy_after ?? 0) * c.n);
    (out[c.subject] ??= {})[c.modality] = round2((1 + ok) / (2 + c.n));
  }
  return out;
}

export function deterministicInsight(stats: InsightStats): { summary: string; confidence: string; weights: ModalityWeights } {
  const weights = deterministicWeights(stats);
  const lines: string[] = [];
  for (const subject of Object.keys(weights).sort()) {
    const cells = stats.by_subject_modality.filter((c) => c.subject === subject && c.n > 0).sort((a, b) => (weights[subject][b.modality] ?? 0) - (weights[subject][a.modality] ?? 0));
    if (cells.length === 0) continue;
    const best = cells[0];
    lines.push(`${subject}: ${LABEL[best.modality]} leads so far (${Math.round((best.accuracy_after ?? 0) * 100)}% right after, ${best.n} tries).`);
  }
  const small = stats.by_subject_modality.filter((c) => c.n < SMALL_SAMPLE).length;
  const summary = lines.length ? lines.join(" ") : "Not enough finished tries yet to say how she learns best.";
  const confidence =
    stats.total_finished === 0
      ? "No data yet."
      : small > 0
        ? `Low confidence: ${small} of ${stats.by_subject_modality.length} ways have fewer than ${SMALL_SAMPLE} finished tries.`
        : "Reasonable confidence: every way shown has at least 8 finished tries.";
  return { summary: summary.slice(0, 600), confidence, weights };
}

const SYSTEM = [
  "You analyze de-identified learning statistics for one 4th-grade student who seems to learn best from video.",
  "Modalities: watch (short recap), read (careful re-read), retry (straight retry), nlm_video, nlm_podcast, nlm_flashcards (NotebookLM media).",
  "accuracy_after = share of first-try unhinted right answers right after that way of teaching; retention = later review first-try accuracy;",
  "median_followup_sec = time on that answer; rush_rate = share answered too fast; n = finished tries.",
  "summary: 2-4 plain sentences for the parent on how the student learns best right now, by subject. No names. Max 500 characters.",
  "confidence_note: one sentence; say clearly when samples are small (n below small_sample_below). Max 200 characters.",
  "weights: for each subject present, a 0..1 weight for each modality present in that subject (higher = favor it). Be modest with small samples.",
].join(" ");

export const INSIGHT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    confidence_note: { type: "string" },
    weights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { subject: { type: "string" }, modality: { type: "string" }, weight: { type: "number" } },
        required: ["subject", "modality", "weight"],
      },
    },
  },
  required: ["summary", "confidence_note", "weights"],
} as const;

/** The exact messages sent to xAI (exported so tests can prove there is no PII). */
export function insightMessages(stats: InsightStats) {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(stats) },
  ];
}

type AiInsight = { summary: unknown; confidence_note: unknown; weights: unknown };

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  if (!t || t.length > max || /https?:|www\.|<|>|@/i.test(t)) return null;
  return t;
}

/** Server-side check of the model's answer; null means fall back. */
export function validateInsight(result: AiInsight | null, stats: InsightStats): { summary: string; confidence: string; weights: ModalityWeights } | null {
  if (!result || typeof result !== "object") return null;
  const summary = cleanText(result.summary, 600);
  const confidence = cleanText(result.confidence_note, 300);
  if (!summary || !confidence || !Array.isArray(result.weights)) return null;
  const present = new Set(stats.by_subject_modality.map((c) => `${c.subject}|${c.modality}`));
  const weights: ModalityWeights = {};
  for (const w of result.weights as Array<Record<string, unknown>>) {
    if (!w || typeof w.subject !== "string" || !isModality(w.modality) || typeof w.weight !== "number" || !Number.isFinite(w.weight)) continue;
    if (!present.has(`${w.subject}|${w.modality}`)) continue;
    (weights[w.subject] ??= {})[w.modality] = round2(Math.min(1, Math.max(0, w.weight)));
  }
  return { summary, confidence, weights };
}

type Fetch = typeof fetch;

export async function aiInsight(stats: InsightStats, doFetch: Fetch = fetch, key = process.env.XAI_API_KEY): Promise<AiInsight | null> {
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INSIGHT_TIMEOUT_MS);
  try {
    const response = await doFetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: INSIGHT_MODEL,
        messages: insightMessages(stats),
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_schema", json_schema: { name: "learns_best", strict: true, schema: INSIGHT_SCHEMA } },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" ? (JSON.parse(content) as AiInsight) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type InsightDeps = { ai?: (stats: InsightStats) => Promise<AiInsight | null>; now?: number };
export type InsightResult = { status: "created"; insight: LearningInsight } | { status: "capped" | "fresh"; insight: LearningInsight | null };

/** Build, (maybe) ask Grok, validate, and store one insight row. */
export async function generateInsight(
  repo: AdminRepo,
  learnerId: string,
  trigger: LearningInsight["trigger"],
  requestedBy: string | null,
  deps: InsightDeps = {},
): Promise<InsightResult> {
  const now = deps.now ?? Date.now();
  const recent = await repo.insights(learnerId, INSIGHT_DAILY_CAP + 1);
  const latest = recent[0] ?? null;
  if (trigger === "weekly" && latest && now - latest.createdAt < WEEKLY_MIN_GAP_MS) return { status: "fresh", insight: latest };
  if (recent.filter((r) => now - r.createdAt < 86_400_000).length >= INSIGHT_DAILY_CAP) return { status: "capped", insight: latest };
  const episodes = (await repo.modalityEpisodes()).filter((e) => e.learnerId === learnerId).map(({ learnerId: _l, ...e }) => (void _l, e));
  const firstTries = await repo.firstTryAnswers(learnerId, now - 120 * 86_400_000);
  const stats = aggregateStats(episodes, firstTries);
  const ai = deps.ai ?? aiInsight;
  const fromAi = stats.total_finished > 0 ? validateInsight(await ai(stats).catch(() => null), stats) : null;
  const picked = fromAi ?? deterministicInsight(stats);
  const insight: LearningInsight = {
    id: crypto.randomUUID(),
    createdAt: now,
    trigger,
    source: fromAi ? "ai" : "deterministic",
    model: fromAi ? INSIGHT_MODEL : null,
    stats: stats as unknown as Record<string, unknown>,
    summary: picked.summary,
    confidence: picked.confidence,
    weights: picked.weights,
    requestedBy,
  };
  await repo.insertInsight(learnerId, insight);
  return { status: "created", insight };
}

/** Per-subject top modality from an insight's weights (planner hint). */
export function preferredBySubject(weights: ModalityWeights | null | undefined): Record<string, Modality> {
  const out: Record<string, Modality> = {};
  for (const [subject, byMod] of Object.entries(weights ?? {})) {
    const best = Object.entries(byMod ?? {})
      .filter(([m, w]) => isModality(m) && typeof w === "number")
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    if (best) out[subject] = best[0] as Modality;
  }
  return out;
}
