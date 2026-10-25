"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "Ask Grok now": refreshes the learning insight (capped per day; falls back without a key). */
export function InsightButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/learns-best/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.status === 429) setMsg("Daily limit reached; try again tomorrow.");
      else if (!res.ok) setMsg("Couldn't refresh right now.");
      else {
        const json = (await res.json()) as { source?: string };
        setMsg(json.source === "ai" ? "Updated by Grok." : "Updated (Grok unavailable, used the built-in summary).");
        router.refresh();
      }
    } catch {
      setMsg("Couldn't refresh right now.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <p style={{ marginTop: 8 }}>
      <button type="button" className="pd-btn" onClick={run} disabled={busy}>
        {busy ? "Analyzing…" : "Ask Grok now"}
      </button>{" "}
      {msg ? <span className="pd-note">{msg}</span> : null}
    </p>
  );
}
