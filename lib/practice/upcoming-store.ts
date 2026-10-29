import { hasDatabase, queryOnce } from "@/lib/db/client";
import { DEFAULT_UPCOMING, type UpcomingTest } from "@/lib/practice/upcoming";

type Row = { id: string; kind: UpcomingTest["kind"]; ref_id: string; title: string; start_date: string; test_date: string };
const SELECT = "SELECT id, kind, ref_id, title, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(test_date, 'YYYY-MM-DD') AS test_date FROM planner.upcoming_test ORDER BY test_date, id";

const toTest = (r: Row): UpcomingTest => ({ id: r.id, kind: r.kind, refId: r.ref_id, title: r.title, startDate: r.start_date, testDate: r.test_date });

/** Live dated items (planner.upcoming_test); falls back to DEFAULT_UPCOMING with no DB, no table, or no rows. */
export async function loadUpcomingTests(role: "student" | "admin" = "student"): Promise<UpcomingTest[]> {
  if (!hasDatabase()) return DEFAULT_UPCOMING;
  try {
    const rows = await queryOnce<Row>(role, SELECT);
    return rows.length ? rows.map(toTest) : DEFAULT_UPCOMING;
  } catch (error) {
    console.warn("upcoming_test read failed; using defaults", error instanceof Error ? error.message : error);
    return DEFAULT_UPCOMING;
  }
}

export async function saveUpcomingTest(t: UpcomingTest, by: string): Promise<void> {
  await queryOnce(
    "admin",
    `INSERT INTO planner.upcoming_test (id, kind, ref_id, title, start_date, test_date, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5::date, $6::date, now(), $7)
     ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, ref_id = excluded.ref_id, title = excluded.title,
       start_date = excluded.start_date, test_date = excluded.test_date, updated_at = now(), updated_by = excluded.updated_by`,
    [t.id, t.kind, t.refId, t.title, t.startDate, t.testDate, by],
  );
}

export async function deleteUpcomingTest(id: string): Promise<void> {
  await queryOnce("admin", "DELETE FROM planner.upcoming_test WHERE id = $1", [id]);
}
