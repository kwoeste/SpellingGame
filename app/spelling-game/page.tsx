"use client";

import { useEffect, useState } from "react";

const WORDS = [
  "package", "dwell", "activity", "festive", "spend", "attitude", "elephant", "alligator", "shelf", "bandage",
  "measure", "rapid", "nonsense", "scrap", "meant", "taxes", "enter", "camper", "eggplant", "special",
  "edit", "began", "ramp", "absence", "except",
];

const SENTENCES: Record<string, string> = {
  package: "The mail carrier brought a package to the door.",
  dwell: "Some animals dwell in caves.",
  activity: "Painting is my favorite activity.",
  festive: "The room looked festive with balloons.",
  spend: "I like to spend time with my family.",
  attitude: "A good attitude makes learning fun.",
  elephant: "The elephant sprayed water with its trunk.",
  alligator: "The alligator slid into the swamp.",
  shelf: "Put the book back on the shelf.",
  bandage: "She put a bandage on her knee.",
  measure: "Use a ruler to measure the line.",
  rapid: "The rapid river rushed over the rocks.",
  nonsense: "That silly rhyme is nonsense.",
  scrap: "I used a scrap of paper to write a note.",
  meant: "I meant to say thank you.",
  taxes: "People pay taxes to help build roads.",
  enter: "Please knock before you enter the room.",
  camper: "The camper zipped up the tent.",
  eggplant: "We cooked eggplant for dinner.",
  special: "Today is a special day.",
  edit: "Please edit your story and fix mistakes.",
  began: "The show began at noon.",
  ramp: "The skateboard rolled down the ramp.",
  absence: "Her absence from school was because she was sick.",
  except: "Everyone came except Sam.",
};

export default function SpellingGamePage() {
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const word = WORDS[index] ?? "";

  function speak() {
    if (!word || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clip = new Audio(`/audio/${word}.mp3`);
    clip.onerror = () => {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(SENTENCES[word] ?? ""));
    };
    clip.play().then(() => {
      clip.onended = () => {
        const sentence = new Audio(`/audio/${word}-sentence.mp3`);
        sentence.play().catch(() => {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(SENTENCES[word] ?? ""));
        });
      };
    }).catch(() => {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${word}. ${SENTENCES[word] ?? ""}`));
    });
  }

  useEffect(() => {
    setGuessed([]);
    setMessage("");
    speak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, round]);

  function tap(letter: string) {
    const nextPos = guessed.length;
    if (letter === word[nextPos]) {
      const next = [...guessed, letter];
      setGuessed(next);
      if (next.join("") === word) {
        setMessage("Correct!");
        void fetch("/api/engine/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: [{ id: `spell-${word}-${Date.now()}`, sessionId: "spell", seq: index, type: "answer_submitted", payload: { game_id: "spelling", word } }],
          }),
        });
        window.setTimeout(() => {
          if (index + 1 >= WORDS.length) {
            if (round < 2) {
              setRound(2);
              setIndex(0);
            } else {
              setMessage("You finished all words!");
            }
          } else {
            setIndex(index + 1);
          }
        }, 700);
      }
    } else {
      setMessage("Not yet. Try the next letter again.");
    }
  }

  const letters =
    round >= 2
      ? "abcdefghijklmnopqrstuvwxyz".split("")
      : Array.from(new Set([...word.split(""), "q", "z", "x"])).sort();

  return (
    <div className="wrap">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>Spelling Safari</h1>
        <p>Round {round} of 2, Word {index + 1} of {WORDS.length}</p>
        <p>Spell the word: {word.split("").map((_, i) => guessed[i] ?? "_").join(" ")}</p>
        <div className="chips" style={{ justifyContent: "center" }}>
          {letters.map((letter) => (
            <button key={letter} className="btn" onClick={() => tap(letter)}>
              {letter}
            </button>
          ))}
        </div>
        <p>{message}</p>
        <button className="btn secondary" onClick={speak}>
          Replay word
        </button>
      </div>
    </div>
  );
}
