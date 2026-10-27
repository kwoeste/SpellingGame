import { HorizontalBars, LineChart } from "@/app/admin/_ui/charts";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtWeekday } from "@/lib/admin/format";
import { groupBySubject } from "@/lib/admin/group";
import { chapterFullName } from "@/lib/admin/names";
import { MASTERY_GATE, type ChapterProgressRow, type ProgressView } from "@/lib/admin/types";

/** Star column: earned, or how far from the 90% first-try rule. */
export function starStatus(chapter: Pick<ChapterProgressRow, "gated" | "firstTryPct" | "itemsAttempted" | "star">): string {
  if (chapter.gated) {
    const star = chapter.star;
    const when = star?.earnedAt ? ` ${formatEtWeekday(star.earnedAt)}` : "";
    if (star?.how === "parent") return "Given by parent";
    if (star?.how === "earlier_rule") return `Earned under earlier rule (${star.earnedPct}%)`;
    return star?.earnedPct != null ? `Star earned${when} (${star.earnedPct}% first try)` : "Star earned";
  }
  if (chapter.itemsAttempted === 0) return "Not started";
  if (chapter.firstTryPct >= MASTERY_GATE * 100) return "Ready for the star check";
  return "Not yet (needs 90% right on first try)";
}

/** First-try column: the current round, using the same rule as the star check. */
export function firstTryCell(chapter: Pick<ChapterProgressRow, "itemsAttempted" | "firstTryPct" | "star" | "gated">): string {
  if (!chapter.itemsAttempted) return "—";
  const star = chapter.star;
  if (star && star.roundAnswered === 0) {
    if (chapter.gated && star.earnedPct != null) return `${star.earnedPct}% at the star check`;
    if (star.lastCheckPct != null) return `${star.lastCheckPct}% at the last check`;
  }
  return `${chapter.firstTryPct}%${star && star.roundAnswered ? " this round" : ""}`;
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
          body="Subject bars and chapter rows fill in after Mae practices."
        />
      ) : null}
      <div className="pd-grid pd-two">
        {data.subjects.map((subject) => (
          <section className="pd-card" key={subject.subject}>
            <h2>
              {subject.label} · {subject.chaptersStarred} of {subject.chaptersTotal} chapter stars
            </h2>
            <p className="pd-lead" style={{ marginBottom: 10 }}>
              Skills: {subject.tried ?? subject.mastered + subject.inProgress} of {subject.concepts} tried · {subject.mastered} mastered ·{" "}
              {subject.inProgress} getting there · {subject.notSolid ?? 0} not solid yet · {subject.rusty} need a refresh
              {subject.frontier !== null ? ` · working at about grade ${subject.frontier.toFixed(1)}` : ""}
            </p>
            <HorizontalBars
              rows={[
                { label: "Mastered", pct: subject.concepts ? Math.round((subject.mastered / subject.concepts) * 100) : 0 },
                { label: "Tried", pct: subject.concepts ? Math.round(((subject.tried ?? 0) / subject.concepts) * 100) : 0 },
                { label: "Getting there", pct: subject.concepts ? Math.round((subject.inProgress / subject.concepts) * 100) : 0 },
                { label: "Needs a refresh", pct: subject.concepts ? Math.round(((subject.reviewDue + subject.rusty) / subject.concepts) * 100) : 0 },
              ]}
            />
            <div className="pd-table-wrap" style={{ marginTop: 10 }}>
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Grade level of the skill</th>
                    <th>Skills</th>
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
            <p className="pd-note">Grade level is when schools usually teach the skill (4.2 = early 4th grade).</p>
          </section>
        ))}
      </div>
      <section className="pd-card" style={{ marginTop: 14 }} data-testid="practice-tests">
        <h2>Practice tests</h2>
        <p className="pd-note">Fill-in-the-blank practice tests modeled on her class Guided Notes. Score is right on the first try; spelling counts on the real test.</p>
        {!data.practiceTests?.length ? (
          <EmptyState title="No practice tests yet" body="Results show here after Mae finishes a practice test." />
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Score</th>
                  <th>Spelled exactly</th>
                  <th>By lesson</th>
                  <th>Missed</th>
                  <th>Misspelled</th>
                </tr>
              </thead>
              <tbody>
                {data.practiceTests.map((t) => (
                  <tr key={`${t.at}-${t.chapterId}`}>
                    <td>{formatEtWeekday(t.at)}</td>
                    <td>{t.mode === "retry" ? "Retry missed" : "Full test"}</td>
                    <td>
                      {t.score} of {t.total}
                      {t.total ? ` (${Math.round((t.score / t.total) * 100)}%)` : ""}
                    </td>
                    <td>{t.exactSpelling} of {t.score}</td>
                    <td>{t.byLesson.map((l) => `L${l.lesson} ${l.right}/${l.total}`).join(" · ")}</td>
                    <td>{t.missed.join(", ") || "—"}</td>
                    <td>{t.misspelled.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Skills mastered over time</h2>
        {data.trend.length < 2 ? (
          <EmptyState title="Not enough days yet" body="This line appears after she has practiced on two or more days." />
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
          &ldquo;Answered right&rdquo; counts any correct answer, even after retries. &ldquo;Right on first try&rdquo; uses
          the star&apos;s own rule: each time she finishes a chapter is a star check, and only her first answer to each
          question since the last check counts. A star stays once earned.
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
                        <td>{firstTryCell(chapter)}</td>
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
