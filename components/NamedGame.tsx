"use client";

import { useMemo, useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { playSound } from "@/lib/ui/sounds";
import type { GameId, GameSpec } from "@/lib/content/games";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import { binGameHelp } from "@/lib/help/games";
import type { StuckHelp } from "@/lib/help/ladder";

export function NamedGame({ gameId, title, spec }: { gameId: GameId; title: string; spec: GameSpec }) {
  const prefs = useKidPrefs();
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState("");
  const [feedback, setFeedback] = useState("");
  const [won, setWon] = useState(false);
  const [misplaced, setMisplaced] = useState<Set<string>>(new Set());
  // Stuck-help ladder: failed checks this round, current help, Show me used.
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<StuckHelp | null>(null);
  const [revealed, setRevealed] = useState(false);
  const leftover = useMemo(() => spec.items.filter((item) => !placed[item.label]), [placed, spec.items]);

  function place(label: string, bin: string) {
    setPlaced((prev) => ({ ...prev, [label]: bin }));
    setPicked("");
    setMisplaced(new Set());
    setFeedback("");
    playSound("pair", prefs.soundOn);
  }

  function logGame(detail: string, extra: Record<string, unknown> = {}) {
    void fetch("/api/engine/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: "games",
        events: [{ id: crypto.randomUUID(), type: "game_event", payload: { game_id: gameId, detail, ...extra } }],
      }),
    }).catch(() => undefined);
  }

  function showMe() {
    if (!help?.reveal) return;
    setRevealed(true);
    setPlaced(help.reveal.response as Record<string, string>);
    setMisplaced(new Set());
    setFeedback("");
    prefs.speak(help.reveal.answer);
    logGame("revealed", { misses });
  }

  function skipRound() {
    logGame("skipped", { misses });
    setPlaced({});
    setMisplaced(new Set());
    setFeedback("Okay! Let's start this one fresh.");
    setMisses(0);
    setHelp(null);
    setRevealed(false);
  }

  function check() {
    const wrongLabels = spec.items.filter((item) => placed[item.label] !== item.bin).map((item) => item.label);
    const correct = wrongLabels.length === 0;
    setMisplaced(new Set(wrongLabels));
    const wrongCount = wrongLabels.length;
    const message = correct
      ? "Yes — that set holds. Great place to stop, or play again."
      : wrongCount === 1
        ? "Not yet — one card is misplaced (highlighted). Read the label and try again."
        : `Not yet — ${wrongCount} cards are misplaced (highlighted). Read each label and try again.`;
    setFeedback(message);
    setWon(correct);
    playSound(correct ? "fanfare" : "wrong", prefs.soundOn);
    prefs.speak(message);
    if (correct) {
      logGame("round_complete", misses ? { misses, revealed } : {});
      setHelp(null);
    } else {
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      const nextHelp = binGameHelp(spec.items, placed, nextMisses);
      if (nextHelp) {
        if (nextHelp.place) setPlaced((prev) => ({ ...prev, ...nextHelp.place }));
        setHelp(nextHelp);
        if (nextHelp.stage === "hint") logGame("stuck", { misses: nextMisses });
      }
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
          <div
            key={bin}
            role="region"
            aria-label={`${bin} bin`}
            className="drop"
            onClick={() => {
              if (picked) place(picked, bin);
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && picked) {
                e.preventDefault();
                place(picked, bin);
              }
            }}
            tabIndex={picked ? 0 : -1}
          >
            <strong>{bin}</strong>
            {spec.items
              .filter((item) => placed[item.label] === bin)
              .map((item) => (
                <p
                  key={item.label}
                  className={misplaced.has(item.label) ? "misplaced" : ""}
                  style={
                    misplaced.has(item.label)
                      ? {
                          border: "3px solid #dc2626",
                          borderRadius: 8,
                          padding: "6px 10px",
                          backgroundColor: "#fef2f2",
                          animation: "shake 0.4s ease-in-out",
                        }
                      : undefined
                  }
                >
                  {misplaced.has(item.label) ? <span aria-hidden="true">⚠️ </span> : null}
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
                      setMisplaced(new Set());
                      setFeedback("");
                    }}
                  >
                    Move
                  </button>
                </p>
              ))}
          </div>
        ))}
      </div>
      <button className="btn" onClick={check} style={{ marginTop: 12 }}>
        Check
      </button>
      <p role="status" aria-live="polite">
        {feedback}
      </p>
      {won ? null : <StuckHelpPanel help={help} revealed={revealed} onShowMe={showMe} onSkip={skipRound} />}
    </div>
  );
}
