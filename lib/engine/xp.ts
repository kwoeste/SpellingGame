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

export function ringPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  const raw = (done / total) * 100;
  return Math.min(100, Math.max(0, Math.round(raw / 5) * 5));
}
