export type ZoneDecision =
  | "none"
  | "zone_down"
  | "zone_up"
  | "scaffold_up"
  | "scaffold_down"
  | "skip_ahead_probe";

export function ewma(prev: number, next: number, alpha = 0.25): number {
  return alpha * next + (1 - alpha) * prev;
}

export function targetSuccess(rolling: number, consecutiveHigh = 0): number {
  if (rolling < 0.7) return 0.9;
  if (rolling > 0.95 && consecutiveHigh >= 6) return 0.72;
  return 0.82;
}

export function zoneAction(
  rolling: number,
  consecutiveHigh: number,
  outOfBandStreak: number,
): ZoneDecision {
  if (outOfBandStreak < 3) return "none";
  if (rolling < 0.7) return "zone_down";
  if (rolling > 0.95 && consecutiveHigh >= 6) return "zone_up";
  return "none";
}

export function itemSelectionScore(args: {
  predicted: number;
  target: number;
  dueReview: boolean;
  holeFill: boolean;
  interestMatch: boolean;
  templateNovelty: boolean;
}): number {
  const inBand = args.predicted >= 0.6 && args.predicted <= 0.97;
  return (
    -Math.abs(args.predicted - args.target) +
    (args.dueReview ? 0.3 : 0) +
    (args.holeFill ? 0.25 : 0) +
    (args.interestMatch ? 0.1 : 0) +
    (args.templateNovelty ? 0.1 : 0) -
    (inBand ? 0 : 1)
  );
}

export function pickBestItem<T>(
  candidates: T[],
  scoreOf: (item: T) => number,
  random = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  let best = -Infinity;
  const winners: T[] = [];
  for (const item of candidates) {
    const score = scoreOf(item);
    if (score > best) {
      best = score;
      winners.length = 0;
      winners.push(item);
    } else if (score === best) {
      winners.push(item);
    }
  }
  return winners[Math.floor(random() * winners.length)] ?? null;
}
