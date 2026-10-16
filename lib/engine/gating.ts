export type GateInput = {
  pMastery: number;
  gateScore: number;
  rapidGuessOnGate: boolean;
  efficientStrategyRate?: number;
  requiresEfficient?: boolean;
};

export type ChapterGateInput = {
  chapterScore: number;
  coreConceptScores: number[];
};

export function conceptGatePassed(input: GateInput): boolean {
  if (input.pMastery < 0.95) return false;
  if (input.gateScore < 0.9) return false;
  if (input.rapidGuessOnGate) return false;
  if (input.requiresEfficient && (input.efficientStrategyRate ?? 0) < 0.6) return false;
  return true;
}

export function chapterGatePassed(input: ChapterGateInput): boolean {
  if (input.chapterScore < 0.9) return false;
  return input.coreConceptScores.every((score) => score >= 0.8);
}

export function masteryState(args: {
  pMastery: number;
  gated: boolean;
  rusty: boolean;
  attempts: number;
  reviewDue: boolean;
}): "not_started" | "missing" | "in_progress" | "mastered" | "review_due" | "rusty" {
  if (args.attempts === 0) return "not_started";
  if (args.rusty) return "rusty";
  if (args.gated) return args.reviewDue ? "review_due" : "mastered";
  if (args.pMastery < 0.6) return "missing";
  return "in_progress";
}
