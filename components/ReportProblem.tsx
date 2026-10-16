"use client";

import { useState } from "react";

export function ReportProblem() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");

  async function submit() {
    setStatus("Sending…");
    const res = await fetch("/api/report-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        details,
        page: typeof window !== "undefined" ? window.location.pathname : "",
      }),
    });
    const json = (await res.json()) as { ok?: boolean; url?: string; message?: string };
    setStatus(json.url ? `Opened: ${json.url}` : json.message || "Thanks. Kevin will see this.");
  }

  return (
    <div className="report-btn">
      {!open ? (
        <button className="btn" onClick={() => setOpen(true)}>
          Report a problem
        </button>
      ) : (
        <div className="card" style={{ width: 280 }}>
          <strong>Report a problem</strong>
          <p style={{ color: "var(--soft)", fontSize: "0.85rem" }}>
            This opens a GitHub issue for Kevin. Do not include private details.
          </p>
          <input
            placeholder="Short title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", margin: "8px 0", padding: 8 }}
          />
          <textarea
            placeholder="What happened?"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 8 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={submit}>
              Send
            </button>
            <button className="btn secondary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          {status ? <p>{status}</p> : null}
        </div>
      )}
    </div>
  );
}
