"use client";

import { useEffect, useRef, useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { Mascot } from "@/components/ui/Mascot";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { playSound } from "@/lib/ui/sounds";
import { spellingAudioFile, type SpellingList } from "@/lib/games/spelling-lists";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function storageKey(listId: string): string {
  return `spelling-safari:${listId}`;
}

function loadProgress(listId: string): { index: number; round: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(storageKey(listId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { index: number; round: number };
    if (typeof parsed.index === "number" && typeof parsed.round === "number") {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveProgress(listId: string, index: number, round: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(listId), JSON.stringify({ index, round }));
  } catch {
    // Ignore storage errors
  }
}

function clearProgress(listId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(listId));
  } catch {
    // Ignore storage errors
  }
}

export function SpellingSafari({ list }: { list: SpellingList }) {
  const prefs = useKidPrefs();
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [guessed, setGuessed] = useState("");
  const [letterIndex, setLetterIndex] = useState(0);
  const [letters, setLetters] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState<Record<number, "correct" | "incorrect">>({});
  const [done, setDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [restored, setRestored] = useState(false);
  const token = useRef(0);
  const clip = useRef<HTMLAudioElement | null>(null);

  const word = list.words[index] ?? "";
  const totalRounds = 2;

  function buildLetters(current: string, currentRound: number) {
    if (currentRound >= 2) return shuffle("abcdefghijklmnopqrstuvwxyz".split(""));
    const extras = shuffle("abcdefghijklmnopqrstuvwxyz".split("")).slice(0, 3);
    return shuffle(current.split("").concat(extras));
  }

  function speakWord(current: string) {
    const my = ++token.current;
    if (clip.current) clip.current.pause();
    prefs.stopSpeak();
    const sentence = list.sentences[current] ?? "";
    const playPart = (text: string, file: string, then?: () => void) => {
      if (!list.hasClips) {
        prefs.speak(text, { onend: then });
        return;
      }
      const audio = new Audio(file);
      clip.current = audio;
      let usedFallback = false;
      const fallback = () => {
        if (usedFallback || token.current !== my) return;
        usedFallback = true;
        prefs.speak(text, { onend: then });
      };
      audio.onended = () => {
        if (token.current === my) then?.();
      };
      audio.onerror = fallback;
      audio.play().catch(fallback);
    };
    playPart(current, spellingAudioFile(current, ""), () => {
      window.setTimeout(() => {
        if (token.current === my && sentence) playPart(sentence, spellingAudioFile(current, "-sentence"));
      }, 600);
    });
  }

  function show(nextIndex = index, nextRound = round) {
    const current = list.words[nextIndex];
    if (!current) {
      setDone(true);
      setCelebrate(true);
      clearProgress(list.id);
      playSound("fanfare", prefs.soundOn);
      return;
    }
    setGuessed("_".repeat(current.length));
    setLetterIndex(0);
    setLetters(buildLetters(current, nextRound));
    setMessage("");
    setFlash({});
    speakWord(current);
  }

  useEffect(() => {
    const saved = loadProgress(list.id);
    if (saved && saved.index < list.words.length) {
      setIndex(saved.index);
      setRound(saved.round);
      setRestored(true);
      show(saved.index, saved.round);
    } else {
      show(0, 1);
    }
    return () => {
      token.current += 1;
      if (clip.current) clip.current.pause();
      prefs.stopSpeak();
    };
    // first mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id]);

  function guess(letter: string, buttonIndex: number) {
    if (!word || letter !== word[letterIndex]) {
      setMessage("Try again! That is not the next letter.");
      setFlash((prev) => ({ ...prev, [buttonIndex]: "incorrect" }));
      playSound("wrong", prefs.soundOn);
      window.setTimeout(() => setFlash((prev) => ({ ...prev, [buttonIndex]: undefined as unknown as "incorrect" })), 700);
      return;
    }
    const nextGuess = guessed.split("");
    nextGuess[letterIndex] = letter;
    const joined = nextGuess.join("");
    setGuessed(joined);
    setLetterIndex((n) => n + 1);
    setFlash((prev) => ({ ...prev, [buttonIndex]: "correct" }));
    setMessage("Nice!");
    playSound("tap", prefs.soundOn);
    if (joined === word) {
      setMessage("Yes!");
      playSound("correct", prefs.soundOn);
      window.setTimeout(() => {
        let nextIndex = index;
        let nextRound = round;
        if (index + 1 >= list.words.length && round < totalRounds) {
          nextRound = round + 1;
          nextIndex = 0;
          setRound(nextRound);
          setIndex(nextIndex);
        } else {
          nextIndex = index + 1;
          setIndex(nextIndex);
        }
        saveProgress(list.id, nextIndex, nextRound);
        show(nextIndex, nextRound);
      }, 900);
    }
  }

  if (done) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <ConfettiLayer fire={celebrate} />
        <Mascot mood="cheer" size={120} />
        <h1>You finished Spelling Safari · {list.shortTitle}!</h1>
        <p>Great place to stop, or play another list.</p>
      </div>
    );
  }

  const displayTitle = `Spelling Safari · ${list.shortTitle}`;

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="kid-kicker">Spelling Safari</p>
      <h1>{displayTitle}</h1>
      {restored && index > 0 ? <p className="notice">Welcome back! Picking up where you left off.</p> : null}
      <p>{list.tagline}</p>
      <p id="word-counter">
        Round {round} of {totalRounds}, Word {index + 1} of {list.words.length}
      </p>
      <p aria-live="polite" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
        Spell the word: {guessed.split("").join(" ")}
      </p>
      <div className="letter-pad" role="group" aria-label="Letter choices">
        {letters.map((letter, idx) => (
          <button
            key={`${letter}-${idx}`}
            type="button"
            className={flash[idx] ?? ""}
            disabled={round < 2 && flash[idx] === "correct"}
            onClick={() => guess(letter, idx)}
          >
            {letter}
          </button>
        ))}
      </div>
      <p role="status" aria-live="assertive">
        {message}
      </p>
      <button className="btn secondary" onClick={() => speakWord(word)} style={{ marginTop: 12 }}>
        Replay word
      </button>
      <div style={{ marginTop: 16 }}>
        <VoicePicker />
      </div>
    </div>
  );
}
