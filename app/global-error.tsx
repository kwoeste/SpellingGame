"use client";

/** Last-resort fallback for errors in the root layout (header, providers). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "48px 16px" }}>
        <h1>Oops, something went wrong</h1>
        <p>Please reload the page.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
