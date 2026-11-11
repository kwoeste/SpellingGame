import { etDateKey } from "@/lib/engine/scheduler";

/**
 * A dated item: a class test, chapter test, or spelling list. From startDate through testDate it
 * goes first in the Today plan. A spelling list may have no test date yet: it stays pinned and the
 * pages say "no date yet" until an admin sets one. The live list is the planner.upcoming_test table
 * (admin edits it at /admin/upcoming-tests or /admin/spelling); DEFAULT_UPCOMING is the fallback
 * when the table is missing or empty.
 */
export type UpcomingKind = "practice-test" | "spelling" | "chapter";
export type UpcomingTest = {
  id: string;
  kind: UpcomingKind;
  /** Chapter id for practice-test/chapter, list id for spelling. */
  refId: string;
  title: string;
  /** ET date of the class test (YYYY-MM-DD), or null when a spelling list has no date yet. */
  testDate: string | null;
  /** First ET day the planner puts it on top. */
  startDate: string;
};

/** To move the D-2 spelling test, change it at /admin/upcoming-tests, or here and in migration 011. */
export const SPELLING_D2_TEST_DATE = "2026-11-06";
/** Middle Ages list is pinned from this day. Set the test date at /admin/upcoming-tests (null until then). */
export const SPELLING_U2L10_START_DATE = "2026-11-11";

export const DEFAULT_UPCOMING: UpcomingTest[] = [
  { id: "savvas.ch3-2026-10-28", kind: "practice-test", refId: "savvas.ch3", title: "Science test: Living things and adaptations", testDate: "2026-10-28", startDate: "2026-10-26" },
  { id: "ss.ohio-tribes-2026-11-03", kind: "practice-test", refId: "ss.ohio-tribes", title: "Social Studies: Ohio's Native American Tribes", testDate: "2026-11-03", startDate: "2026-11-02" },
  { id: "spelling-d2", kind: "spelling", refId: "spelling-d2", title: "Spelling List D-2", testDate: SPELLING_D2_TEST_DATE, startDate: "2026-10-29" },
  { id: "spelling-u2l10", kind: "spelling", refId: "spelling-u2l10", title: "Spelling: Middle Ages words (Unit 2, Lesson 10)", testDate: null, startDate: SPELLING_U2L10_START_DATE },
];
/** Back-compat alias. */
export const UPCOMING_TESTS = DEFAULT_UPCOMING;

export type ActiveUpcoming = UpcomingTest & { isTestDay: boolean; today: string; chapterId: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real YYYY-MM-DD. Empty and null mean "no date yet". */
export function ymdOrNull(value: string | null | undefined): string | null {
  return typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** Spelling lists with no date stay active. Anything else needs startDate ≤ today ≤ testDate. */
export function isUpcomingActive(test: UpcomingTest, today: string): boolean {
  if (test.startDate > today) return false;
  const testDate = ymdOrNull(test.testDate);
  if (!testDate) return test.kind === "spelling";
  return today <= testDate;
}

/** Dated items first (soonest test first). A spelling list with no date yet comes after those. */
function byTestDate(a: UpcomingTest, b: UpcomingTest): number {
  const aDate = ymdOrNull(a.testDate);
  const bDate = ymdOrNull(b.testDate);
  if (aDate && bDate) return aDate.localeCompare(bDate) || a.id.localeCompare(b.id);
  if (aDate) return -1;
  if (bDate) return 1;
  return a.id.localeCompare(b.id);
}

/** Every item active today, soonest test first. Expired ones drop off. Undated spelling lists stay. */
export function activeUpcomingTests(nowMs: number, tests: UpcomingTest[] = DEFAULT_UPCOMING): ActiveUpcoming[] {
  const today = etDateKey(new Date(nowMs));
  return tests
    .filter((x) => isUpcomingActive(x, today))
    .sort(byTestDate)
    .map((t) => ({ ...t, testDate: ymdOrNull(t.testDate), isTestDay: ymdOrNull(t.testDate) === today, today, chapterId: t.refId }));
}

/**
 * Spelling lists whose test date has passed, newest first, one per list. An undated list is not past.
 * A list that is pinned again (date moved, or still open) is not in review.
 */
export function pastSpellingLists(nowMs: number, tests: UpcomingTest[] = DEFAULT_UPCOMING): UpcomingTest[] {
  const today = etDateKey(new Date(nowMs));
  const active = new Set(tests.filter((t) => t.kind === "spelling" && isUpcomingActive(t, today)).map((t) => t.refId));
  const seen = new Set<string>();
  return tests
    .filter((t) => t.kind === "spelling" && !active.has(t.refId) && (ymdOrNull(t.testDate) ?? "9999") < today)
    .sort((a, b) => (ymdOrNull(b.testDate) ?? "").localeCompare(ymdOrNull(a.testDate) ?? "") || a.id.localeCompare(b.id))
    .filter((t) => (seen.has(t.refId) ? false : (seen.add(t.refId), true)));
}

/** The soonest active chapter practice test (the practice-test page uses this). */
export function activeUpcomingTest(nowMs: number, tests: UpcomingTest[] = DEFAULT_UPCOMING): ActiveUpcoming | null {
  return activeUpcomingTests(nowMs, tests).find((t) => t.kind === "practice-test") ?? null;
}

export function practiceTestHref(chapterId: string, mode?: "retry" | "review"): string {
  return `/study/${encodeURIComponent(chapterId)}/practice-test${mode ? `?mode=${mode}` : ""}`;
}

export function upcomingHref(t: Pick<UpcomingTest, "kind" | "refId">, mode?: "retry"): string {
  if (t.kind === "practice-test") return practiceTestHref(t.refId, mode);
  return `/study/${encodeURIComponent(t.refId)}`;
}

export function validUpcoming(x: Partial<UpcomingTest>): x is UpcomingTest {
  if (!(
    typeof x.id === "string" && x.id.length > 0 && x.id.length <= 80 &&
    (x.kind === "practice-test" || x.kind === "spelling" || x.kind === "chapter") &&
    typeof x.refId === "string" && x.refId.length > 0 && x.refId.length <= 80 &&
    typeof x.title === "string" && x.title.trim().length > 0 && x.title.length <= 120 &&
    typeof x.startDate === "string" && DATE.test(x.startDate) && !Number.isNaN(Date.parse(x.startDate))
  )) return false;
  const testDate = ymdOrNull(x.testDate);
  if (!testDate) return x.kind === "spelling";
  return x.startDate <= testDate;
}
