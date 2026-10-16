"use client";

import { useState } from "react";

export default function NumberMatchPage() {
  const [goal, setGoal] = useState(5);
  const [max, setMax] = useState(0);
  const [you, setYou] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [playerGuesses, setPlayerGuesses] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");

  function start(n: number) {
    setMax(n);
    setYou(0);
    setCpu(0);
    const youRoll = Math.ceil(Math.random() * 6);
    const cpuRoll = Math.ceil(Math.random() * 6);
    const youFirst = youRoll >= cpuRoll;
    setPlayerGuesses(!youFirst);
    setPrompt(youFirst ? "You hold the secret number." : "Guess the computer's number.");
    setResult(`Dice: you ${youRoll}, computer ${cpuRoll}`);
  }

  function play(n: number) {
    const other = Math.ceil(Math.random() * max);
    const match = n === other;
    if (match) {
      setPlayerGuesses(!playerGuesses);
      setResult("Match! No points. Switch jobs.");
    } else if (playerGuesses) {
      setCpu((v) => v + 1);
      setResult("No match. Point for the computer.");
    } else {
      setYou((v) => v + 1);
      setResult("No match. Point for you.");
      void fetch("/api/engine/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [{ id: `nm-${Date.now()}`, sessionId: "count", seq: 1, type: "game_event", payload: { game_id: "number_match" } }],
        }),
      });
    }
  }

  return (
    <div className="wrap">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>Number Match</h1>
        {max === 0 ? (
          <>
            <p>First to</p>
            {[3, 5, 10].map((n) => (
              <button key={n} className="btn" onClick={() => setGoal(n)}>
                {n}
              </button>
            ))}
            <p>Biggest number</p>
            {[3, 5, 10].map((n) => (
              <button key={n} className="btn secondary" onClick={() => start(n)}>
                1 to {n}
              </button>
            ))}
          </>
        ) : (
          <>
            <p>First to {goal}. You {you} · Computer {cpu}</p>
            <p>{prompt}</p>
            <div className="chips" style={{ justifyContent: "center" }}>
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <button key={n} className="btn" onClick={() => play(n)}>
                  {n}
                </button>
              ))}
            </div>
            <p>{result}</p>
            {you >= goal || cpu >= goal ? <p>{you >= goal ? "You win!" : "Computer wins."}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
