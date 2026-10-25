export type MinuteCandidate = {
  qualifyingActions: number;
  idleGapMs: number;
  majorityRapidGuess: boolean;
  videoHidden: boolean;
};

export const XP_PER_MINUTE = 10;

export function truncateMinute(ts: number): number {
  return Math.floor(ts / 60000) * 60000;
}

/** XP a minute is worth. Uniqueness per (session, minute) is enforced by the ledger insert. */
export function xpForMinute(candidate: MinuteCandidate): number {
  if (candidate.qualifyingActions < 1) return 0;
  if (candidate.idleGapMs > 45000) return 0;
  if (candidate.majorityRapidGuess) return 0;
  if (candidate.videoHidden) return 0;
  return XP_PER_MINUTE;
}

/**
 * Accuracy-weighted XP for an answering minute: 0.5x at 0% recent accuracy up to 1.5x at 100%.
 * Never negative; a non-answer minute (reading, watching) passes accuracy null and gets the base.
 */
export const XP_ACCURACY_MIN_WEIGHT = 0.5;
export const XP_ACCURACY_MAX_WEIGHT = 1.5;

export function accuracyWeightedXp(base: number, accuracy: number | null): number {
  if (base <= 0) return 0;
  if (accuracy === null || !Number.isFinite(accuracy)) return base;
  const acc = Math.min(1, Math.max(0, accuracy));
  const weight = XP_ACCURACY_MIN_WEIGHT + (XP_ACCURACY_MAX_WEIGHT - XP_ACCURACY_MIN_WEIGHT) * acc;
  return Math.max(0, Math.round(base * weight));
}

export function ringPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  const raw = (done / total) * 100;
  return Math.min(100, Math.max(0, Math.round(raw / 5) * 5));
}
