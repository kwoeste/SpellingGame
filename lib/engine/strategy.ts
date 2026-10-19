export type StrategyObservation = {
  strategy: string;
  source: "inferred_rules" | "self_report" | "constrained_tool" | "admin_label";
  confidence: number;
  misconception: string | null;
};

export function classifyGuess(latencyMs: number, medianMs: number, correct: boolean, offByPct: number): boolean {
  const threshold = Math.max(1500, 0.3 * medianMs);
  return latencyMs < threshold && (!correct || offByPct > 0.5);
}

export function classifySkim(dwellMs: number, words: number, karaokeOn: boolean): boolean {
  if (karaokeOn || words < 15) return false;
  return dwellMs < (words / 4) * 1000;
}

export function classifyMathTrace(args: {
  family: "add_sub" | "multiply" | "divide" | "fractions" | "place_value";
  ops: string[];
  latencyMs: number;
  medianMs: number;
  correct: boolean;
}): StrategyObservation {
  const { family, ops, latencyMs, medianMs, correct } = args;
  if (classifyGuess(latencyMs, medianMs, correct, 0)) {
    return { strategy: "guess", source: "inferred_rules", confidence: 0.7, misconception: null };
  }
  if (family === "add_sub") {
    const unitSteps = ops.filter((op) => op === "add_unit" || op === "jump_1").length;
    if (unitSteps >= 5) {
      return { strategy: "counting_on_ones", source: "inferred_rules", confidence: 0.85, misconception: null };
    }
    if (ops.some((op) => op === "split" || op === "jump_10")) {
      return { strategy: "decomposition_tens", source: "inferred_rules", confidence: 0.85, misconception: null };
    }
  }
  if (family === "multiply" && ops.includes("area_split")) {
    return { strategy: "partial_products_area_model", source: "inferred_rules", confidence: 0.9, misconception: null };
  }
  if (family === "divide" && ops.includes("subtract_multiple")) {
    return { strategy: "partial_quotients", source: "inferred_rules", confidence: 0.9, misconception: null };
  }
  if (correct && latencyMs < 0.6 * medianMs && ops.length === 0) {
    return { strategy: "known_fact_or_mental", source: "inferred_rules", confidence: 0.6, misconception: null };
  }
  return { strategy: "unknown", source: "inferred_rules", confidence: 0.3, misconception: null };
}

export function misconceptionFromAnswer(tag: string | undefined): string | null {
  return tag ?? null;
}
