import { etDateKey } from "@/lib/engine/scheduler";

/** Epoch ms of 00:00 America/New_York on the ET day containing `nowMs`. */
export function etDayStart(nowMs: number): number {
  const key = etDateKey(new Date(nowMs));
  // ET is UTC-4 or UTC-5; try both and keep the one that lands on the same ET day at midnight.
  for (const offset of [4, 5]) {
    const guess = Date.parse(`${key}T00:00:00Z`) + offset * 3_600_000;
    if (etDateKey(new Date(guess)) === key && etDateKey(new Date(guess - 1)) !== key) return guess;
  }
  return Date.parse(`${key}T04:00:00Z`);
}
