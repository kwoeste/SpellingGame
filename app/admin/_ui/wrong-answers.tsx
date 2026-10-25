"use client";

import { useMemo, useState } from "react";
import { AnswerList } from "@/app/admin/_ui/answer-list";
import { EmptyState } from "@/app/admin/_ui/empty";
import { PageHeader } from "@/app/admin/_ui/page-header";
import { formatEtDateTime } from "@/lib/admin/format";
import { relabelChoicesFor, strategyDetail, strategyLabel, strategySourceLabel, isUnknownStrategy } from "@/lib/admin/strategy-labels";
import { tidyId } from "@/lib/admin/subject-names";
import { subjectLabel, type WrongAnswerView } from "@/lib/admin/types";

function seconds(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
}

function whereLabel(row: { source: string; chapterId: string | null }, chapterLabel: (id: string | null) => string): string {
  if (row.source === "watch_check") return chapterLabel(row.chapterId);
  if (row.source === "game") return "Game";
  return chapterLabel(row.chapterId);
}

const PAGE = 20;

type Row = WrongAnswerView["rows"][number];

/** One group per question (newest miss first), so repeats show once with a count. */
export function groupMisses(rows: Row[]): { latest: Row; earlier: Row[] }[] {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.itemId ?? row.eventId;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => b.ts - a.ts);
      return { latest: sorted[0], earlier: sorted.slice(1) };
    })
    .sort((a, b) => b.latest.ts - a.latest.ts);
}

export function WrongAnswerTable({ data, chapterLabels = {} }: { data: WrongAnswerView; chapterLabels?: Record<string, string> }) {
  const [subject, setSubject] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [query, setQuery] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const chapterLabel = (id: string | null) => (id ? chapterLabels[id] ?? tidyId(id) : "—");

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
  const groups = groupMisses(rows);
  const shown = groups.slice(0, limit);
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
            Questions where she missed 4 or more times in a row, used &ldquo;Show me&rdquo;, or skipped. Each one comes back in her next session until she gets it right on the first try. Rows marked &ldquo;Got it now&rdquo; are done.
          </p>
          <ul className="pd-list">
            {data.needsReteach.map((row) => (
              <li key={row.key} className="pd-list-row">
                <div>
                  <strong>
                    {whereLabel(row, chapterLabel)} – {row.label}
                  </strong>
                  <div className="pd-note">
                    {row.maxMisses > 0 ? `missed ${row.maxMisses} time${row.maxMisses === 1 ? "" : "s"} in a row` : "no wrong tries"}
                    {row.reveals ? ` · used Show me ${row.reveals}×` : ""}
                    {row.skips ? ` · skipped ${row.skips}×` : ""} · last {formatEtDateTime(row.lastTs)}
                  </div>
                </div>
                {row.cleared ? <span className="pd-badge ok">Got it now</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.patterns.length > 0 ? (
        <section className="pd-card pd-section">
          <h2>Why she missed (patterns)</h2>
          <p className="pd-note">Each number counts missed answers with that likely reason, so one question missed twice counts twice.</p>
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
          Showing {rows.length} of {data.rows.length} missed answers · {groups.length} different question{groups.length === 1 ? "" : "s"}
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
          <table className="pd-table pd-answers pd-answers-lg">
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
              {shown.map(({ latest: row, earlier }) => (
                <tr key={row.eventId}>
                  <td data-label="When">{formatEtDateTime(row.ts)}</td>
                  <td data-label="Question">
                    <span className="pd-badge bad">✗ Wrong</span>
                    <div className="pd-note">{row.chapterLabel ?? subjectLabel(row.subject)}</div>
                    <div>{row.itemText}</div>
                    {earlier.length ? (
                      <details className="pd-earlier">
                        <summary>Missed {earlier.length + 1} times · show earlier</summary>
                        <ul className="pd-list">
                          {earlier.map((e) => (
                            <li key={e.eventId}>
                              <span className="pd-note">{formatEtDateTime(e.ts)}</span> · <AnswerList answer={e.herAnswer} showMarks />
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
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
                      <option value="">Change…</option>
                      {relabelChoicesFor(row.subject).map((choice) => (
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
          {groups.length > limit ? (
            <p style={{ textAlign: "center" }}>
              <button type="button" className="pd-btn" onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, groups.length - limit)} more questions
              </button>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
