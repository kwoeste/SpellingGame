"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import type { SpellingList } from "@/lib/spelling/catalog";
import {
  answerForFormat,
  assignTestFormats,
  blankIndexes,
  formatUsesLadder,
  lockedBlankLetters,
  scrambleLetters,
  spellingChoices,
  type TestFormat,
} from "@/lib/spelling/formats";
import { normalizeSpelling, spellingHelp, type SpellingHelp, type SpellingMode } from "@/lib/spelling/engine";
import {
  COOLDOWN_MS,
  REQUEUE_GAP,
  blankWord,
  isFirstTry,
  ladderNext,
  lockPrefix,
  markLetters,
  missMessage,
  praiseFor,
  type LadderPhase,
} from "@/lib/spelling/feedback";
import { SPELLING_GOT_IT, SPELLING_HELP, SPELLING_LINES, revealClip, wordClip, type SpellingWord } from "@/lib/spelling/list-d2";
import { splitReadableWords } from "@/lib/ui/careful-read";

type RoundResult = { mode: SpellingMode; right: number; total: number; missed: string[] };
type Question = { word: string; format: TestFormat };
type Attempt = {
  key: string;
  typed: string;
  misses: number;
  phase: LadderPhase;
  prefix: string;
  shownLetters: number;
  help: SpellingHelp;
  feedback: string | null;
  lastTry: string | null;
  right: boolean;
  tilesUsed: number[];
  copyTries: number;
  sentenceReady: boolean;
  cooldownUntil: number;
};

const big: CSSProperties = { minHeight: 56, fontSize: "1.15rem", touchAction: "manipulation" };
const SLOW_RATE = 0.7;

const FORMAT_TITLE: Record<TestFormat, string> = {
  listen: "Listen and spell",
  blanks: "Fill in the letters",
  choice: "Pick the right spelling",
  sentence: "Finish the sentence",
  scramble: "Unscramble the letters",
};

function freshAttempt(key: string): Attempt {
  return {
    key,
    typed: "",
    misses: 0,
    phase: "try",
    prefix: "",
    shownLetters: 0,
    help: { level: "none" },
    feedback: null,
    lastTry: null,
    right: false,
    tilesUsed: [],
    copyTries: 0,
    sentenceReady: false,
    cooldownUntil: 0,
  };
}

async function postCheck(listId: string, body: Record<string, unknown>): Promise<{ correct: boolean; help: SpellingHelp } | null> {
  try {
    const res = await fetch("/api/engine/spelling", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ check: { ...body, list: listId } }),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { result: { correct: boolean; help: SpellingHelp } }).result;
  } catch {
    return null;
  }
}

function postFinished(listId: string, score: number, total: number, missed: string[]) {
  void fetch("/api/engine/spelling", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ finished: { mode: "mock", score, total, missed, list: listId } }),
  }).catch(() => undefined);
}

function Highlight({ word }: { word: SpellingWord }) {
  return (
    <span style={{ letterSpacing: "0.04em" }}>
      {word.word.slice(0, word.at)}
      <mark style={{ background: "#ffe08a", borderRadius: 4, padding: "0 1px" }}>{word.word.slice(word.at, word.at + word.len)}</mark>
      {word.word.slice(word.at + word.len)}
    </span>
  );
}

function Burst({ n = 18 }: { n?: number }) {
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2;
    const radius = 90 + (i % 5) * 16;
    return { ch: i % 3 === 0 ? "🎉" : "⭐", dx: `${Math.round(Math.cos(angle) * radius)}px`, dy: `${Math.round(Math.sin(angle) * radius)}px` };
  }), [n]);
  return (
    <div className="sp-burst" aria-hidden>
      {bits.map((bit, i) => <span key={i} style={{ ["--dx" as string]: bit.dx, ["--dy" as string]: bit.dy } as CSSProperties}>{bit.ch}</span>)}
    </div>
  );
}

function Progress({ at, total, stars }: { at: number; total: number; stars: number }) {
  const shown = Math.min(at, total);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.15rem", fontWeight: 700 }}>
        <span>{at > total ? "One more time" : `Word ${shown} of ${total}`}</span>
        <span>⭐ {stars}</span>
      </div>
      <div className="sp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, shown - 1)}>
        <span style={{ width: `${Math.round((Math.max(0, shown - 1) / Math.max(1, total)) * 100)}%` }} />
      </div>
    </div>
  );
}

function SentenceRead({ sentence, word, onReady }: { sentence: string; word: string; onReady: (ready: boolean) => void }) {
  const words = useMemo(() => splitReadableWords(blankWord(sentence, word), 0), [sentence, word]);
  const [mode, setMode] = useState<"tap" | "reveal">("tap");
  const [tapped, setTapped] = useState<Set<number>>(() => new Set());
  const [revealed, setRevealed] = useState(0);
  const ready = mode === "tap" ? tapped.size >= words.length && words.length > 0 : revealed >= words.length;

  useEffect(() => {
    onReady(ready);
  }, [onReady, ready]);

  useEffect(() => {
    if (mode !== "reveal" || revealed >= words.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(words.length);
      return;
    }
    const timer = window.setTimeout(() => setRevealed((n) => n + 1), 280);
    return () => window.clearTimeout(timer);
  }, [mode, revealed, words.length]);

  return (
    <div>
      <div className="chips" style={{ marginBottom: 10 }}>
        <button type="button" className="btn secondary" style={big} aria-pressed={mode === "tap"} onClick={() => setMode("tap")}>Tap each word</button>
        <button type="button" className="btn secondary" style={big} aria-pressed={mode === "reveal"} onClick={() => { setMode("reveal"); setRevealed(0); }}>Reveal slowly</button>
      </div>
      <p className="sp-sentence careful-read">
        {words.map((item, index) => {
          const classes = ["word-btn", "word"];
          if (item.text.includes("_")) classes.push("blank-slot");
          if (mode === "reveal" && index >= revealed) classes.push("hidden-word");
          if (tapped.has(index)) classes.push("tapped");
          return (
            <button
              key={`${item.start}-${item.text}`}
              type="button"
              className={classes.join(" ")}
              onClick={() => setTapped((prev) => new Set(prev).add(index))}
            >
              {item.text}
            </button>
          );
        })}
      </p>
      <p style={{ color: "var(--muted)", fontWeight: 800 }}>{ready ? "Now type the missing word." : "Tap every word as you read — no skipping."}</p>
    </div>
  );
}

export function SpellingPracticeTest({
  list,
  words,
  onRetry,
  onDone,
  title = "Mock test 📝",
}: {
  list: SpellingList;
  words: string[];
  onRetry: (missed: string[]) => void;
  onDone: (result?: RoundResult) => void;
  title?: string;
}) {
  const prefs = useKidPrefs();
  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [attempt, setAttempt] = useState<Attempt>(() => freshAttempt(""));
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [burst, setBurst] = useState(0);
  const [score, setScore] = useState({ firstTry: 0, streak: 0, best: 0, missed: new Set<string>() });
  const requeued = useRef(new Set<string>());
  const reported = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onDoneRef = useRef(onDone);
  const scoreRef = useRef(score);
  onDoneRef.current = onDone;
  scoreRef.current = score;

  const item = queue[idx] ?? null;
  const questionKey = started && item ? `${idx}:${item.word}:${item.format}` : started ? "done" : "";
  if (attempt.key !== questionKey) setAttempt(freshAttempt(questionKey));

  const spelling = item ? list.words.find((entry) => entry.word === item.word) ?? null : null;
  const format = item?.format ?? null;
  const puzzle = useMemo(() => {
    if (!spelling || !format) return null;
    return {
      blanks: blankIndexes(spelling.word, spelling.at, spelling.len),
      choices: spellingChoices(spelling.word, spelling.oops),
      tiles: scrambleLetters(spelling.word),
    };
  }, [spelling, format, idx]);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!questionKey || !spelling || !format) return;
    if (format !== "sentence") prefs.speak(wordClip(spelling));
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [questionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!started || item || reported.current) return;
    reported.current = true;
    const missed = [...scoreRef.current.missed];
    const right = scoreRef.current.firstTry;
    prefs.speak(SPELLING_LINES.mockDone);
    postFinished(list.id, right, words.length, missed);
    onDoneRef.current({ mode: "mock", right, total: words.length, missed });
  }, [started, item, list.id, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const letterTarget = attempt.phase === "copy" ? (spelling?.word.length ?? 0) : attempt.prefix.length;
  useEffect(() => {
    if (attempt.shownLetters >= letterTarget) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAttempt((current) => ({ ...current, shownLetters: letterTarget }));
      return;
    }
    const timer = window.setTimeout(() => setAttempt((current) => ({ ...current, shownLetters: Math.min(letterTarget, current.shownLetters + 1) })), 450);
    return () => window.clearTimeout(timer);
  }, [attempt.shownLetters, letterTarget]);

  const coolingDown = now < attempt.cooldownUntil;
  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [coolingDown]);

  if (attempt.key !== questionKey) return null;

  function begin() {
    const formats = assignTestFormats(words.length);
    setQueue(words.map((word, index) => ({ word, format: formats[index] ?? "listen" })));
    setIdx(0);
    setStarted(true);
    window.scrollTo?.({ top: 0 });
  }

  if (!started) {
    return (
      <section className="card" style={{ textAlign: "center", padding: 24 }}>
        <h2>{title}</h2>
        <p style={{ fontSize: "1.15rem" }}>
          {words.length} words, each one a different kind of question: hear it, fill in letters, pick the spelling, finish a sentence, or unscramble.
        </p>
        <p style={{ fontSize: "1.05rem" }}>Read every word. If a typing question is tricky, you get a hint and the word comes back.</p>
        <button type="button" className="btn" data-testid="mock-start" style={{ ...big, minWidth: 220 }} disabled={!hydrated} onClick={begin}>
          {hydrated ? "Start the test" : "Getting ready…"}
        </button>
      </section>
    );
  }

  if (!item) {
    const missed = [...score.missed];
    const right = score.firstTry;
    return (
      <section className="card" style={{ textAlign: "center", padding: 24, position: "relative" }}>
        <Burst n={24} />
        <h2>You scored {right} out of {words.length}! {right === words.length ? "🏆" : "🎉"}</h2>
        <p>That score is how many you spelled right on the first try.</p>
        {missed.length ? (
          <>
            <p>Words to practice:</p>
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.4rem" }}>
              {missed.map((name) => {
                const entry = list.words.find((candidate) => candidate.word === name);
                return entry ? <li key={name}><Highlight word={entry} /></li> : null;
              })}
            </ul>
            <button type="button" className="btn" style={big} onClick={() => onRetry(missed)}>Practice the missed words</button>
          </>
        ) : <p>A perfect test. Wow!</p>}
      </section>
    );
  }

  if (!spelling || !format || !puzzle) {
    return (
      <section className="card" style={{ textAlign: "center", padding: 24 }}>
        <p>That word is missing from this list.</p>
        <button type="button" className="btn" style={big} onClick={() => setIdx((current) => current + 1)}>Next word →</button>
      </section>
    );
  }

  const word = spelling;
  const board = puzzle;
  const kind = format;
  const currentQuestion = item;
  const repeat = queue.slice(0, idx).some((question) => question.word === word.word);
  const ladder = formatUsesLadder(kind);
  const lockedBlanks = lockedBlankLetters(word.word, board.blanks, attempt.prefix.length);
  const sentenceOpen = kind !== "sentence" || attempt.sentenceReady || attempt.phase !== "try";
  const answerReady = kind === "scramble"
    ? attempt.typed.length === word.word.length
    : kind === "blanks" && attempt.phase === "try"
      ? normalizeSpelling(attempt.typed).length >= board.blanks.length
      : attempt.typed.trim().length > 0;

  function gradeLocally(full: string): { correct: boolean; help: SpellingHelp } {
    const correct = normalizeSpelling(full) === word.word;
    return { correct, help: correct ? { level: "none" } : spellingHelp(word, attempt.misses + 1) };
  }

  function markCorrect(first: boolean, line: string) {
    setAttempt((current) => ({ ...current, right: true, lastTry: null, feedback: first ? `${line} ⭐` : line, typed: "" }));
    prefs.speak(line);
    if (first) {
      setBurst((n) => n + 1);
      setScore((current) => ({ ...current, firstTry: current.firstTry + 1, streak: current.streak + 1, best: Math.max(current.best, current.streak + 1) }));
    } else {
      setScore((current) => ({ ...current, streak: 0 }));
    }
  }

  function goNext() {
    if (ladder && attempt.misses > 0 && !requeued.current.has(word.word)) {
      requeued.current.add(word.word);
      setQueue((current) => {
        const at = Math.min(idx + REQUEUE_GAP, current.length);
        return [...current.slice(0, at), currentQuestion, ...current.slice(at)];
      });
    }
    setIdx((current) => current + 1);
    window.scrollTo?.({ top: 0 });
  }

  async function submitCopy(text: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    const result = await postCheck(list.id, { word: word.word, mode: kind, misses: attempt.misses, typed: text, phase: attempt.phase });
    setBusy(false);
    const correct = result ? result.correct : normalizeSpelling(text) === word.word;
    const tries = attempt.phase === "copy" ? attempt.copyTries + 1 : attempt.copyTries;
    const nextPhase = ladderNext(attempt.phase, correct, tries);
    if (nextPhase === "memory") {
      setAttempt((current) => ({ ...current, copyTries: tries, phase: nextPhase, typed: "", lastTry: null, feedback: `✅ ${SPELLING_HELP.memory}`, shownLetters: 0 }));
      prefs.speak(SPELLING_HELP.memory);
      return;
    }
    if (nextPhase === "copy") {
      setAttempt((current) => ({ ...current, copyTries: tries, phase: nextPhase, lastTry: text, feedback: "Look at each letter and copy it.", typed: "" }));
      return;
    }
    const remembered = attempt.phase === "memory" && correct;
    setAttempt((current) => ({
      ...current,
      copyTries: tries,
      phase: "done",
      typed: "",
      lastTry: null,
      feedback: remembered ? `${SPELLING_GOT_IT} 🎉` : SPELLING_HELP.later,
    }));
    prefs.speak(remembered ? SPELLING_GOT_IT : SPELLING_HELP.later);
  }

  async function submitTyped(raw: string) {
    if (busy || attempt.right || attempt.phase === "done" || coolingDown) return;
    if (attempt.phase === "copy" || attempt.phase === "memory") {
      await submitCopy(raw);
      return;
    }
    if (!sentenceOpen) return;
    const full = answerForFormat(kind, word.word, board.blanks, raw);
    if (!normalizeSpelling(full)) return;
    setBusy(true);
    const first = isFirstTry(word.word, attempt.misses, score.missed);
    const sent = await postCheck(list.id, {
      word: word.word,
      mode: kind,
      misses: attempt.misses,
      typed: full,
      retry: !first && attempt.misses === 0,
    });
    setBusy(false);
    const result = sent ?? gradeLocally(full);
    if (result.correct) {
      markCorrect(first, praiseFor(kind, first, score.firstTry + score.streak + idx));
      return;
    }
    const misses = attempt.misses + 1;
    const at = Date.now();
    setScore((current) => ({ ...current, streak: 0, missed: new Set(current.missed).add(word.word) }));
    setNow(at);
    if (!ladder) {
      setAttempt((current) => ({
        ...current,
        misses,
        right: true,
        lastTry: full,
        help: { level: "none" },
        feedback: "Here's the right spelling. Look at every letter.",
      }));
      prefs.speak(wordClip(word));
      return;
    }
    if (result.help.level === "reveal") {
      setAttempt((current) => ({
        ...current,
        misses,
        phase: "copy",
        prefix: "",
        shownLetters: 0,
        typed: "",
        tilesUsed: [],
        lastTry: null,
        help: result.help,
        feedback: SPELLING_HELP.copy,
        cooldownUntil: at + COOLDOWN_MS,
      }));
      prefs.speak(SPELLING_HELP.copy, { onend: () => prefs.speak(revealClip(word), { rate: SLOW_RATE }) });
      return;
    }
    const revealed = result.help.level === "letters" ? result.help.letters ?? 0 : 0;
    const nextPrefix = word.word.slice(0, revealed);
    const nextTyped = kind === "blanks" ? lockedBlankLetters(word.word, board.blanks, revealed) : nextPrefix;
    const message = `${missMessage(word.word, full, misses)} ${result.help.level === "letters" ? SPELLING_HELP.letter : "Let's listen slowly. 🐢"}`;
    setAttempt((current) => ({
      ...current,
      misses,
      prefix: nextPrefix,
      typed: nextTyped,
      lastTry: full,
      help: result.help,
      feedback: message,
      cooldownUntil: at + COOLDOWN_MS,
    }));
    const line = result.help.level === "letters" ? SPELLING_HELP.letter : SPELLING_HELP.slow;
    prefs.speak(line, { onend: () => prefs.speak(wordClip(word), { rate: SLOW_RATE }) });
  }

  async function pickChoice(picked: string) {
    if (busy || attempt.right) return;
    setBusy(true);
    const first = isFirstTry(word.word, 0, score.missed);
    const sent = await postCheck(list.id, { word: word.word, mode: "choice", misses: 0, typed: picked, retry: !first });
    setBusy(false);
    const correct = sent ? sent.correct : normalizeSpelling(picked) === word.word;
    if (correct) {
      markCorrect(first, praiseFor("choice", first, score.firstTry + score.streak + idx));
      return;
    }
    setScore((current) => ({ ...current, streak: 0, missed: new Set(current.missed).add(word.word) }));
    setAttempt((current) => ({
      ...current,
      misses: 1,
      right: true,
      lastTry: picked,
      feedback: "Here's the right spelling. Look at every letter.",
    }));
    prefs.speak(wordClip(word));
  }

  function onType(value: string) {
    if (attempt.phase !== "try") {
      setAttempt((current) => ({ ...current, typed: value }));
      return;
    }
    const locked = kind === "blanks" ? lockedBlanks : attempt.prefix;
    setAttempt((current) => ({ ...current, typed: lockPrefix(locked, value) }));
  }

  const showHear = kind !== "sentence" || attempt.misses > 0 || attempt.right || attempt.phase !== "try";
  const copying = attempt.phase === "copy";

  return (
    <section className="card" data-format={format} data-testid="practice-question" style={{ padding: "24px 24px 36px", position: "relative" }}>
      {burst ? <Burst key={burst} /> : null}
      <Progress at={idx + 1} total={words.length} stars={score.firstTry} />
      {repeat ? <p style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 8px" }}>🔁 One more time with this word!</p> : null}
      <h2 style={{ margin: "4px 0" }}>{FORMAT_TITLE[format]}</h2>

      {copying ? (
        <div className="story-hook">
          <p style={{ margin: 0 }}>Here&apos;s the word. Copy it:</p>
          <p aria-label={`The word is ${spelling.word}`} style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "0.14em", margin: "8px 0" }}>
            {spelling.word.split("").map((ch, index) => <span key={index} style={{ opacity: index < attempt.shownLetters ? 1 : 0 }}>{ch}</span>)}
          </p>
        </div>
      ) : null}
      {attempt.phase === "memory" ? <p style={{ fontSize: "1.3rem", fontWeight: 800 }}>🙈 Now spell it without looking!</p> : null}

      {showHear && format !== "sentence" && attempt.phase === "try" && !attempt.right ? (
        <div className="sp-row">
          <button type="button" className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(spelling))}>🔊 Hear it again</button>
        </div>
      ) : null}

      {attempt.phase === "try" && !attempt.right ? (
        <FormatPrompt
          format={format}
          spelling={spelling}
          blanks={puzzle.blanks}
          choices={puzzle.choices}
          tiles={puzzle.tiles}
          prefix={attempt.prefix}
          shownLetters={attempt.shownLetters}
          typed={attempt.typed}
          tilesUsed={attempt.tilesUsed}
          busy={busy}
          onPick={(picked) => void pickChoice(picked)}
          onTile={(index, ch) => setAttempt((current) => ({ ...current, tilesUsed: [...current.tilesUsed, index], typed: current.typed + ch }))}
          onUndo={() => setAttempt((current) => ({ ...current, tilesUsed: current.tilesUsed.slice(0, -1), typed: current.typed.slice(0, -1) }))}
          onClear={() => setAttempt((current) => ({ ...current, tilesUsed: [], typed: "" }))}
          onSentenceReady={(ready) => setAttempt((current) => (current.sentenceReady === ready ? current : { ...current, sentenceReady: ready }))}
        />
      ) : null}

      {showHear && format === "sentence" && !attempt.right ? (
        <div className="sp-row">
          <button type="button" className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(spelling))}>🔊 Hear the sentence</button>
        </div>
      ) : null}

      {format !== "choice" && !attempt.right && attempt.phase !== "done" ? (
        <form onSubmit={(event) => { event.preventDefault(); void submitTyped(attempt.typed); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8 }}>
          {format === "scramble" && attempt.phase === "try" ? (
            <div className="sp-input" role="status" aria-label={`Your word so far: ${attempt.typed || "empty"}`} style={{ minHeight: 64, letterSpacing: "0.12em", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {attempt.typed || <span style={{ opacity: 0.35 }}>tap the letters</span>}
            </div>
          ) : (
            <input
              ref={inputRef}
              className="sp-input"
              value={attempt.typed}
              onChange={(event) => onType(event.target.value)}
              disabled={!sentenceOpen || (copying && attempt.shownLetters < spelling.word.length)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label={format === "blanks" && attempt.phase === "try" ? "Type the missing letters" : "Type the word"}
              placeholder={format === "blanks" && attempt.phase === "try" ? "missing letters" : "type it here"}
            />
          )}
          <button type="submit" className="btn" style={{ ...big, minWidth: 200 }} disabled={busy || coolingDown || !sentenceOpen || !answerReady}>
            {coolingDown ? "Listen first… 👂" : copying ? "Copy it ✓" : "Check ✓"}
          </button>
        </form>
      ) : null}

      {attempt.lastTry && !attempt.right && attempt.phase === "try" ? <LetterMarks target={spelling.word} typed={attempt.lastTry} /> : null}
      {attempt.feedback ? <p aria-live="polite" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{attempt.feedback}</p> : null}
      {(attempt.help.level === "hint" || attempt.help.level === "letters") && attempt.help.hint && attempt.phase === "try" && !attempt.right ? (
        <p className="story-hook">💡 {attempt.help.hint}</p>
      ) : null}
      {attempt.right || attempt.phase === "done" ? (
        <p style={{ fontSize: "2rem", fontWeight: 800, margin: "8px 0" }}><Highlight word={spelling} /></p>
      ) : null}
      {attempt.right || attempt.phase === "done" ? (
        <button type="button" className="btn" style={{ ...big, minWidth: 200 }} onClick={goNext} autoFocus>Next word →</button>
      ) : null}
    </section>
  );
}

function FormatPrompt({
  format,
  spelling,
  blanks,
  choices,
  tiles,
  prefix,
  shownLetters,
  typed,
  tilesUsed,
  busy,
  onPick,
  onTile,
  onUndo,
  onClear,
  onSentenceReady,
}: {
  format: TestFormat;
  spelling: SpellingWord;
  blanks: number[];
  choices: string[];
  tiles: string[];
  prefix: string;
  shownLetters: number;
  typed: string;
  tilesUsed: number[];
  busy: boolean;
  onPick: (picked: string) => void;
  onTile: (index: number, letter: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onSentenceReady: (ready: boolean) => void;
}) {
  switch (format) {
    case "listen":
      return <p style={{ fontSize: "1.2rem", fontWeight: 700 }}>Listen, then type the whole word.</p>;
    case "blanks":
      return (
        <div>
          <p style={{ fontSize: "1.15rem", fontWeight: 700 }}>Type the missing letters, in order.</p>
          <p className="sp-blanks" aria-label={`The word with ${blanks.length} letters missing`}>
            {spelling.word.split("").map((ch, index) => {
              const given = index < prefix.length && index < shownLetters;
              const hidden = blanks.includes(index) && !given;
              return <span key={index} className={given ? "sp-letter ok" : undefined}>{hidden ? "_" : ch} </span>;
            })}
          </p>
        </div>
      );
    case "choice":
      return (
        <div>
          <p style={{ fontSize: "1.15rem", fontWeight: 700 }}>Listen, then tap the right spelling.</p>
          <div className="sp-choices">
            {choices.map((choice) => (
              <button key={choice} type="button" className="btn sp-choice" disabled={busy} onClick={() => onPick(choice)}>{choice}</button>
            ))}
          </div>
        </div>
      );
    case "sentence":
      return <SentenceRead key={spelling.word} sentence={spelling.sentence} word={spelling.word} onReady={onSentenceReady} />;
    case "scramble":
      return (
        <div>
          <p style={{ fontSize: "1.15rem", fontWeight: 700 }}>Tap the letters in order. Hear the word if you want.</p>
          <div className="sp-row" style={{ marginTop: 8 }}>
            {tiles.map((ch, index) => (
              <button key={index} type="button" className="btn sp-tile" disabled={tilesUsed.includes(index)} aria-label={`Letter ${ch}`} onClick={() => onTile(index, ch)}>{ch}</button>
            ))}
          </div>
          <div className="sp-row">
            <button type="button" className="btn secondary" style={big} disabled={!typed} onClick={onUndo}>⌫ Undo</button>
            <button type="button" className="btn secondary" style={big} disabled={!typed} onClick={onClear}>Clear</button>
          </div>
        </div>
      );
    default: {
      const unexpected: never = format;
      throw new Error(`Unknown practice format ${String(unexpected)}`);
    }
  }
}

function LetterMarks({ target, typed }: { target: string; typed: string }) {
  const { marks } = markLetters(target, typed);
  if (!marks.length) return null;
  return (
    <p aria-label={`Your try: ${typed}`} style={{ margin: "8px 0" }}>
      {marks.map((mark, index) => <span key={index} className={`sp-letter ${mark.ok ? "ok" : "bad"}`}>{mark.ch}</span>)}
    </p>
  );
}
