"use client";

import { useMemo, useState } from "react";
import type { GameId, GameSpec } from "@/lib/content/games";

export function NamedGame({ gameId, title, spec }: { gameId: GameId; title: string; spec: GameSpec }) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const leftover = useMemo(
    () => spec.items.filter((item) => !placed[item.label]),
    [placed, spec.items],
  );

  function check() {
    const correct = spec.items.every((item) => placed[item.label] === item.bin);
    setFeedback(correct ? "Yes — that set holds. Great place to stop, or play again." : "Not yet — here's the trick. Read the label again and move one card.");
    if (correct) {
      void fetch("/api/engine/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: "games",
          events: [{ id: crypto.randomUUID(), type: "game_event", payload: { game_id: gameId, detail: "round_complete" } }],
        }),
      }).catch(() => undefined);
    }
  }

  return (
    <div className="card">
      <h1>{title}</h1>
      <p>{spec.prompt}</p>
      <div className="chips">
        {leftover.map((item) => (
          <span key={item.label} className="tile">
            {item.label}
            {spec.bins.map((bin) => (
              <button
                key={bin}
                className="btn secondary"
                style={{ marginLeft: 6 }}
                onClick={() => setPlaced((prev) => ({ ...prev, [item.label]: bin }))}
              >
                {bin}
              </button>
            ))}
          </span>
        ))}
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        {spec.bins.map((bin) => (
          <div key={bin} className="drop">
            <strong>{bin}</strong>
            {spec.items
              .filter((item) => placed[item.label] === bin)
              .map((item) => (
                <p key={item.label}>{item.label}</p>
              ))}
          </div>
        ))}
      </div>
      <button className="btn" onClick={check} style={{ marginTop: 12 }}>
        Check
      </button>
      <p role="status" aria-live="polite">{feedback}</p>
    </div>
  );
}
