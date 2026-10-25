"use client";

import { useState } from "react";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime } from "@/lib/admin/format";
import { groupBySubject } from "@/lib/admin/group";
import type { AssignTargetOption, AssignmentsView } from "@/lib/admin/types";

/** Dropdown options grouped by subject, each label prefixed with the subject so look-alikes are clear. */
function GroupedOptions({ options }: { options: AssignTargetOption[] }) {
  return (
    <>
      {groupBySubject(options, (o) => o.subject).map((group) => (
        <optgroup key={group.subject} label={group.label}>
          {group.rows.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title.startsWith(group.label) ? o.title : `${group.label} · ${o.title}`}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function AssignmentsPanel({ data }: { data: AssignmentsView }) {
  const concepts = data.concepts;
  const chapters = data.chapters;
  const [targetType, setTargetType] = useState<"concept" | "chapter">("concept");
  const [targetId, setTargetId] = useState(concepts[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [weekly, setWeekly] = useState(String(data.goal.weeklyXpGoal));
  const [daily, setDaily] = useState(String(data.goal.dailyMinutesGoal));
  const gated = new Set(data.gatedChapterIds);
  const ungated = chapters.filter((chapter) => !gated.has(chapter.id));
  const [gateChapter, setGateChapter] = useState(ungated[0]?.id ?? "");
  const [gateReason, setGateReason] = useState("");
  const [confirming, setConfirming] = useState(false);
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
      <h1>Goals and assignments</h1>
      <p className="pd-lead">
        Set weekly goals, give a chapter star by hand, or assign a chapter or skill. The site also suggests
        gaps: earlier skills she needs before the ones she&apos;s stuck on.
      </p>
      <div className="pd-grid pd-two">
        <section className="pd-card">
          <h2>Chapter star override</h2>
          <p className="pd-lead" style={{ marginTop: 0 }}>
            A chapter star normally needs 90% first-try right (no big hints) and every concept at 80%. Use this when you
            know she has it anyway. It is logged with your email and the reason. {gated.size} of {chapters.length} chapters have a star.
          </p>
          {ungated.length === 0 ? (
            <p className="pd-lead">Every chapter already has its star.</p>
          ) : (
            <form
              className="pd-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!gateChapter) return;
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setConfirming(false);
                void post({ action: "gate_override", chapterId: gateChapter, reason: gateReason || undefined });
              }}
            >
              <label>
                Chapter
                <select
                  value={gateChapter}
                  onChange={(event) => {
                    setGateChapter(event.target.value);
                    setConfirming(false);
                  }}
                >
                  <GroupedOptions options={ungated} />
                </select>
              </label>
              <label>
                Reason (optional)
                <input value={gateReason} maxLength={200} onChange={(event) => setGateReason(event.target.value)} />
              </label>
              {confirming ? (
                <div className="pd-confirm" role="alertdialog" aria-label="Confirm star">
                  <p className="pd-note" style={{ margin: 0 }}>
                    Give the star for <strong>{chapters.find((c) => c.id === gateChapter)?.title ?? "this chapter"}</strong> without the 90% check? This
                    unlocks what comes after it.
                  </p>
                  <p style={{ display: "flex", gap: 8, margin: "8px 0 0" }}>
                    <button className="pd-btn" type="submit" disabled={busy}>
                      Yes, give the star
                    </button>
                    <button className="pd-btn secondary" type="button" onClick={() => setConfirming(false)}>
                      Cancel
                    </button>
                  </p>
                </div>
              ) : (
                <button className="pd-btn" type="submit" disabled={busy}>
                  Give the star…
                </button>
              )}
            </form>
          )}
        </section>
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
          <h2>Assign something</h2>
          <form
            className="pd-form"
            onSubmit={(event) => {
              event.preventDefault();
              void post({ action: "assign", targetType, targetId, reason });
            }}
          >
            <label>
              What to assign
              <span className="pd-help">A whole chapter, or one skill inside a chapter (like its word meanings).</span>
              <select
                value={targetType}
                onChange={(event) => {
                  const next = event.target.value as "concept" | "chapter";
                  setTargetType(next);
                  setTargetId(next === "concept" ? (concepts[0]?.id ?? "") : (chapters[0]?.id ?? ""));
                }}
              >
                <option value="concept">One skill</option>
                <option value="chapter">Whole chapter</option>
              </select>
            </label>
            <label>
              {targetType === "concept" ? "Skill" : "Chapter"}
              <span className="pd-help">It shows up first in her next Study session until she finishes it.</span>
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                <GroupedOptions options={targetType === "concept" ? concepts : chapters} />
              </select>
            </label>
            <label>
              Note for yourself (optional)
              <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={400} />
            </label>
            <button className="pd-btn" type="submit" disabled={busy || !targetId}>
              Assign
            </button>
          </form>
        </section>
      </div>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Suggested gaps to fill</h2>
        {data.suggestedHoles.length === 0 ? (
          <EmptyState title="No gaps found" body="When a prerequisite is missing or rusty under an in-progress skill, it shows up here." />
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
          Assign all suggested gaps
        </button>
        <p className="pd-help">
          {data.suggestedHoles.length === 0
            ? "Turned off because there are no gaps to assign right now."
            : `Adds each of the ${data.suggestedHoles.length} gaps above to her assignments in one step.`}
        </p>
      </section>
      <section className="pd-card" style={{ marginTop: 14 }}>
        <h2>Open and recent</h2>
        {error ? <p className="notice">{error}</p> : null}
        {data.assignments.length === 0 ? (
          <EmptyState title="Nothing assigned" body="Things you assign, and suggested gaps, will list here." />
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
                    <td>{row.kind === "hole_fill" ? "Gap to fill" : "You assigned"}</td>
                    <td>{row.title}</td>
                    <td>{row.reason ?? "—"}</td>
                    <td>
                      <span className={`pd-pill ${row.status === "open" ? "in_progress" : "mastered"}`}>{{ open: "Open", paused: "Paused", done: "Done", cancelled: "Cancelled" }[row.status]}</span>
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
