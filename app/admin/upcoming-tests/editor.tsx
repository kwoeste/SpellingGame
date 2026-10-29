"use client";

import { useState } from "react";
import type { UpcomingTest } from "@/lib/practice/upcoming";

const BLANK: UpcomingTest = { id: "", kind: "chapter", refId: "", title: "", startDate: "", testDate: "" };

/** Today's date (YYYY-MM-DD) in New York, where the tests happen. */
export function todayNY(now = Date.now()): string {
  return new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
export function isPastTest(t: Pick<UpcomingTest, "testDate">, today: string): boolean {
  return t.testDate < today;
}

export function UpcomingTestsEditor({ initial }: { initial: UpcomingTest[] }) {
  const [rows, setRows] = useState<UpcomingTest[]>(initial);
  const [draft, setDraft] = useState<UpcomingTest>(BLANK);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const today = todayNY();
  const pastCount = rows.filter((t) => isPastTest(t, today)).length;

  async function save(t: UpcomingTest) {
    setMsg(null);
    const res = await fetch("/api/admin/upcoming-tests", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(t) });
    if (!res.ok) return setMsg(res.status === 400 ? "Check the fields (dates YYYY-MM-DD, start on or before test)." : "Couldn't save.");
    setRows(((await res.json()) as { tests: UpcomingTest[] }).tests);
    setMsg(`Saved ${t.title}.`);
  }
  async function remove(id: string) {
    if (!confirm("Remove this dated item?")) return;
    const res = await fetch(`/api/admin/upcoming-tests?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    else setMsg("Couldn't remove.");
  }
  const edit = (i: number, patch: Partial<UpcomingTest>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <section className="pd-card">
      {pastCount ? (
        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past ({pastCount})
        </label>
      ) : null}
      <table className="pd-table">
        <thead><tr><th>Title</th><th>Kind</th><th>For (chapter / list id)</th><th>Pin from</th><th>Test date</th><th /></tr></thead>
        <tbody>
          {rows.map((t, i) => isPastTest(t, today) && !showPast ? null : (
            <tr key={t.id} style={isPastTest(t, today) ? { opacity: 0.5 } : undefined}>
              <td>{isPastTest(t, today) ? <small>past · </small> : null}<input value={t.title} onChange={(e) => edit(i, { title: e.target.value })} /></td>
              <td>{t.kind}</td>
              <td>{t.refId}</td>
              <td><input type="date" value={t.startDate} onChange={(e) => edit(i, { startDate: e.target.value })} /></td>
              <td><input type="date" value={t.testDate} onChange={(e) => edit(i, { testDate: e.target.value })} /></td>
              <td><button onClick={() => void save(t)}>Save</button> <button onClick={() => void remove(t.id)}>Remove</button></td>
            </tr>
          ))}
          <tr>
            <td><input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></td>
            <td>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as UpcomingTest["kind"] })}>
                <option value="chapter">chapter test</option><option value="practice-test">practice test</option><option value="spelling">spelling list</option>
              </select>
            </td>
            <td><input placeholder="e.g. savvas.ch4" value={draft.refId} onChange={(e) => setDraft({ ...draft, refId: e.target.value })} /></td>
            <td><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></td>
            <td><input type="date" value={draft.testDate} onChange={(e) => setDraft({ ...draft, testDate: e.target.value })} /></td>
            <td><button onClick={() => void save({ ...draft, id: `${draft.kind}:${draft.refId}:${draft.testDate}` }).then(() => setDraft(BLANK))}>Add</button></td>
          </tr>
        </tbody>
      </table>
      {msg ? <p aria-live="polite">{msg}</p> : null}
    </section>
  );
}
