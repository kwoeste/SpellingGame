"use client";

import { useEffect } from "react";

/** Friendly fallback so a client error never leaves a blank page. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="kid-shell">
      <div className="card" style={{ textAlign: "center", maxWidth: 480, margin: "40px auto" }}>
        <h1>Oops, something went wrong</h1>
        <p>This page hit a snag. Try again, or reload the page.</p>
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
