import { locateAdminItem } from "@/lib/admin/catalog";
import { wordCount } from "@/lib/admin/format";
import type { PaceFlag } from "@/lib/admin/types";
import { classifyGuess, classifySkim } from "@/lib/engine/strategy";

const RAPID_MS = 1500;
const DEFAULT_MEDIAN_MS = 8000;

export function inferStrategy(args: {
  itemId: string | null;
  latencyMs: number | null;
  correct: boolean | null;
  hintLevel: number | null;
}): { strategy: string; source: "inferred_rules"; confidence: number; misconception: string | null } {
  const latency = args.latencyMs ?? DEFAULT_MEDIAN_MS;
  const located = args.itemId ? locateAdminItem(args.itemId) : null;
  const reading = located?.item.type === "tap_evidence" || located?.chapter.subject === "ela" || located?.chapter.subject === "religion";
  if (args.latencyMs !== null && classifyGuess(latency, DEFAULT_MEDIAN_MS, Boolean(args.correct), 0)) {
    return { strategy: "guess", source: "inferred_rules", confidence: 0.7, misconception: null };
  }
  if (reading && located) {
    const words = wordCount(located.item.stem);
    if (args.latencyMs !== null && classifySkim(args.latencyMs, words, false)) {
      return { strategy: "skim_suspected", source: "inferred_rules", confidence: 0.65, misconception: null };
    }
    if (args.correct && (args.hintLevel ?? 0) === 0) {
      return { strategy: "evidence_lookback", source: "inferred_rules", confidence: 0.4, misconception: null };
    }
    if (args.correct === false) {
      return { strategy: "evidence_guess", source: "inferred_rules", confidence: 0.45, misconception: null };
    }
  }
  if (args.correct && latency < 0.6 * DEFAULT_MEDIAN_MS && (args.hintLevel ?? 0) === 0) {
    return { strategy: "known_fact_or_mental", source: "inferred_rules", confidence: 0.55, misconception: null };
  }
  if (args.correct === false && (args.hintLevel ?? 0) >= 2) {
    return { strategy: "hint_supported", source: "inferred_rules", confidence: 0.4, misconception: null };
  }
  return { strategy: args.correct ? "unknown" : "unknown", source: "inferred_rules", confidence: 0.3, misconception: null };
}

export function inferPace(args: {
  latencies: number[];
  stems: string[];
  rapidCount: number;
  items: number;
}): { pace: PaceFlag; note: string } {
  if (args.items === 0) return { pace: "ok", note: "No scored items in this session." };
  const skim = args.stems.filter((stem, idx) => {
    const latency = args.latencies[idx];
    const words = wordCount(stem);
    return latency !== undefined && classifySkim(latency, words, false);
  }).length;
  const skip = args.latencies.filter((ms) => ms < RAPID_MS).length;
  if (args.rapidCount >= 3 || (args.items >= 4 && skip / args.items >= 0.5)) {
    return { pace: "rush", note: `${args.rapidCount} rapid guesses and ${skip} very fast submits.` };
  }
  if (skim >= 2) {
    return { pace: "skim", note: `${skim} reading items looked faster than about 240 words per minute.` };
  }
  if (skip >= 2) {
    return { pace: "skip", note: `${skip} items were submitted in under 1.5 seconds.` };
  }
  return { pace: "ok", note: "Pacing looks steady." };
}

export function isRapidGuess(latencyMs: number | null, correct: boolean | null): boolean {
  return latencyMs !== null && latencyMs < RAPID_MS && correct === false;
}
