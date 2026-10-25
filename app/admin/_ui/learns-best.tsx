import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import type { LearnsBestView } from "@/lib/admin/learns-best";

export function LearnsBest({ data }: { data: LearnsBestView }) {
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Learning</p>
      <h1>How Mae learns best</h1>
      <p className="pd-lead">
        When Mae gets stuck, the next day&apos;s &quot;Let&apos;s try this again&quot; re-teaches it one of three ways: the Watch it recap,
        a careful re-read, or a straight retry. A Thompson-sampling chooser favors what has worked in each subject and still
        explores at random {Math.round(data.exploreRate * 100)}% of the time. Success means her next answer on that question was
        right on the first try without a hint. A way shows &quot;Still exploring&quot; until it has {data.minAttempts} finished tries.
      </p>
      {data.subjects.length === 0 ? (
        <EmptyState title="Still exploring" body="No re-teach episodes yet. They start the first time she sees “Let’s try this again.”" />
      ) : (
        data.subjects.map((subject) => (
          <section className="pd-card" key={subject.subject} style={{ marginTop: 14 }}>
            <h2 style={{ textTransform: "capitalize" }}>{subject.subject}</h2>
            <p className="pd-lead" style={{ marginTop: 0 }}>{subject.summary}</p>
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Way</th>
                  <th>Finished tries</th>
                  <th>First-try success</th>
                  <th>Estimate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subject.arms.map((arm) => (
                  <tr key={arm.modality}>
                    <td>{arm.label}{subject.best === arm.modality ? " ★" : ""}</td>
                    <td>{arm.attempts}{arm.open ? ` (+${arm.open} open)` : ""}</td>
                    <td>{formatPct(arm.successRate)}</td>
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
        <h2>Planner notes (last 14 days)</h2>
        {data.notes.length === 0 ? (
          <EmptyState title="No plans yet" body="Each sign-in builds Today’s plan; Grok’s note for you shows here." />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.notes.map((note) => (
              <li key={note.createdAt} style={{ marginBottom: 8 }}>
                <strong>{formatEtDateTime(note.createdAt)}</strong> · {note.source === "ai" ? "Grok" : "Fallback"}{note.preview ? " (your preview)" : ""}: {note.adminNote || "—"}
                {note.whyKid ? <span className="pd-note"> (Mae saw: “{note.whyKid}”)</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
