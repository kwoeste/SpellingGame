import { HorizontalBars, LineChart } from "@/app/admin/_ui/charts";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtWeekday } from "@/lib/admin/format";
import { groupBySubject } from "@/lib/admin/group";
import { chapterFullName } from "@/lib/admin/names";
import { MASTERY_GATE, type ChapterProgressRow, type ProgressView } from "@/lib/admin/types";

/** Star column: earned, or how far from the 90% first-try rule. */
export function starStatus(chapter: Pick<ChapterProgressRow, "gated" | "firstTryPct" | "itemsAttempted">): string {
  if (chapter.gated) return "Star earned";
  if (chapter.itemsAttempted === 0) return "Not started";
  if (chapter.firstTryPct >= MASTERY_GATE * 100) return "Ready for the star check";
  return "Not yet (needs 90% right on first try)";
}

export function ProgressViewPanel({ data }: { data: ProgressView }) {
  const anyMastery = data.subjects.some((subject) => subject.mastered > 0 || subject.inProgress > 0);
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Progress</p>
      <h1>By subject and chapter</h1>
      <p className="pd-lead">
        A chapter star means she got at least 90% right on the first try, without big hints. Skills count as
        mastered once she gets them right reliably over several days.
      </p>
      {!anyMastery ? (
        <EmptyState
          title="No mastery yet"
          body="Subject bars and chapter rows fill in after Mae practices. Grade-level spread uses each concept's milestone, not a lock at grade 4."
        />
      ) : null}
      <div className="pd-grid pd-two">
        {data.subjects.map((subject) => (
          <section className="pd-card" key={subject.subject}>
            <h2>
              {subject.label} · {subject.chaptersStarred} of {subject.chaptersTotal} chapter stars
            </h2>
            <p className="pd-lead" style={{ marginBottom: 10 }}>
              Skills: {subject.mastered} of {subject.concepts} mastered · {subject.inProgress} in progress · {subject.rusty} need a refresh
              {subject.frontier !== null ? ` · working at about grade ${subject.frontier.toFixed(1)}` : ""}
            </p>
            <HorizontalBars
              rows={[
                { label: "Mastered", pct: subject.concepts ? Math.round((subject.mastered / subject.concepts) * 100) : 0 },
                { label: "In progress", pct: subject.concepts ? Math.round((subject.inProgress / subject.concepts) * 100) : 0 },
                { label: "Review / rusty", pct: subject.concepts ? Math.round(((subject.reviewDue + subject.rusty) / subject.concepts) * 100) : 0 },
              ]}
            />
            <div className="pd-table-wrap" style={{ marginTop: 10 }}>
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Grade band</th>
                    <th>Concepts</th>
                    <th>Mastered</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.gradeSpread.map((band) => (
                    <tr key={band.band}>
                      <td>{band.band}</td>
                      <td>{band.count}</td>
                      <td>{band.mastered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Skills mastered over time</h2>
        {data.trend.length === 0 ? (
          <EmptyState title="No trend yet" body="A daily line will show mastered-skill count and first-try accuracy." />
        ) : (
          <LineChart
            title="Mastered concepts over time"
            points={data.trend.map((point) => ({ x: point.day, y: point.mastered }))}
            caption="How many skills she has mastered so far, by day (ET)."
          />
        )}
      </section>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Chapters</h2>
        <p className="pd-note">
          &ldquo;Answered right&rdquo; counts any correct answer, even after retries. The star needs 90% right on the
          first try, so a chapter can be 100% answered right and still not have its star.
        </p>
        {groupBySubject(data.chapters, (c) => c.subject).map((group) => {
          const started = group.rows.filter((c) => c.itemsAttempted > 0).length;
          const stars = group.rows.filter((c) => c.gated).length;
          return (
            <details className="pd-group" key={group.subject} open={started > 0}>
              <summary>
                {group.label}
                <span className="pd-note">
                  {stars} of {group.rows.length} stars · {started} started
                </span>
              </summary>
              <div className="pd-table-wrap">
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>Chapter</th>
                      <th>Answered right</th>
                      <th>Right on first try</th>
                      <th>Star</th>
                      <th>Last practiced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((chapter) => (
                      <tr key={chapter.chapterId}>
                        <td>{chapterFullName({ book: chapter.book, number: chapter.number, titleKid: chapter.title })}</td>
                        <td>
                          {chapter.itemsCorrect} of {chapter.itemsTotal}
                        </td>
                        <td>{chapter.itemsAttempted ? `${chapter.firstTryPct}%` : "—"}</td>
                        <td>{starStatus(chapter)}</td>
                        <td>{chapter.lastSeenAt ? formatEtWeekday(chapter.lastSeenAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
