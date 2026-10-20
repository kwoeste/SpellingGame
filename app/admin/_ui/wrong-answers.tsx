"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import type { WrongAnswerView } from "@/lib/admin/types";

export function WrongAnswerTable({ data }: { data: WrongAnswerView }) {
  const [subject, setSubject] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [query, setQuery] = useState("");
  const [firstOnly, setFirstOnly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const strategies = useMemo(
    () => [...new Set(data.rows.map((row) => row.strategy).filter((value): value is string => Boolean(value)))].sort(),
    [data.rows],
  );

  const rows = data.rows.filter((row) => {
    if (firstOnly && !row.firstAttempt) return false;
    if (subject !== "all" && row.subject !== subject) return false;
    if (strategy !== "all" && row.strategy !== strategy) return false;
    if (query) {
      const hay = `${row.itemText} ${row.responseText} ${row.conceptTitle} ${row.correctAnswer}`.toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  async function relabel(eventId: string) {
    const next = window.prompt("Strategy label (admin_label)");
    if (!next) return;
    setBusy(eventId);
    try {
      await fetch("/api/admin/strategy/relabel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, strategy: next.trim() }),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Wrong answers</p>
      <h1>Strategy log</h1>
      <p className="pd-lead">
        The item as she saw it, her answer, the correct answer, hints, latency, and the inferred or
        labeled strategy. First-attempt only is on by default.
      </p>
      {data.patterns.length > 0 ? (
        <section className="pd-card" style={{ marginBottom: 14 }}>
          <h2>Patterns</h2>
          <div className="pd-legend">
            {data.patterns.map((pattern) => (
              <span key={pattern.key} className="pd-pill in_progress">
                {pattern.label} · {pattern.count} · {pattern.detail}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <div className="pd-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item or answer" />
        <select value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="all">All subjects</option>
          <option value="math">Math</option>
          <option value="science">Science</option>
          <option value="ela">ELA</option>
          <option value="religion">Religion</option>
        </select>
        <select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
          <option value="all">All strategies</option>
          {strategies.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={firstOnly} onChange={(event) => setFirstOnly(event.target.checked)} /> First
          attempt only
        </label>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No wrong answers in this filter"
          body="Wrong first tries will land here with the stem, her response, and a strategy guess. You can relabel a row."
        />
      ) : (
        <div className="pd-card pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>When (ET)</th>
                <th>Item</th>
                <th>Her answer</th>
                <th>Correct</th>
                <th>Try</th>
                <th>Hint</th>
                <th>Latency</th>
                <th>Strategy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eventId}>
                  <td>{formatEtDateTime(row.ts)}</td>
                  <td>
                    <strong>{row.conceptTitle}</strong>
                    <div>{row.itemText}</div>
                  </td>
                  <td>{row.responseText}</td>
                  <td>{row.correctAnswer}</td>
                  <td>{row.attemptNo ?? "—"}</td>
                  <td>{row.hintLevel ?? 0}</td>
                  <td>{row.latencyMs === null ? "—" : `${Math.round(row.latencyMs / 100) / 10}s`}</td>
                  <td>
                    {row.strategy ?? "—"}
                    <div>
                      {row.strategySource} {row.strategyConfidence !== null ? formatPct(row.strategyConfidence) : ""}
                    </div>
                    {row.misconception ? <span className="pd-pill rusty">{row.misconception}</span> : null}
                  </td>
                  <td>
                    <button className="pd-btn secondary" type="button" disabled={busy === row.eventId} onClick={() => relabel(row.eventId)}>
                      Relabel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
