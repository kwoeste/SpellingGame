"use client";

import { useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { playSound } from "@/lib/ui/sounds";

function randomNumber(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

export function NumberMatch() {
  const prefs = useKidPrefs();
  const [winScore, setWinScore] = useState(5);
  const [maxNumber, setMaxNumber] = useState(5);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [playerGuesses, setPlayerGuesses] = useState(true);
  const [phase, setPhase] = useState<"setup" | "roll" | "pick" | "count" | "reveal">("setup");
  const [count, setCount] = useState(0);
  const [playerNumber, setPlayerNumber] = useState(0);
  const [computerNumber, setComputerNumber] = useState(0);
  const [rolls, setRolls] = useState({ player: 0, computer: 0, playerWins: false });
  const [result, setResult] = useState("");
  const [won, setWon] = useState<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  function speak(text: string) {
    setResult(text);
    prefs.speak(text);
  }

  function rollForFirst(max: number) {
    setMaxNumber(max);
    setPlayerScore(0);
    setComputerScore(0);
    setWon(null);
    let playerRoll = 0;
    let computerRoll = 0;
    do {
      playerRoll = Math.floor(Math.random() * 6) + 1;
      computerRoll = Math.floor(Math.random() * 6) + 1;
    } while (playerRoll === computerRoll);
    const playerWins = playerRoll > computerRoll;
    setRolls({ player: playerRoll, computer: computerRoll, playerWins });
    setPlayerGuesses(!playerWins);
    setPhase("roll");
    speak(
      playerWins
        ? "You rolled higher! You go first and pick a secret number."
        : "The computer rolled higher! It goes first and has a secret number.",
    );
  }

  function startRound() {
    setPhase("pick");
    setPlayerNumber(0);
    setComputerNumber(0);
    speak(
      playerGuesses
        ? `The computer has a secret number. Guess it! Pick a number from 1 to ${maxNumber}.`
        : `You have the number! Pick a secret number from 1 to ${maxNumber}.`,
    );
  }

  function playRound(n: number) {
    const computer = randomNumber(maxNumber);
    setPlayerNumber(n);
    setComputerNumber(computer);
    setPhase("count");
    setCount(3);
    prefs.speak("Get ready");
    let left = 3;
    const timer = window.setInterval(() => {
      left -= 1;
      setCount(left);
      if (left <= 0) {
        window.clearInterval(timer);
        reveal(n, computer);
      }
    }, 1000);
  }

  function reveal(player: number, computer: number) {
    const matched = player === computer;
    let nextGuesses = playerGuesses;
    let nextPlayer = playerScore;
    let nextComputer = computerScore;
    let text = "";
    if (matched) {
      nextGuesses = !playerGuesses;
      if (playerGuesses) {
        nextPlayer += 1;
        text = "You matched it! +1 for you! Now you hold the number.";
        playSound("correct", prefs.soundOn);
      } else {
        nextComputer += 1;
        text = "The computer matched your number! +1 for it. Now you guess.";
      }
    } else if (playerGuesses) {
      nextComputer += 1;
      text = "No match. +1 for the computer, and it keeps its turn.";
    } else {
      nextPlayer += 1;
      text = "No match. +1 for you, and you keep your turn!";
      playSound("correct", prefs.soundOn);
    }
    setPlayerGuesses(nextGuesses);
    setPlayerScore(nextPlayer);
    setComputerScore(nextComputer);
    if (nextPlayer >= winScore || nextComputer >= winScore) {
      const playerWon = nextPlayer >= winScore;
      setWon(playerWon);
      setCelebrate(playerWon);
      text = playerWon
        ? `You win! ${nextPlayer} to ${nextComputer}`
        : `The computer wins ${nextComputer} to ${nextPlayer}. Good game!`;
      if (playerWon) playSound("fanfare", prefs.soundOn);
    }
    setPhase("reveal");
    speak(text);
  }

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <ConfettiLayer fire={celebrate} />
      <p className="kid-kicker">Counting game</p>
      <h1>Number Match</h1>
      <VoicePicker compact />
      {phase === "setup" ? (
        <div>
          <p>How many points to win?</p>
          <div className="chips" style={{ justifyContent: "center" }} role="group" aria-label="Choose the winning score">
            {[3, 5, 10].map((goal) => (
              <button key={goal} className={`btn ${winScore === goal ? "" : "secondary"}`} aria-pressed={winScore === goal} onClick={() => setWinScore(goal)}>
                First to {goal}
              </button>
            ))}
          </div>
          <p>How big should the numbers be?</p>
          <div className="chips" style={{ justifyContent: "center" }} role="group" aria-label="Choose the biggest number">
            {[3, 5, 10].map((max) => (
              <button key={max} className="btn" onClick={() => rollForFirst(max)}>
                1 to {max}
              </button>
            ))}
          </div>
          <p>One player hides a number and the other guesses it. The guesser scores a point on a correct match!</p>
        </div>
      ) : null}

      {phase !== "setup" ? (
        <>
          <p>First to {winScore} points wins!</p>
          <div className="stat-row" aria-live="polite" style={{ justifyContent: "center" }}>
            <div className="stat-card">
              <strong>{playerScore}</strong>You
            </div>
            <div className="stat-card">
              <strong>{computerScore}</strong>Computer
            </div>
          </div>
        </>
      ) : null}

      {phase === "roll" ? (
        <div>
          <p>Roll the dice to see who goes first!</p>
          <div className="stat-row" style={{ justifyContent: "center" }}>
            <div className="stat-card">
              <strong>🎲 {rolls.player}</strong>Your roll
            </div>
            <div className="stat-card">
              <strong>🎲 {rolls.computer}</strong>Computer&apos;s roll
            </div>
          </div>
          <button className="btn" onClick={startRound}>
            Let&apos;s go
          </button>
        </div>
      ) : null}

      {phase === "pick" ? (
        <div className="letter-pad" role="group" aria-label="Pick a number">
          {Array.from({ length: maxNumber }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => playRound(n)}>
              {n}
            </button>
          ))}
        </div>
      ) : null}

      {phase === "count" ? <p style={{ fontSize: "4rem", fontFamily: "var(--font-display)", margin: 0 }}>{count}</p> : null}

      {phase === "reveal" ? (
        <div>
          <div className="stat-row" style={{ justifyContent: "center" }}>
            <div className="stat-card">
              <strong>{playerNumber}</strong>
              {playerGuesses ? "Your guess" : "Your secret number"}
            </div>
            <div className="stat-card">
              <strong>{computerNumber}</strong>
              {playerGuesses ? "Computer's secret number" : "Computer's guess"}
            </div>
          </div>
          {won === null ? (
            <button className="btn" onClick={startRound}>
              Next
            </button>
          ) : (
            <button className="btn" onClick={() => setPhase("setup")}>
              Play again
            </button>
          )}
        </div>
      ) : null}

      <p role="status" aria-live="polite" style={{ fontWeight: 800, fontSize: "1.2rem" }}>
        {result}
      </p>
    </div>
  );
}
