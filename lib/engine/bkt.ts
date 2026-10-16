export type BktParams = {
  pL0: number;
  t: number;
  g: number;
  s: number;
};

export const DEFAULT_BKT: BktParams = {
  pL0: 0.15,
  t: 0.12,
  g: 0.25,
  s: 0.1,
};

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function posteriorCorrect(pL: number, g: number, s: number): number {
  const num = pL * (1 - s);
  const den = num + (1 - pL) * g;
  return den === 0 ? pL : num / den;
}

export function posteriorWrong(pL: number, g: number, s: number): number {
  const num = pL * s;
  const den = num + (1 - pL) * (1 - g);
  return den === 0 ? pL : num / den;
}

export function applyLearn(pObserved: number, t: number): number {
  return pObserved + (1 - pObserved) * t;
}

export function guessFromOptions(nOptions: number): number {
  if (nOptions <= 1) return 0.05;
  return Math.min(0.33, Math.max(0.1, 1 / nOptions));
}

export type EvidenceWeightInput = {
  firstAttempt: boolean;
  hintLevel: number;
  strategy?: string;
  efficientStrategies?: string[];
  rapidGuess?: boolean;
  isPreview?: boolean;
  treatedAsWrong?: boolean;
};

export function evidenceWeight(input: EvidenceWeightInput): number {
  if (input.isPreview) return 0;
  if (input.rapidGuess || input.strategy === "guess") return 0;
  if (!input.firstAttempt) return 0;
  if (input.hintLevel >= 3 || input.treatedAsWrong) return 0.5;
  if (input.hintLevel === 2) return 0.4;
  if (input.hintLevel === 1) return 0.75;
  if (
    input.strategy &&
    input.efficientStrategies &&
    input.efficientStrategies.length > 0 &&
    !input.efficientStrategies.includes(input.strategy)
  ) {
    return 0.3;
  }
  return 1;
}

export function updateBkt(
  pPrior: number,
  correct: boolean,
  params: BktParams,
  weight = 1,
): { pPosterior: number; pNext: number } {
  const raw = correct
    ? posteriorCorrect(pPrior, params.g, params.s)
    : posteriorWrong(pPrior, params.g, params.s);
  const blended = pPrior + weight * (raw - pPrior);
  const pNext = applyLearn(blended, params.t);
  return { pPosterior: clamp01(blended), pNext: clamp01(pNext) };
}
