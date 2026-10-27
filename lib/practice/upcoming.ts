import { etDateKey } from "@/lib/engine/scheduler";

export type UpcomingTest = {
  id: string;
  chapterId: string;
  title: string;
  /** ET date of the class test (YYYY-MM-DD). */
  testDate: string;
  /** First ET day the planner puts it on top. */
  startDate: string;
};

/** Upcoming class tests. The Today plan puts the practice test first from startDate through testDate. */
export const UPCOMING_TESTS: UpcomingTest[] = [
  { id: "savvas.ch3-2026-10-28", chapterId: "savvas.ch3", title: "Science test: Living things and adaptations", testDate: "2026-10-28", startDate: "2026-10-26" },
];

export function activeUpcomingTest(nowMs: number, tests: UpcomingTest[] = UPCOMING_TESTS): (UpcomingTest & { isTestDay: boolean; today: string }) | null {
  const today = etDateKey(new Date(nowMs));
  const t = tests.filter((x) => x.startDate <= today && today <= x.testDate).sort((a, b) => a.testDate.localeCompare(b.testDate))[0];
  return t ? { ...t, isTestDay: t.testDate === today, today } : null;
}

export function practiceTestHref(chapterId: string, mode?: "retry"): string {
  return `/study/${encodeURIComponent(chapterId)}/practice-test${mode ? `?mode=${mode}` : ""}`;
}
