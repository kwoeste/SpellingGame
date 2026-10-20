"use client";

import { useMemo, useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { playSound } from "@/lib/ui/sounds";
import type { GameId, GameSpec } from "@/lib/content/games";

export function NamedGame({ gameId, title, spec }: { gameId: GameId; title: string; spec: GameSpec }) {
  const prefs = useKidPrefs();
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState("");
  const [feedback, setFeedback] = useState("");
  const [won, setWon] = useState(false);
  const leftover = useMemo(() => spec.items.filter((item) => !placed[item.label]), [placed, spec.items]);

  function place(label: string, bin: string) {
    setPlaced((prev) => ({ ...prev, [label]: bin }));
    setPicked("");
    playSound("pair", prefs.soundOn);
  }

  function check() {
    const correct = spec.items.every((item) => placed[item.label] === item.bin);
    const message = correct
      ? "Yes — that set holds. Great place to stop, or play again."
      : "Not yet — here's the trick. Read the label again and move one card.";
    setFeedback(message);
    setWon(correct);
    playSound(correct ? "fanfare" : "wrong", prefs.soundOn);
    prefs.speak(message);
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
      {won ? <ConfettiLayer fire /> : null}
      <p className="kid-kicker">Game lab</p>
      <h1>{title}</h1>
      <p>{spec.prompt}</p>
      <VoicePicker compact />
      <p>Tap a card, then tap a bin. Or tap a leftover card&apos;s bin button.</p>
      <div className="chips">
        {leftover.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`tile ${picked === item.label ? "selected" : ""}`}
            onClick={() => setPicked(item.label)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        {spec.bins.map((bin) => (
          <button
            key={bin}
            type="button"
            className="drop"
            onClick={() => {
              if (picked) place(picked, bin);
            }}
          >
            <strong>{bin}</strong>
            {spec.items
              .filter((item) => placed[item.label] === bin)
              .map((item) => (
                <p key={item.label}>
                  {item.label}{" "}
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaced((prev) => {
                        const next = { ...prev };
                        delete next[item.label];
                        return next;
                      });
                    }}
                  >
                    Move
                  </button>
                </p>
              ))}
          </button>
        ))}
      </div>
      <button className="btn" onClick={check} style={{ marginTop: 12 }}>
        Check
      </button>
      <p role="status" aria-live="polite">
        {feedback}
      </p>
    </div>
  );
}
