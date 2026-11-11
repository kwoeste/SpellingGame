import type { Metadata } from "next";
import { UpcomingTestsEditor } from "@/app/admin/upcoming-tests/editor";
import { loadPastTestRows, type PastTestRow } from "@/lib/admin/practice-review";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { pastSpellingLists } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";

export const metadata: Metadata = { title: "Admin · Test dates | Mae's Lab" };
export const dynamic = "force-dynamic";

function showDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function when(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

export default async function UpcomingTestsPage() {
  const tests = await loadUpcomingTests("admin");
  const inReview: PastTestRow[] = await loadPastTestRows(SEEDED_LEARNER_ID).catch(() => []);
  const spellingReview = pastSpellingLists(Date.now(), tests);
  return (
    <div>
      <h1>Test dates</h1>
      <p>Dated items are pinned first on her Today plan from the start date through the test date, soonest test first. Within a day of a test they can fill the whole session. A spelling list with no date yet stays pinned and shows &quot;no date yet&quot; until you set one here or on <a href="/admin/spelling">Spelling</a>. After a practice test&apos;s date passes, it moves to In review below. A spelling list does the same once its test date passes.</p>
      <UpcomingTestsEditor initial={tests} />
      <section className="pd-card" style={{ marginTop: 16 }}>
        <h2>In review</h2>
        <p>Past practice tests keep coming back in short quick reviews (about 4 questions, one a day at most). Questions she missed come back first; ones she got right wait longer.</p>
        {inReview.length ? (
          <table className="pd-table">
            <thead><tr><th>Test</th><th>Test date</th><th>Status</th><th>Last practice test score</th><th>Solid</th><th>Due now</th><th>Last review</th></tr></thead>
            <tbody>
              {inReview.map((r) => (
                <tr key={r.id}>
                  <td><a href={`/study/${encodeURIComponent(r.chapterId)}/practice-test?mode=review`}>{r.title}</a></td>
                  <td>{showDate(r.testDate)}</td>
                  <td>In review</td>
                  <td>{r.lastScore ? `${r.lastScore.right} of ${r.lastScore.total} (${Math.round((r.lastScore.right / r.lastScore.total) * 100)}%) on ${when(r.lastScore.at)}` : "No full practice test yet"}</td>
                  <td>{r.solidPct}%</td>
                  <td>{r.dueNow}</td>
                  <td>{r.lastReviewAt ? when(r.lastReviewAt) : "Not yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No past practice tests yet.</p>
        )}
        {spellingReview.length ? (
          <>
            <h3>Spelling in review</h3>
            <ul>
              {spellingReview.map((t) => (
                <li key={t.id}><a href={`/study/${encodeURIComponent(t.refId)}`}>{t.title}</a> — test {t.testDate ? showDate(t.testDate) : "no date yet"}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
