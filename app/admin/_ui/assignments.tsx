"use client";

import { useState } from "react";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime } from "@/lib/admin/format";
import type { AssignmentsView } from "@/lib/admin/types";

export function AssignmentsPanel({ data }: { data: AssignmentsView }) {
  const concepts = data.concepts;
  const chapters = data.chapters;
  const [targetType, setTargetType] = useState<"concept" | "chapter">("concept");
  const [targetId, setTargetId] = useState(concepts[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [weekly, setWeekly] = useState(String(data.goal.weeklyXpGoal));
  const [daily, setDaily] = useState(String(data.goal.dailyMinutesGoal));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError("Could not save. Check the target and try again.");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Assignments</p>
      <h1>Goals and hole-filling</h1>
      <p className="pd-lead">
        Auto hole-fill walks hard prerequisites of weak concepts and assigns the deepest blockers
        first. You can also assign a chapter or concept by hand.
      </p>
      <div className="pd-grid pd-two">
        <section className="pd-card">
          <h2>Weekly goals</h2>
          <form
            className="pd-form"
            onSubmit={(event) => {
              event.preventDefault();
              void post({
                action: "goal",
                weeklyXpGoal: Number(weekly),
                dailyMinutesGoal: Number(daily),
              });
            }}
          >
            <label>
              Weekly XP goal
              <input value={weekly} onChange={(event) => setWeekly(event.target.value)} type="number" min={60} max={3000} />
            </label>
            <label>
              Daily minutes goal
              <input value={daily} onChange={(event) => setDaily(event.target.value)} type="number" min={5} max={180} />
            </label>
            <button className="pd-btn" type="submit" disabled={busy}>
              Save goals
            </button>
          </form>
        </section>
        <section className="pd-card">
          <h2>Manual assign</h2>
          <form
            className="pd-form"
            onSubmit={(event) => {
              event.preventDefault();
              void post({ action: "assign", targetType, targetId, reason });
            }}
          >
            <label>
              Type
              <select
                value={targetType}
                onChange={(event) => {
                  const next = event.target.value as "concept" | "chapter";
                  setTargetType(next);
                  setTargetId(next === "concept" ? (concepts[0]?.id ?? "") : (chapters[0]?.id ?? ""));
                }}
              >
                <option value="concept">Concept</option>
                <option value="chapter">Chapter</option>
              </select>
            </label>
            <label>
              Target
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                {targetType === "concept"
                  ? concepts.map((concept) => (
                      <option key={concept.id} value={concept.id}>
                        {concept.title}
                      </option>
                    ))
                  : chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.title}
                      </option>
                    ))}
              </select>
            </label>
            <label>
              Note
              <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={400} />
            </label>
            <button className="pd-btn" type="submit" disabled={busy || !targetId}>
              Assign
            </button>
          </form>
        </section>
      </div>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Suggested holes</h2>
        {data.suggestedHoles.length === 0 ? (
          <EmptyState title="No holes detected" body="When a prerequisite is missing or rusty under an in-progress skill, it shows up here." />
        ) : (
          <div className="pd-alert">
            {data.suggestedHoles.map((alert) => (
              <div key={`${alert.targetId}`} className="pd-alert-item" data-kind="hole">
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </div>
            ))}
          </div>
        )}
        <button
          className="pd-btn"
          style={{ marginTop: 12 }}
          type="button"
          disabled={busy || data.suggestedHoles.length === 0}
          onClick={() => void post({ action: "auto_holes" })}
        >
          Auto-assign hole-fills
        </button>
      </section>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Open and recent</h2>
        {error ? <p className="notice">{error}</p> : null}
        {data.assignments.length === 0 ? (
          <EmptyState title="Nothing assigned" body="Manual assigns and auto hole-fills will list here." />
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Title</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.assignments.map((row) => (
                  <tr key={row.id}>
                    <td>{formatEtDateTime(row.createdAt)}</td>
                    <td>{row.kind}</td>
                    <td>{row.title}</td>
                    <td>{row.reason ?? "—"}</td>
                    <td>
                      <span className={`pd-pill ${row.status === "open" ? "in_progress" : "mastered"}`}>{row.status}</span>
                    </td>
                    <td>
                      {row.status === "open" ? (
                        <button className="pd-btn secondary" type="button" disabled={busy} onClick={() => void post({ action: "update", id: row.id, status: "done" })}>
                          Mark done
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
