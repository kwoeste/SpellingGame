"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { D2_WORDS, LIST_TITLE, SPELLING_LINES, VOWEL_KEY, findWord, revealClip, trickClip, wordClip, type SpellingWord, type Vowel } from "@/lib/spelling/list-d2";
import type { SpellingMode, WordStat } from "@/lib/spelling/engine";

type Summary = { stats: WordStat[]; mastered: number; total: number; queue: string[] };
type Help = { level: "none" | "hint" | "reveal"; hint?: string; answer?: string };
type CheckResult = { correct: boolean; help: Help; stat: WordStat | null; vowel?: { answer: Vowel; label: string } | null };

const MODES: { id: SpellingMode; icon: string; title: string; blurb: string }[] = [
  { id: "listen", icon: "🎧", title: "Listen & spell", blurb: "Hear it, then type it." },
  { id: "flash", icon: "🃏", title: "Flashcards", blurb: "Look, cover, spell." },
  { id: "tiles", icon: "🔤", title: "Letter tiles", blurb: "Unscramble the letters." },
  { id: "fix", icon: "🛠️", title: "Fix the misspelling", blurb: "Find the oops and fix it." },
  { id: "sort", icon: "🗂️", title: "Sort by sound", blurb: "Short i, o, or u?" },
  { id: "mock", icon: "📝", title: "Mock test", blurb: "All 25 words, like the real test." },
];

const big: React.CSSProperties = { minHeight: "var(--touch, 48px)", fontSize: "1.1rem" };

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

export function SpellingD2({ testDate, daysLeft }: { testDate: string; daysLeft: number }) {
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
        {mode === "mock" ? (
          <MockTest words={roundWords} onRetry={(missed) => start("listen", missed)} onDone={() => void refresh()} />
        ) : (
          <Round key={`${mode}-${roundWords.join()}`} mode={mode} words={roundWords} onDone={() => void refresh()} onAgain={() => start(mode)} />
        )}
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

      <h2>Practice</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
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

/** One practice round. Words missed until the answer is shown go back in the queue once. */
function Round({ mode, words, onDone, onAgain }: { mode: SpellingMode; words: string[]; onDone: () => void; onAgain: () => void }) {
  const prefs = useKidPrefs();
  const [queue, setQueue] = useState<string[]>(words);
  const [idx, setIdx] = useState(0);
  const [misses, setMisses] = useState(0);
  const [typed, setTyped] = useState("");
  const [tilesUsed, setTilesUsed] = useState<number[]>([]);
  const [help, setHelp] = useState<Help>({ level: "none" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const [covered, setCovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState({ firstTry: 0, missed: new Set<string>() });
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
    setRight(false);
    setCovered(false);
    setMisses(0);
    if (mode === "listen") prefs.speak(wordClip(word));
    if (mode === "sort") prefs.speak(wordClip(word));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [idx, queue]); // eslint-disable-line react-hooks/exhaustive-deps

  const finished = !word;
  const reported = useRef(false);
  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      postFinished(mode, score.firstTry, words.length, [...score.missed]);
      onDone();
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!word) {
    return (
      <section className="card" style={{ textAlign: "center", padding: 24 }}>
        <h2>Round done! 🎉</h2>
        <p style={{ fontSize: "1.2rem" }}>{score.firstTry} of {words.length} right on the first try.</p>
        {score.missed.size ? <p>Keep practicing: {[...score.missed].join(", ")}</p> : <p>Every word on the first try. Amazing!</p>}
        <button className="btn" style={big} onClick={onAgain}>Another round</button>
      </section>
    );
  }

  function next() {
    setIdx((i) => i + 1);
  }

  async function submit(answer: { typed?: string; vowel?: Vowel }) {
    if (!word || busy || right) return;
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
      setFeedback(misses === 0 ? "Yes! Spelled just right. ⭐" : "You got it!");
      prefs.speak(SPELLING_LINES.right);
      if (misses === 0) setScore((s) => ({ ...s, firstTry: s.firstTry + 1 }));
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setScore((s) => ({ ...s, missed: new Set(s.missed).add(word.word) }));
    setHelp(result.help);
    if (mode === "sort") {
      setFeedback(`It's ${result.vowel?.label ?? "a different sound"}: ${result.help.hint ?? ""}`);
      setRight(true);
      return;
    }
    if (result.help.level === "reveal") {
      setFeedback(null);
      prefs.speak(revealClip(word));
      if (!requeued.current.has(word.word)) {
        requeued.current.add(word.word);
        setQueue((q) => [...q, word.word]);
      }
    } else {
      setFeedback(result.help.level === "hint" ? "Here's a hint." : "Not quite. Look at every letter and try again.");
    }
    if (mode === "tiles") setTilesUsed([]);
    if (mode !== "fix" && mode !== "tiles") setTyped("");
  }

  const revealed = help.level === "reveal";
  return (
    <section className="card" style={{ padding: 20 }}>
      <p style={{ margin: 0 }}>Word {idx + 1} of {queue.length}</p>

      {mode === "flash" && !covered ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "2.4rem", fontWeight: 700, margin: "16px 0" }}><Highlight w={word} /></p>
          <p>{word.trick}</p>
          <button className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(word))}>🔊 Hear it</button>{" "}
          <button className="btn" style={big} onClick={() => setCovered(true)}>Cover it & spell →</button>
        </div>
      ) : mode === "sort" ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "2.4rem", fontWeight: 700, margin: "16px 0" }}>{word.word}</p>
          <p>Which short vowel sound do you hear?</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {(["i", "o", "u"] as Vowel[]).map((v) => (
              <button key={v} className="btn" disabled={busy || right} style={{ ...big, minWidth: 140 }} onClick={() => void submit({ vowel: v })}>
                short {v}<br /><small>{VOWEL_KEY[v].example}</small>
              </button>
            ))}
          </div>
          {right ? <p style={{ fontSize: "1.6rem" }}><Highlight w={word} /></p> : null}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {mode === "listen" || mode === "flash" ? (
            <button className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(word))}>🔊 Hear it again</button>
          ) : null}
          {mode === "fix" ? <p style={{ fontSize: "1.3rem" }}>This word is spelled wrong: <s style={{ fontWeight: 700 }}>{word.oops}</s>. <button className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(word))}>🔊</button></p> : null}
          {mode === "tiles" ? (
            <>
              <button className="btn secondary" style={big} onClick={() => prefs.speak(wordClip(word))}>🔊 Hear it</button>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "16px 0" }}>
                {tiles.map((ch, i) => (
                  <button key={i} className="btn" disabled={tilesUsed.includes(i) || right || revealed} style={{ ...big, minWidth: 52, fontSize: "1.5rem" }}
                    onClick={() => { setTilesUsed((u) => [...u, i]); setTyped((t) => t + ch); }}>{ch}</button>
                ))}
              </div>
            </>
          ) : null}
          <form onSubmit={(e) => { e.preventDefault(); void submit({ typed }); }} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
            <input ref={inputRef} value={typed} readOnly={mode === "tiles"} onChange={(e) => setTyped(e.target.value)} disabled={right || revealed}
              autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Type the word"
              style={{ fontSize: "1.6rem", padding: "8px 12px", minHeight: 56, borderRadius: 12, border: "2px solid #d7c4ae", width: "min(320px, 100%)" }} />
            {mode === "tiles" && !right && !revealed ? <button type="button" className="btn secondary" style={big} onClick={() => { setTilesUsed([]); setTyped(""); }}>Clear</button> : null}
            {!right && !revealed ? <button type="submit" className="btn" style={big} disabled={busy}>Check</button> : null}
          </form>
        </div>
      )}

      {feedback ? <p aria-live="polite" style={{ fontSize: "1.2rem", textAlign: "center" }}>{feedback}</p> : null}
      {help.level === "hint" && help.hint ? <p className="story-hook" style={{ textAlign: "center" }}>💡 {help.hint}</p> : null}
      {revealed && mode !== "sort" ? (
        <div className="story-hook" style={{ textAlign: "center" }}>
          <p style={{ margin: 0 }}>Here&apos;s how to spell it:</p>
          <p style={{ fontSize: "2.2rem", fontWeight: 700, margin: "8px 0" }}><Highlight w={word} /></p>
          <p style={{ margin: 0 }}>{word.trick} We&apos;ll try it again later.</p>
        </div>
      ) : null}
      {right || revealed ? (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button className="btn" style={big} onClick={next} autoFocus>Next word →</button>
        </div>
      ) : null}
    </section>
  );
}

/** All 25 words in random order: one try each, no hints, then a score and the missed words to retry. */
function MockTest({ words, onRetry, onDone }: { words: string[]; onRetry: (missed: string[]) => void; onDone: () => void }) {
  const prefs = useKidPrefs();
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [missed, setMissed] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const word = findWord(words[idx]);

  useEffect(() => {
    if (started && word) {
      prefs.speak(wordClip(word));
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
        <p>I&apos;ll say all {words.length} words in a random order. Each word gets one try, just like the real test.</p>
        <button className="btn" style={big} onClick={() => { let go = false; const begin = () => { if (!go) { go = true; setStarted(true); } }; prefs.speak(SPELLING_LINES.mockStart, { onend: begin }); setTimeout(begin, 9000); }}>Start the test</button>
      </section>
    );
  }
  if (!word) {
    const score = words.length - missed.length;
    return (
      <section className="card" style={{ textAlign: "center", padding: 24 }}>
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
    if (!result.correct) setMissed((m) => [...m, word.word]);
    setTyped("");
    setIdx((i) => i + 1);
  }

  return (
    <section className="card" style={{ textAlign: "center", padding: 24 }}>
      <p style={{ fontSize: "1.4rem", margin: 0 }}>Word <b>{idx + 1}</b> of {words.length}</p>
      <button className="btn secondary" style={{ ...big, marginTop: 12 }} onClick={() => prefs.speak(wordClip(word))}>🔊 Say it again</button>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
          aria-label={`Spell word ${idx + 1}`} style={{ fontSize: "1.6rem", padding: "8px 12px", minHeight: 56, borderRadius: 12, border: "2px solid #d7c4ae", width: "min(320px, 100%)" }} />
        <button type="submit" className="btn" style={big} disabled={busy}>Next →</button>
      </form>
    </section>
  );
}
