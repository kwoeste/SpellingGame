import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import type { LearnsBestView } from "@/lib/admin/learns-best";
import { InsightButton } from "@/app/admin/_ui/insight-button";

export function LearnsBest({ data }: { data: LearnsBestView }) {
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Learning</p>
      <h1>How Mae learns best</h1>
      <p className="pd-lead">
        Each new chapter starts one of several ways (Watch it recap, careful read, or the chapter&apos;s NotebookLM video, podcast or
        flashcards when it has them), and when Mae gets stuck, &quot;Let&apos;s try this again&quot; re-teaches it one of those ways or with a
        straight retry. The site keeps track of which way has worked in each subject and picks it more often, uses Grok&apos;s suggested weights only as a weak
        head start, and still explores at random {Math.round(data.exploreRate * 100)}% of the time. Success means her next answer on that
        question was right on the first try without a hint. A way shows &quot;Still exploring&quot; until it has {data.minAttempts} finished tries.
      </p>
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
                    <th>Suggested weight (chooser head start)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.insight.weights.map((w) => (
                    <tr key={`${w.subject}:${w.modality}`}>
                      <td style={{ textTransform: "capitalize" }}>{w.subject}</td>
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
        <p className="pd-note">Sent to Grok: only subject, way, question kind and numbers (accuracy after, later-review retention, time, rush rate, sample sizes).</p>
      </section>
      {data.subjects.length === 0 ? (
        <EmptyState title="Still exploring" body="No re-teaches yet. They start the first time she sees “Let’s try this again.”" />
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
                  <th>Median time</th>
                  <th>Rushed</th>
                  <th>Estimate</th>
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
