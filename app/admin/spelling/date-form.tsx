"use client";

import { useState } from "react";
import type { UpcomingTest } from "@/lib/practice/upcoming";

/** Set or clear a spelling list's test date. An empty date stays "no date yet" and keeps the list pinned. */
export function SpellingDateForm({ test }: { test: UpcomingTest }) {
  const [date, setDate] = useState(test.testDate ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setMsg(null);
    const next: UpcomingTest = { ...test, testDate: date || null };
    const res = await fetch("/api/admin/upcoming-tests", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    setPending(false);
    if (!res.ok) {
      setMsg("Couldn't save that date.");
      return;
    }
    setMsg(date ? "Saved." : "Saved. no date yet.");
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <label>
        Test date{" "}
        <input aria-label={`Test date for ${test.title}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save date"}</button>
      <button type="button" onClick={() => setDate("")}>Clear</button>
      {!date ? <b>no date yet</b> : null}
      {msg ? <span aria-live="polite">{msg}</span> : null}
    </form>
  );
}
