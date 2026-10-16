export type MinuteCandidate = {
  sessionId: string;
  minuteStart: number;
  qualifyingActions: number;
  idleGapMs: number;
  majorityRapidGuess: boolean;
  videoHidden: boolean;
};

const earned = new Set<string>();

export function minuteKey(sessionId: string, minuteStart: number): string {
  return `${sessionId}:${minuteStart}`;
}

export function truncateMinute(ts: number): number {
  return Math.floor(ts / 60000) * 60000;
}

export function xpForMinute(candidate: MinuteCandidate): number {
  const key = minuteKey(candidate.sessionId, candidate.minuteStart);
  if (earned.has(key)) return 0;
  if (candidate.qualifyingActions < 1) return 0;
  if (candidate.idleGapMs > 45000) return 0;
  if (candidate.majorityRapidGuess) return 0;
  if (candidate.videoHidden) return 0;
  earned.add(key);
  return 10;
}

export function resetXpLedger(): void {
  earned.clear();
}

export function hasEarnedMinute(sessionId: string, minuteStart: number): boolean {
  return earned.has(minuteKey(sessionId, minuteStart));
}

export function ringPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  const raw = (done / total) * 100;
  return Math.min(100, Math.max(0, Math.round(raw / 5) * 5));
}
