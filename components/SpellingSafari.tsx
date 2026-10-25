"use client";

import { useEffect, useRef, useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { Mascot } from "@/components/ui/Mascot";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { playSound } from "@/lib/ui/sounds";
import { spellingAudioFile, type SpellingList } from "@/lib/games/spelling-lists";
import { loadProgress, saveProgress, clearProgress } from "@/lib/games/spelling-progress";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import { spellingHelp } from "@/lib/help/games";
import { letterHint } from "@/lib/help/ladder";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** The hint shows the first half of the word (or what she has already spelled, if that is more). */
function letterHintFor(word: string, spelled: number): string {
  return letterHint(word, Math.max(Math.ceil(word.length / 2), spelled));
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
  // This round's words; a skipped word is added to the end so it comes back later.
  const queue = useRef<string[]>(list.words);
  // Stuck-help ladder for the current word.
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<ReturnType<typeof spellingHelp>>(null);
  const [revealed, setRevealed] = useState(false);

  const word = queue.current[index] ?? "";
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
    const current = queue.current[nextIndex];
    setMisses(0);
    setHelp(null);
    setRevealed(false);
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
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      const nextHelp = spellingHelp(word, nextMisses);
      if (nextHelp && nextHelp.stage !== help?.stage) {
        setHelp(nextHelp);
        prefs.speak(nextHelp.speak);
        logGame(nextHelp.stage === "hint" ? "stuck" : "show_me_offered", nextMisses);
      }
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
      if (misses) logGame(revealed ? "revealed_then_spelled" : "spelled_after_help", misses);
      window.setTimeout(advance, 900);
    }
  }

  function advance() {
    let nextIndex = index;
    let nextRound = round;
    if (index + 1 >= queue.current.length && round < totalRounds) {
      nextRound = round + 1;
      nextIndex = 0;
      queue.current = list.words;
      setRound(nextRound);
      setIndex(nextIndex);
    } else {
      nextIndex = index + 1;
      setIndex(nextIndex);
    }
    saveProgress(list.id, nextIndex, nextRound);
    show(nextIndex, nextRound);
  }

  function logGame(detail: string, missCount: number) {
    void fetch("/api/engine/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: "games",
        events: [{ id: crypto.randomUUID(), type: "game_event", payload: { game_id: "spelling", list_id: list.id, item: word, detail, misses: missCount } }],
      }),
    }).catch(() => undefined);
  }

  function showMe() {
    if (!help?.reveal) return;
    setRevealed(true);
    prefs.speak(help.speak);
    logGame("revealed", misses);
  }

  function skipWord() {
    logGame("skipped", misses);
    if (queue.current.filter((w) => w === word).length < 2) queue.current = [...queue.current, word];
    advance();
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
        Round {round} of {totalRounds}, Word {index + 1} of {queue.current.length}
      </p>
      <p aria-live="polite" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
        Spell the word: {guessed.split("").join(" ")}
      </p>
      {help && !revealed ? (
        <p className="spell-hint" aria-label="Letter clue">
          {letterHintFor(word, letterIndex)}
        </p>
      ) : null}
      <div className="letter-pad" role="group" aria-label="Letter choices">
        {letters.map((letter, idx) => (
          <button
            key={`${letter}-${idx}`}
            type="button"
            className={`${flash[idx] ?? ""}${revealed && letter === word[letterIndex] && flash[idx] !== "correct" ? " tile next-letter" : ""}`}
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
      <StuckHelpPanel help={help} revealed={revealed} onShowMe={showMe} onSkip={skipWord} />
      <button className="btn secondary" onClick={() => speakWord(word)} style={{ marginTop: 12 }}>
        Replay word
      </button>
      <div style={{ marginTop: 16 }}>
        <VoicePicker />
      </div>
    </div>
  );
}
