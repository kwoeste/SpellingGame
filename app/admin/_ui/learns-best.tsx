import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import type { LearnsBestView } from "@/lib/admin/learns-best";
import { subjectLabel } from "@/lib/admin/types";
import { InsightButton } from "@/app/admin/_ui/insight-button";

export function LearnsBest({ data }: { data: LearnsBestView }) {
  // Parent previews and the planner's engine notes stay off the page; only what Mae actually saw is shown.
  const mine = data.notes.filter((note) => !note.preview && note.whyKid);
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">How she learns</p>
      <h1>How Mae learns best</h1>
      <p className="pd-lead">
        When Mae gets stuck, the site explains the idea again a different way: a short video, a careful read, flashcards, or a
        simple retry. It keeps track of which way helps her get the next one right and uses that way more often.
      </p>
      <details className="pd-group">
        <summary>How this works</summary>
        <p className="pd-note">
          Success means her next answer on that question was right on the first try without a hint. A way says &ldquo;Still
          exploring&rdquo; until it has {data.minAttempts} finished tries. The site still tries a random way about{" "}
          {Math.round(data.exploreRate * 100)}% of the time so it keeps learning.
        </p>
      </details>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>How Mae learns best right now</h2>
        {data.insight ? (
          <>
            <p style={{ marginTop: 0 }}>{data.insight.summary}</p>
            <p className="pd-note">
              {data.insight.confidence} · {data.insight.source === "ai" ? `Grok (${data.insight.model ?? "xAI"})` : "Built-in summary (Grok not used)"} ·{" "}
              {data.insight.trigger === "weekly" ? "weekly" : "on demand"} · {formatEtDateTime(data.insight.createdAt)}
            </p>
            {data.insight.weights.length ? (
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Way</th>
                    <th>How often to try it first</th>
                  </tr>
                </thead>
                <tbody>
                  {data.insight.weights.map((w) => (
                    <tr key={`${w.subject}:${w.modality}`}>
                      <td>{subjectLabel(w.subject)}</td>
                      <td>{w.label}</td>
                      <td>{Math.round(w.weight * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </>
        ) : (
          <EmptyState title="No analysis yet" body="Grok looks at the numbers (never her name or anything she typed) every Monday, or when you click below." />
        )}
        <InsightButton />
        <p className="pd-note">Sent to Grok: only subject, way, question kind and numbers (how often she got it right afterward, whether she still knew it days later, time taken, how often she tapped too fast, and how many tries).</p>
      </section>
      {data.subjects.length === 0 ? (
        <EmptyState title="Still exploring" body="Nothing re-explained yet. They start the first time she sees “Let’s try this again.”" />
      ) : (
        data.subjects.map((subject) => (
          <section className="pd-card" key={subject.subject} style={{ marginTop: 14 }}>
            <h2>{subjectLabel(subject.subject)}</h2>
            <p className="pd-lead" style={{ marginTop: 0 }}>{subject.summary}</p>
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Way</th>
                  <th>Finished tries</th>
                  <th>First-try success</th>
                  <th>Median time</th>
                  <th>Tapped too fast</th>
                  <th>Expected success</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subject.arms.map((arm) => (
                  <tr key={arm.modality}>
                    <td>{arm.label}{subject.best === arm.modality ? " ★" : ""}</td>
                    <td>
                      {arm.attempts}
                      {arm.open ? ` (+${arm.open} open)` : ""}
                      {arm.firstTeach ? ` · ${arm.firstTeach} first teach` : ""}
                    </td>
                    <td>{formatPct(arm.successRate)}</td>
                    <td>{arm.medianSec === null ? "—" : `${arm.medianSec}s`}</td>
                    <td>{formatPct(arm.rushRate)}</td>
                    <td>{Math.round(arm.estimate * 100)}%</td>
                    <td>{arm.exploring ? <span className="pd-pill">Still exploring</span> : <span className="pd-pill ok">Enough data</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>What Mae was told about her plan</h2>
        {mine.length === 0 ? (
          <EmptyState title="No plans yet" body="Each time Mae opens Study, the site builds Today’s plan. The reason she was shown appears here." />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {mine.map((note) => (
              <li key={note.createdAt} style={{ marginBottom: 8 }}>
                <strong>{formatEtDateTime(note.createdAt)}</strong>: &ldquo;{note.whyKid}&rdquo;
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
