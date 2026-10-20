import { HorizontalBars, LineChart } from "@/app/admin/_ui/charts";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDate } from "@/lib/admin/format";
import { subjectLabel, type ProgressView } from "@/lib/admin/types";

function friendlyChapterName(subject: string, number: number, title: string): string {
  const subjectName = subjectLabel(subject as "math" | "science" | "ela" | "religion");
  return `${subjectName} ${number} · ${title}`;
}

export function ProgressViewPanel({ data }: { data: ProgressView }) {
  const anyMastery = data.subjects.some((subject) => subject.mastered > 0 || subject.inProgress > 0);
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Progress</p>
      <h1>By subject and chapter</h1>
      <p className="pd-lead">
        Mastery toward the 90% gate, grade-level spread from concept milestones, and a trend of
        mastered concepts over time.
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
              {subject.label} · {subject.toward90}% toward 90%
            </h2>
            <p className="pd-lead" style={{ marginBottom: 10 }}>
              {subject.mastered} mastered · {subject.inProgress} in progress · {subject.rusty} rusty
              {subject.frontier !== null ? ` · frontier ${subject.frontier.toFixed(1)}` : ""}
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
        <h2>Mastery and accuracy over time</h2>
        {data.trend.length === 0 ? (
          <EmptyState title="No trend yet" body="A daily line will show mastered-concept count and first-try accuracy." />
        ) : (
          <LineChart
            title="Mastered concepts over time"
            points={data.trend.map((point) => ({ x: point.day, y: point.mastered }))}
            caption="Running count of concepts marked mastered. Accuracy is on the progress API trend payload."
          />
        )}
      </section>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Chapters</h2>
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Subject</th>
                <th>Items</th>
                <th>Toward 90%</th>
                <th>Gate</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {data.chapters.map((chapter) => (
                <tr key={chapter.chapterId}>
                  <td>
                    {friendlyChapterName(chapter.subject, chapter.number, chapter.title)}
                  </td>
                  <td>{subjectLabel(chapter.subject)}</td>
                  <td>
                    {chapter.itemsCorrect}/{chapter.itemsTotal}
                  </td>
                  <td>{chapter.masteryPct}%</td>
                  <td>{chapter.gated ? "Passed" : "Open"}</td>
                  <td>{chapter.lastSeenAt ? formatEtDate(chapter.lastSeenAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
