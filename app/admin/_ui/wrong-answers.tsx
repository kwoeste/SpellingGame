"use client";

import { useMemo, useState } from "react";
import { AnswerList } from "@/app/admin/_ui/answer-list";
import { EmptyState } from "@/app/admin/_ui/empty";
import { PageHeader } from "@/app/admin/_ui/page-header";
import { formatEtDateTime } from "@/lib/admin/format";
import { RELABEL_CHOICES, strategyDetail, strategyLabel, strategySourceLabel, isUnknownStrategy } from "@/lib/admin/strategy-labels";
import { subjectLabel, type WrongAnswerView } from "@/lib/admin/types";

function seconds(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
}

function whereLabel(row: { source: string; chapterId: string | null }, chapterLabel: (id: string | null) => string): string {
  if (row.source === "watch_check") return "Watch it check";
  if (row.source === "game") return "Game";
  return chapterLabel(row.chapterId);
}

export function WrongAnswerTable({ data, chapterLabels = {} }: { data: WrongAnswerView; chapterLabels?: Record<string, string> }) {
  const [subject, setSubject] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [query, setQuery] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chapterLabel = (id: string | null) => (id ? chapterLabels[id] ?? id : "—");

  const strategies = useMemo(
    () => [...new Set(data.rows.map((row) => row.strategy).filter((value): value is string => Boolean(value)))].sort(),
    [data.rows],
  );
  const subjects = useMemo(() => [...new Set(data.rows.map((row) => row.subject))].filter((s) => s !== "unknown"), [data.rows]);

  const rows = data.rows.filter((row) => {
    if (firstOnly && !row.firstAttempt) return false;
    if (subject !== "all" && row.subject !== subject) return false;
    if (strategy !== "all" && row.strategy !== strategy) return false;
    if (query) {
      const hay = `${row.itemText} ${row.responseText} ${row.conceptTitle} ${row.correctAnswer} ${row.chapterLabel ?? ""}`.toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });
  const openReteach = data.needsReteach.filter((row) => !row.cleared);

  async function relabel(eventId: string, next: string) {
    if (!next) return;
    setBusy(eventId);
    setError(null);
    try {
      const res = await fetch("/api/admin/strategy/relabel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, strategy: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      window.location.reload();
    } catch {
      setError("Couldn't save that label. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pd-wrap">
      <PageHeader
        kicker="Missed questions"
        title="What she got wrong"
        lead="Every missed answer: the question, what she answered, the right answer, and our best guess at why. Parts she got wrong are marked ✗."
      />
      {openReteach.length > 0 || data.needsReteach.length > 0 ? (
        <section className="pd-card pd-section" data-testid="needs-reteach">
          <h2>Needs re-teaching</h2>
          <p className="pd-note">
            Questions where she missed 4 times, used &ldquo;Show me&rdquo;, or skipped. These come back automatically in her next session until she gets them right on the first try.
          </p>
          <ul className="pd-list">
            {data.needsReteach.map((row) => (
              <li key={row.key} className="pd-list-row">
                <div>
                  <strong>{row.label}</strong>
                  <div className="pd-note">
                    {whereLabel(row, chapterLabel)} · up to {row.maxMisses} misses
                    {row.reveals ? ` · used Show me ${row.reveals}×` : ""}
                    {row.skips ? ` · skipped ${row.skips}×` : ""} · last {formatEtDateTime(row.lastTs)}
                  </div>
                </div>
                <span className={`pd-badge ${row.cleared ? "ok" : "bad"}`}>{row.cleared ? "Got it now" : "Needs re-teaching"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.patterns.length > 0 ? (
        <section className="pd-card pd-section">
          <h2>Why she missed (patterns)</h2>
          <div className="pd-legend">
            {data.patterns.map((pattern) => (
              <span key={pattern.key} className="pd-pill in_progress" title={pattern.detail}>
                {pattern.label} · {pattern.count}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <div className="pd-filters" role="search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions or answers" aria-label="Search" />
        <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Subject">
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {subjectLabel(s)}
            </option>
          ))}
        </select>
        <select value={strategy} onChange={(event) => setStrategy(event.target.value)} aria-label="Reason">
          <option value="all">All reasons</option>
          {strategies.map((value) => (
            <option key={value} value={value}>
              {strategyLabel(value)}
            </option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={firstOnly} onChange={(event) => setFirstOnly(event.target.checked)} /> Only first tries
        </label>
        <span className="pd-note">
          {rows.length} of {data.rows.length}
        </span>
      </div>
      {error ? <p className="pd-error" role="alert">{error}</p> : null}
      {rows.length === 0 ? (
        <EmptyState
          title={data.rows.length === 0 ? "No missed questions yet" : "Nothing matches these filters"}
          body={data.rows.length === 0 ? "When Mae misses a question it shows up here with her answer and the right one." : "Try clearing the search or picking All subjects."}
        />
      ) : (
        <div className="pd-card pd-table-wrap">
          <table className="pd-table pd-answers">
            <thead>
              <tr>
                <th>When</th>
                <th>Question</th>
                <th>Her answer</th>
                <th>Right answer</th>
                <th>Try</th>
                <th>Time</th>
                <th>Likely reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eventId}>
                  <td data-label="When">{formatEtDateTime(row.ts)}</td>
                  <td data-label="Question">
                    <span className="pd-badge bad">✗ Wrong</span>
                    <div className="pd-note">{row.chapterLabel ?? subjectLabel(row.subject)}</div>
                    <div>{row.itemText}</div>
                  </td>
                  <td data-label="Her answer">
                    <AnswerList answer={row.herAnswer} showMarks />
                  </td>
                  <td data-label="Right answer">
                    <AnswerList answer={row.correct} />
                  </td>
                  <td data-label="Try">
                    {row.attemptNo ? `#${row.attemptNo}` : "—"}
                    {(row.hintLevel ?? 0) > 0 ? <div className="pd-note">after a hint</div> : null}
                  </td>
                  <td data-label="Time">{seconds(row.latencyMs)}</td>
                  <td data-label="Likely reason">
                    <span title={strategyDetail(row.strategy)} className={isUnknownStrategy(row.strategy) ? "pd-note" : undefined}>
                      {strategyLabel(row.strategy)}
                    </span>
                    {!isUnknownStrategy(row.strategy) ? <div className="pd-note">{strategySourceLabel(row.strategySource)}</div> : null}
                    {row.misconception ? <span className="pd-pill rusty">{row.misconception}</span> : null}
                    <select
                      className="pd-relabel"
                      aria-label="Change reason"
                      value=""
                      disabled={busy === row.eventId}
                      onChange={(event) => relabel(row.eventId, event.target.value)}
                    >
                      <option value="">Change reason…</option>
                      {RELABEL_CHOICES.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
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
