import { subjectName } from "@/lib/admin/subject-names";

export type GroupedMiss<T> = { key: string; count: number; latestAt: number; first: T };

/** Collapse repeated rows for the same question into one row with a count, newest first. */
export function groupByKey<T>(rows: T[], keyOf: (row: T) => string, atOf: (row: T) => number): GroupedMiss<T>[] {
  const map = new Map<string, GroupedMiss<T>>();
  for (const row of rows) {
    const key = keyOf(row);
    const at = atOf(row);
    const prev = map.get(key);
    if (!prev) map.set(key, { key, count: 1, latestAt: at, first: row });
    else {
      prev.count += 1;
      if (at > prev.latestAt) {
        prev.latestAt = at;
        prev.first = row;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.latestAt - a.latestAt);
}

const SUBJECT_ORDER = ["ela", "math", "religion", "science"];

/** Group rows by subject in a fixed order (Reading, Math, Religion, Science, then anything else). */
export function groupBySubject<T>(rows: T[], subjectOf: (row: T) => string | null | undefined): { subject: string; label: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const s = subjectOf(row) ?? "unknown";
    map.set(s, [...(map.get(s) ?? []), row]);
  }
  const rank = (s: string) => (SUBJECT_ORDER.indexOf(s) === -1 ? 99 : SUBJECT_ORDER.indexOf(s));
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([subject, list]) => ({ subject, label: subjectName(subject), rows: list }));
}
