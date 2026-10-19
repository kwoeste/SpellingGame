export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;

export type ReviewBox = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function intervalDays(box: number): number {
  const clamped = Math.min(6, Math.max(0, box)) as ReviewBox;
  return BOX_INTERVALS_DAYS[clamped];
}

export function dueAt(from: Date, box: number): Date {
  const days = intervalDays(box);
  const next = new Date(from.getTime());
  if (days === 0) {
    next.setMinutes(next.getMinutes() + 15);
    return next;
  }
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function nextBoxOnPass(box: number): ReviewBox {
  return Math.min(6, box + 1) as ReviewBox;
}

export function onFail(): { box: ReviewBox; pMasteryFactor: number; state: "rusty" } {
  return { box: 1, pMasteryFactor: 0.7, state: "rusty" };
}

export function isDue(due: Date, now: Date): boolean {
  return now.getTime() >= due.getTime();
}

export function isRusty(due: Date, box: number, now: Date): boolean {
  const intervalMs = intervalDays(box) * 24 * 60 * 60 * 1000;
  if (intervalMs <= 0) return now.getTime() > due.getTime();
  return now.getTime() - due.getTime() > 2 * intervalMs;
}

export function etDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
