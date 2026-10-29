"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { D2_WORDS, LIST_TITLE, SPELLING_BREATHE, SPELLING_LINES, SPELLING_SO_CLOSE, VOWEL_KEY, findWord, revealClip, trickClip, wordClip, type SpellingWord, type Vowel } from "@/lib/spelling/list-d2";
import type { SpellingMode, WordStat } from "@/lib/spelling/engine";
import { COOLDOWN_MS, FLASH_STUDY_MS, canCover, markLetters, missMessage, mockStep, rightMessage, tooQuick, type MockState } from "@/lib/spelling/feedback";

type Summary = { stats: WordStat[]; mastered: number; total: number; queue: string[] };
type Help = { level: "none" | "hint" | "reveal"; hint?: string; answer?: string };
type CheckResult = { correct: boolean; help: Help; stat: WordStat | null; vowel?: { answer: Vowel; label: string } | null };

const MODES: { id: SpellingMode; icon: string; title: string; blurb: string }[] = [
  { id: "listen", icon: "🎧", title: "Listen & spell", blurb: "Hear it, then type it." },
  { id: "flash", icon: "🃏", title: "Flashcards", blurb: "Look, cover, spell." },
  { id: "tiles", icon: "🔤", title: "Letter tiles", blurb: "Unscramble the letters." },
  { id: "fix", icon: "🛠️", title: "Fix the misspelling", blurb: "Find the oops and fix it." },
  { id: "sort", icon: "🗂️", title: "Sort by sound", blurb: "Hear it. Short i, o, or u?" },
  { id: "mock", icon: "📝", title: "Mock test", blurb: "All 25 words, like the real test." },
];

const big: React.CSSProperties = { minHeight: 56, fontSize: "1.15rem", touchAction: "manipulation" };

function Highlight({ w }: { w: SpellingWord }) {
  return (
    <span style={{ letterSpacing: "0.04em" }}>
      {w.word.slice(0, w.at)}
      <mark style={{ background: "#ffe08a", borderRadius: 4, padding: "0 1px" }}>{w.word.slice(w.at, w.at + w.len)}</mark>
      {w.word.slice(w.at + w.len)}
    </span>
  );
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function postCheck(body: Record<string, unknown>): Promise<CheckResult | null> {
  try {
    const res = await fetch("/api/engine/spelling", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ check: body }) });
    if (!res.ok) return null;
    return ((await res.json()) as { result: CheckResult }).result;
  } catch {
    return null;
  }
}

function postFinished(mode: SpellingMode, score: number, total: number, missed: string[]) {
  void fetch("/api/engine/spelling", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ finished: { mode, score, total, missed } }) }).catch(() => undefined);
}

export function SpellingD2({ testDate, daysLeft, preview = false }: { testDate: string; daysLeft: number; preview?: boolean }) {
  const prefs = useKidPrefs();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mode, setMode] = useState<SpellingMode | null>(null);
  const [roundWords, setRoundWords] = useState<string[]>([]);
  const [openTrick, setOpenTrick] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/spelling", { cache: "no-store" });
      if (res.ok) setSummary(((await res.json()) as { summary: Summary | null }).summary);
    } catch {
      /* offline: keep the last numbers */
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statOf = (word: string) => summary?.stats.find((s) => s.word === word);
  const when = new Date(`${testDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  function start(m: SpellingMode, words?: string[]) {
    const queue = summary?.queue?.length ? summary.queue : shuffle(D2_WORDS.map((w) => w.word)).slice(0, 10);
    setRoundWords(words ?? (m === "mock" ? shuffle(D2_WORDS.map((w) => w.word)) : m === "sort" ? shuffle(D2_WORDS.map((w) => w.word)).slice(0, 12) : queue));
    setMode(m);
    window.scrollTo?.({ top: 0 });
  }

  if (mode) {
    return (
      <div className="kid-shell">
        <p className="kid-kicker">{LIST_TITLE}</p>
        <button className="btn secondary" style={big} onClick={() => { setMode(null); void refresh(); }}>← Back to the word list</button>
        <div className="sp-stage">
        {mode === "mock" ? (
          <MockTest words={roundWords} onRetry={(missed) => start("listen", missed)} onDone={() => void refresh()} />
        ) : (
          <Round key={`${mode}-${roundWords.join()}`} mode={mode} words={roundWords} onDone={() => void refresh()} onAgain={() => start(mode)} />
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="kid-shell">
      <p className="kid-kicker">Spelling</p>
      <h1 style={{ margin: "4px 0" }}>{LIST_TITLE}</h1>
      <p className="story-hook" style={{ margin: "8px 0" }}>
        Short <b>i</b> as in <i>inch</i> · short <b>o</b> as in <i>October</i> · short <b>u</b> as in <i>funny</i>
      </p>
      <section className="card" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <strong style={{ fontSize: "1.3rem" }}>{daysLeft <= 0 ? "Test day! You've got this." : daysLeft === 1 ? "Test tomorrow!" : `${daysLeft} days until the test`}</strong>
          <div>{when}</div>
        </div>
        <div aria-live="polite" style={{ fontSize: "1.2rem" }}>
          ⭐ <b>{summary ? summary.mastered : "…"}</b> of {D2_WORDS.length} mastered
        </div>
      </section>

      {preview ? (
        <p className="story-hook" role="note">Admin preview: you can try every mode, but practice from an admin account isn&apos;t saved. Only Mae&apos;s answers count toward stars and the admin stats.</p>
      ) : null}
      <h2>Practice</h2>
      <div className="sp-modes">
        {MODES.map((m) => (
          <button key={m.id} className="kid-card" style={{ ...big, textAlign: "left", padding: 16, cursor: "pointer" }} onClick={() => start(m.id)}>
            <div style={{ fontSize: "1.8rem" }} aria-hidden>{m.icon}</div>
            <strong>{m.title}</strong>
            <div style={{ fontSize: "0.95rem" }}>{m.blurb}</div>
          </button>
        ))}
      </div>

      {(["spelling", "review", "challenge"] as const).map((group) => (
        <section key={group}>
          <h2 style={{ textTransform: "capitalize" }}>{group === "spelling" ? "Spelling words" : `${group} words`}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
            {D2_WORDS.filter((w) => w.group === group).map((w) => {
              const s = statOf(w.word);
              return (
                <div key={w.word} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700 }}><Highlight w={w} /></span>
                    <span title={VOWEL_KEY[w.vowel].label} style={{ fontSize: "0.85rem" }}>{s?.mastered ? "⭐ mastered" : s && s.streak > 0 ? `${s.streak}/3 in a row` : VOWEL_KEY[w.vowel].label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn" style={big} aria-label={`Hear ${w.word}`} onClick={() => prefs.speak(wordClip(w))}>🔊 Hear it</button>
                    <button className="btn secondary" style={big} aria-expanded={openTrick === w.word} onClick={() => { setOpenTrick(openTrick === w.word ? null : w.word); if (openTrick !== w.word) prefs.speak(trickClip(w)); }}>💡 Trick</button>
                  </div>
                  {openTrick === w.word ? <p style={{ margin: "8px 0 0" }}>{w.trick}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p style={{ marginTop: 24 }}><Link href="/study">← Back to today</Link></p>
    </div>
  );
}

function Burst({ n = 14 }: { n?: number }) {
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 90 + Math.random() * 80;
    return { ch: i % 3 === 0 ? "🎉" : "⭐", dx: `${Math.round(Math.cos(a) * r)}px`, dy: `${Math.round(Math.sin(a) * r)}px` };
  }), [n]);
  return (
    <div className="sp-burst" aria-hidden>
      {bits.map((b, i) => <span key={i} style={{ ["--dx" as string]: b.dx, ["--dy" as string]: b.dy } as React.CSSProperties}>{b.ch}</span>)}
    </div>
  );
}

function Progress({ at, total, streak, stars }: { at: number; total: number; streak?: number; stars?: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.15rem", fontWeight: 600 }}>
        <span>{at > total ? "Bonus try" : `Word ${at} of ${total}`}</span>
        {stars !== undefined ? <span aria-label={`${stars} stars, streak ${streak ?? 0}`}>⭐ {stars}{streak && streak > 1 ? ` · 🔥 ${streak} in a row` : ""}</span> : null}
      </div>
      <div className="sp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(at - 1, total)}><span style={{ width: `${Math.round((Math.min(at - 1, total) / Math.max(1, total)) * 100)}%` }} /></div>
    </div>
  );
}

function Letters({ target, typed }: { target: string; typed: string }) {
  const { marks } = markLetters(target, typed);
  return (
    <p aria-label={`Your try: ${typed}`} style={{ margin: "8px 0" }}>
      {marks.map((m, i) => <span key={i} className={`sp-letter ${m.ok ? "ok" : "bad"}`}>{m.ch}</span>)}
    </p>
  );
}

/** One practice round. Words missed until the answer is shown go back in the queue once. */
function Round({ mode, words, onDone, onAgain }: { mode: SpellingMode; words: string[]; onDone: () => void; onAgain: () => void }) {
  const prefs = useKidPrefs();
  const [queue, setQueue] = useState<string[]>(words);
  const [idx, setIdx] = useState(0);
  const [misses, setMisses] = useState(0);
  const [typed, setTyped] = useState("");
  const [lastTry, setLastTry] = useState<string | null>(null);
  const [tilesUsed, setTilesUsed] = useState<number[]>([]);
  const [help, setHelp] = useState<Help>({ level: "none" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const [covered, setCovered] = useState(false);
  const [heard, setHeard] = useState(false);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [burst, setBurst] = useState(0);
  const [score, setScore] = useState({ firstTry: 0, streak: 0, best: 0, missed: new Set<string>() });
  const wrongTimes = useRef<number[]>([]);
  const afterBreath = useRef<string | null>(null);
  const requeued = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const word = findWord(queue[idx]);
  const tiles = useMemo(() => (word ? shuffle(word.word.split("")) : []), [word, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!word) return;
    setTyped(mode === "fix" ? word.oops : "");
    setTilesUsed([]);
    setHelp({ level: "none" });
    setFeedback(null);
    setLastTry(null);
    setRight(false);
    setCovered(false);
    setHeard(false);
    setShownAt(Date.now());
    setMisses(0);
    wrongTimes.current = [];
    if (mode === "listen" || mode === "sort") prefs.speak(wordClip(word));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [idx, queue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ticks only while something time-based is pending (flashcard study time, the slow-down pause).
  const waiting = (mode === "flash" && !covered && !heard && now - shownAt < FLASH_STUDY_MS) || now < cooldownUntil;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [waiting]);

  const locked = now < cooldownUntil;
  useEffect(() => {
    if (!locked && afterBreath.current !== null) {
      setFeedback(afterBreath.current);
      afterBreath.current = null;
    }
  }, [locked]);

  const finished = !word;
  const reported = useRef(false);
  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      setBurst((b) => b + 1);
      postFinished(mode, score.firstTry, words.length, [...score.missed]);
      onDone();
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!word) {
    return (
      <section className="card" style={{ textAlign: "center", padding: 24, position: "relative" }}>
        {burst ? <Burst key={burst} n={22} /> : null}
        <h2>Round done! 🎉</h2>
        <p style={{ fontSize: "1.3rem" }}>⭐ {score.firstTry} of {words.length} right on the first try.</p>
        {score.best > 1 ? <p>Best streak: 🔥 {score.best} in a row</p> : null}
        {score.missed.size ? <p>Keep practicing: {[...score.missed].join(", ")}</p> : <p>Every word on the first try. Amazing!</p>}
        <button className="btn" style={big} onClick={onAgain}>Another round</button>
      </section>
    );
  }

  function next() {
    setIdx((i) => i + 1);
  }
  function hear() {
    if (!word) return;
    setHeard(true);
    prefs.speak(wordClip(word));
  }

  const coolingDown = now < cooldownUntil;

  async function submit(answer: { typed?: string; vowel?: Vowel }) {
    if (!word || busy || right) return;
    if (Date.now() < cooldownUntil) return;
    if (answer.typed !== undefined && !answer.typed.trim()) return;
    setBusy(true);
    const result = await postCheck({ word: word.word, mode, misses, ...answer });
    setBusy(false);
    if (!result) {
      setFeedback("Hmm, I couldn't check that. Try again in a moment.");
      return;
    }
    if (result.correct) {
      setRight(true);
      setLastTry(null);
      const first = misses === 0;
      const line = rightMessage(score.firstTry + score.streak + idx);
      setFeedback(first ? `${line} ⭐` : line);
      prefs.speak(line);
      if (first) {
        setBurst((b) => b + 1);
        setScore((s) => ({ ...s, firstTry: s.firstTry + 1, streak: s.streak + 1, best: Math.max(s.best, s.streak + 1) }));
      } else {
        setScore((s) => ({ ...s, streak: 0 }));
      }
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setScore((s) => ({ ...s, streak: 0, missed: new Set(s.missed).add(word.word) }));
    setHelp(result.help);
    if (mode === "sort") {
      setFeedback(`It's ${result.vowel?.label ?? "a different sound"}: ${result.help.hint ?? ""}`);
      setRight(true);
      return;
    }
    const t = Date.now();
    wrongTimes.current = [...wrongTimes.current, t];
    const slow = tooQuick(wrongTimes.current, t) && result.help.level !== "reveal";
    if (result.help.level === "reveal") {
      setFeedback(null);
      setLastTry(null);
      prefs.speak(revealClip(word));
      if (!requeued.current.has(word.word)) {
        requeued.current.add(word.word);
        setQueue((q) => [...q, word.word]);
      }
    } else {
      const tryText = answer.typed ?? "";
      setLastTry(tryText);
      const msg = missMessage(word.word, tryText, m);
      const after = result.help.level === "hint" ? `${msg} Here's a hint.` : msg;
      setFeedback(slow ? SPELLING_BREATHE : after);
      afterBreath.current = slow ? after : null;
      if (slow) {
        wrongTimes.current = [];
        setCooldownUntil(t + COOLDOWN_MS);
        setNow(t);
        prefs.speak(SPELLING_BREATHE);
      } else if (msg.startsWith(SPELLING_SO_CLOSE)) {
        prefs.speak(SPELLING_SO_CLOSE);
      }
    }
    if (mode === "tiles") setTilesUsed([]);
    if (mode !== "fix" && mode !== "tiles") setTyped("");
  }

  const revealed = help.level === "reveal";
  const flashReady = canCover(shownAt, heard, now);
  return (
    <section className="card" style={{ padding: 20, position: "relative" }}>
      {burst ? <Burst key={burst} /> : null}
      {idx < words.length ? <Progress at={idx + 1} total={words.length} streak={score.streak} stars={score.firstTry} /> : <><Progress at={words.length + 1} total={words.length} streak={score.streak} stars={score.firstTry} /><p style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 8px" }}>🔁 One more time! ({queue.length - idx} left)</p></>}

      {mode === "flash" && !covered ? (
        <div>
          <p style={{ fontSize: "2.6rem", fontWeight: 700, margin: "16px 0" }}><Highlight w={word} /></p>
          <p style={{ fontSize: "1.15rem" }}>{word.trick}</p>
          <div className="sp-row">
            <button className="btn secondary" style={big} onClick={hear}>🔊 Hear it</button>
            <button className="btn" style={big} disabled={!flashReady} onClick={() => setCovered(true)}>{flashReady ? "Cover it & spell →" : "Look at each letter…"}</button>
          </div>
        </div>
      ) : mode === "sort" ? (
        <div>
          <button className="btn" aria-label="Hear the word" style={{ fontSize: "3rem", minWidth: 120, minHeight: 100, margin: "12px auto", borderRadius: 24 }} onClick={hear}>🔊</button>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "4px 0" }}>{word.word}</p>
          <p style={{ fontSize: "1.2rem" }}>Which sound?</p>
          <div className="sp-row">
            {(["i", "o", "u"] as Vowel[]).map((v) => (
              <button key={v} className="btn" disabled={busy || right} style={{ ...big, minWidth: 140 }} onClick={() => void submit({ vowel: v })}>
                short {v}<br /><small>{VOWEL_KEY[v].example}</small>
              </button>
            ))}
          </div>
          {right ? <p style={{ fontSize: "1.6rem" }}><Highlight w={word} /></p> : null}
        </div>
      ) : (
        <div>
          {mode === "listen" || mode === "flash" || mode === "tiles" ? (
            <div className="sp-row"><button className="btn secondary" style={big} onClick={hear}>🔊 Hear it again</button></div>
          ) : null}
          {mode === "fix" ? (
            <p style={{ fontSize: "1.3rem" }}>This word is spelled wrong: <s style={{ fontWeight: 700 }}>{word.oops}</s>{" "}
              <button className="btn secondary" style={big} aria-label="Hear the word" onClick={hear}>🔊</button></p>
          ) : null}
          <form onSubmit={(e) => { e.preventDefault(); void submit({ typed }); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8 }}>
            {mode === "tiles" ? (
              <div className="sp-input" role="status" aria-label={`Your word so far: ${typed || "empty"}`} style={{ minHeight: 60, letterSpacing: "0.12em", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{typed || <span style={{ opacity: 0.35 }}>tap the letters</span>}</div>
            ) : (
              <input ref={inputRef} className="sp-input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={right || revealed}
                autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Type the word" />
            )}
            {mode === "tiles" && !right && !revealed ? (
              <>
                <div className="sp-row" style={{ margin: "4px 0" }}>
                  {tiles.map((ch, i) => (
                    <button type="button" key={i} className="btn sp-tile" disabled={tilesUsed.includes(i)} aria-label={`Letter ${ch}`}
                      onClick={() => { setTilesUsed((u) => [...u, i]); setTyped((t) => t + ch); }}>{ch}</button>
                  ))}
                </div>
                <div className="sp-row" style={{ margin: 0 }}>
                  <button type="button" className="btn secondary" style={big} disabled={!tilesUsed.length} onClick={() => { setTilesUsed((u) => u.slice(0, -1)); setTyped((t) => t.slice(0, -1)); }}>⌫ Undo</button>
                  <button type="button" className="btn secondary" style={big} disabled={!tilesUsed.length} onClick={() => { setTilesUsed([]); setTyped(""); }}>Clear</button>
                </div>
              </>
            ) : null}
            {!right && !revealed ? (
              <button type="submit" className="btn" style={{ ...big, minWidth: 200 }} disabled={busy || coolingDown}>{coolingDown ? "Take a breath…" : "Check ✓"}</button>
            ) : null}
          </form>
        </div>
      )}

      {lastTry && !right && !revealed && !coolingDown ? <Letters target={word.word} typed={lastTry} /> : null}
      {feedback ? <p aria-live="polite" style={{ fontSize: "1.25rem" }}>{feedback}</p> : null}
      {help.level === "hint" && help.hint && !coolingDown ? <p className="story-hook">💡 {help.hint}</p> : null}
      {revealed && mode !== "sort" ? (
        <div className="story-hook">
          <p style={{ margin: 0 }}>Here&apos;s how to spell it:</p>
          <p style={{ fontSize: "2.2rem", fontWeight: 700, margin: "8px 0" }}><Highlight w={word} /></p>
          <p style={{ margin: 0 }}>{word.trick} We&apos;ll try it again later.</p>
        </div>
      ) : null}
      {right || revealed ? (
        <div className="sp-row">
          <button className="btn" style={{ ...big, minWidth: 200 }} onClick={next} autoFocus>Next word →</button>
        </div>
      ) : null}
    </section>
  );
}

/** All 25 words in random order: one try each, no hints, then a score and the missed words to retry. */
export function MockTest({ words, onRetry, onDone }: { words: string[]; onRetry: (missed: string[]) => void; onDone: () => void }) {
  const prefs = useKidPrefs();
  const [state, setState] = useState<MockState>({ started: false, idx: 0, missed: [] });
  const [hydrated, setHydrated] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { started, idx, missed } = state;
  const word = findWord(words[idx]);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (started && word) {
      // The intro plays before word 1, but the test is already on screen: starting never waits on audio.
      if (idx === 0) prefs.speak(SPELLING_LINES.mockStart, { onend: () => prefs.speak(wordClip(word)) });
      else prefs.speak(wordClip(word));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (started && !word) {
      prefs.speak(SPELLING_LINES.mockDone);
      postFinished("mock", words.length - missed.length, words.length, missed);
      onDone();
    }
  }, [idx, started]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!started) {
    return (
      <section className="card" style={{ textAlign: "center", padding: 24 }}>
        <h2>Mock test 📝</h2>
        <p style={{ fontSize: "1.15rem" }}>I&apos;ll say all {words.length} words in a random order. Each word gets one try, just like the real test.</p>
        <button type="button" className="btn" data-testid="mock-start" style={{ ...big, minWidth: 220 }} disabled={!hydrated}
          onClick={() => setState((s) => mockStep(s, { type: "start" }))}>{hydrated ? "Start the test" : "Getting ready…"}</button>
      </section>
    );
  }
  if (!word) {
    const score = words.length - missed.length;
    return (
      <section className="card" style={{ textAlign: "center", padding: 24, position: "relative" }}>
        <Burst n={24} />
        <h2>You scored {score} out of {words.length}! {score === words.length ? "🏆" : "🎉"}</h2>
        {missed.length ? (
          <>
            <p>Words to practice:</p>
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.4rem" }}>
              {missed.map((m) => { const w = findWord(m)!; return <li key={m}><Highlight w={w} /></li>; })}
            </ul>
            <button className="btn" style={big} onClick={() => onRetry(missed)}>Practice the missed words</button>
          </>
        ) : <p>A perfect test. Wow!</p>}
      </section>
    );
  }

  async function submit() {
    if (!word || busy || !typed.trim()) return;
    setBusy(true);
    const result = await postCheck({ word: word.word, mode: "mock", misses: 0, typed });
    setBusy(false);
    if (!result) return;
    setTyped("");
    setState((s) => mockStep(s, { type: "answer", word: word.word, correct: result.correct }));
  }

  return (
    <section className="card" style={{ padding: 24 }}>
      <Progress at={idx + 1} total={words.length} />
      <div className="sp-row"><button className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(word))}>🔊 Say it again</button></div>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8 }}>
        <input ref={inputRef} className="sp-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
          aria-label={`Spell word ${idx + 1}`} />
        <button type="submit" className="btn" style={{ ...big, minWidth: 200 }} disabled={busy}>Next →</button>
      </form>
    </section>
  );
}
