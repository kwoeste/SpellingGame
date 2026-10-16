export function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function predictedCorrect(theta: number, difficulty: number, guess: number): number {
  return guess + (1 - guess) * logistic(theta - difficulty);
}

export function learnerK(n: number): number {
  return Math.max(0.15, 0.8 / (1 + 0.05 * n));
}

export function itemK(n: number): number {
  return Math.max(0.03, 0.2 / (1 + 0.05 * n));
}

export function hintWeightedOutcome(correct: boolean, hintLevel: number): number {
  const x = correct ? 1 : 0;
  return x * (1 - 0.2 * hintLevel);
}

export function signedResidualTime(correct: boolean, tSec: number, tMax = 20): number {
  const x = correct ? 1 : 0;
  return 0.5 + 0.5 * (2 * x - 1) * (1 - Math.min(tSec, tMax) / tMax);
}

export function seedDifficulty(milestoneLevel: number, templateOffset = 0): number {
  return milestoneLevel - 4 + templateOffset;
}

export function updateElo(args: {
  theta: number;
  difficulty: number;
  outcome: number;
  nLearner: number;
  nItem: number;
  guess: number;
  boostK?: number;
}): { theta: number; difficulty: number; p: number } {
  const p = predictedCorrect(args.theta, args.difficulty, args.guess);
  const kBoost = args.boostK ?? 1;
  const nextTheta = args.theta + learnerK(args.nLearner) * kBoost * (args.outcome - p);
  let nextD = args.difficulty - itemK(args.nItem) * kBoost * (args.outcome - p);
  const seed = args.difficulty;
  nextD = Math.min(seed + 1, Math.max(seed - 1, nextD));
  return { theta: nextTheta, difficulty: nextD, p };
}
