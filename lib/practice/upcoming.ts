import { etDateKey } from "@/lib/engine/scheduler";

/**
 * A dated item: a class test, chapter test, or spelling list. From startDate through testDate it
 * goes first in the Today plan. The live list is the planner.upcoming_test table (admin edits it at
 * /admin/upcoming-tests); DEFAULT_UPCOMING is the fallback when the table is missing or empty.
 */
export type UpcomingKind = "practice-test" | "spelling" | "chapter";
export type UpcomingTest = {
  id: string;
  kind: UpcomingKind;
  /** Chapter id for practice-test/chapter, list id for spelling. */
  refId: string;
  title: string;
  /** ET date of the class test (YYYY-MM-DD). */
  testDate: string;
  /** First ET day the planner puts it on top. */
  startDate: string;
};

/** To move the spelling test (e.g. to Nov 13), change it at /admin/upcoming-tests, or here and in migration 011. */
export const SPELLING_D2_TEST_DATE = "2026-11-06";

export const DEFAULT_UPCOMING: UpcomingTest[] = [
  { id: "savvas.ch3-2026-10-28", kind: "practice-test", refId: "savvas.ch3", title: "Science test: Living things and adaptations", testDate: "2026-10-28", startDate: "2026-10-26" },
  { id: "spelling-d2", kind: "spelling", refId: "spelling-d2", title: "Spelling List D-2", testDate: SPELLING_D2_TEST_DATE, startDate: "2026-10-29" },
];
/** Back-compat alias. */
export const UPCOMING_TESTS = DEFAULT_UPCOMING;

export type ActiveUpcoming = UpcomingTest & { isTestDay: boolean; today: string; chapterId: string };

/** Every dated item active today (startDate ≤ today ≤ testDate), soonest test first. Expired ones drop off. */
export function activeUpcomingTests(nowMs: number, tests: UpcomingTest[] = DEFAULT_UPCOMING): ActiveUpcoming[] {
  const today = etDateKey(new Date(nowMs));
  return tests
    .filter((x) => x.startDate <= today && today <= x.testDate)
    .sort((a, b) => a.testDate.localeCompare(b.testDate) || a.id.localeCompare(b.id))
    .map((t) => ({ ...t, isTestDay: t.testDate === today, today, chapterId: t.refId }));
}

/** The soonest active chapter practice test (the practice-test page uses this). */
export function activeUpcomingTest(nowMs: number, tests: UpcomingTest[] = DEFAULT_UPCOMING): ActiveUpcoming | null {
  return activeUpcomingTests(nowMs, tests).find((t) => t.kind === "practice-test") ?? null;
}

export function practiceTestHref(chapterId: string, mode?: "retry"): string {
  return `/study/${encodeURIComponent(chapterId)}/practice-test${mode ? `?mode=${mode}` : ""}`;
}

export function upcomingHref(t: Pick<UpcomingTest, "kind" | "refId">, mode?: "retry"): string {
  if (t.kind === "practice-test") return practiceTestHref(t.refId, mode);
  return `/study/${encodeURIComponent(t.refId)}`;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function validUpcoming(x: Partial<UpcomingTest>): x is UpcomingTest {
  return (
    typeof x.id === "string" && x.id.length > 0 && x.id.length <= 80 &&
    (x.kind === "practice-test" || x.kind === "spelling" || x.kind === "chapter") &&
    typeof x.refId === "string" && x.refId.length > 0 && x.refId.length <= 80 &&
    typeof x.title === "string" && x.title.trim().length > 0 && x.title.length <= 120 &&
    typeof x.startDate === "string" && DATE.test(x.startDate) && !Number.isNaN(Date.parse(x.startDate)) &&
    typeof x.testDate === "string" && DATE.test(x.testDate) && !Number.isNaN(Date.parse(x.testDate)) &&
    x.startDate <= x.testDate
  );
}
