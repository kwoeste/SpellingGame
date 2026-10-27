"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarefulRead } from "@/components/CarefulRead";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import type { StuckHelp } from "@/lib/help/ladder";
import type { GradeResult, StudentQuestion } from "@/lib/practice/types";
import { answerUnlockMs } from "@/lib/ui/careful-read";
import { playSound } from "@/lib/ui/sounds";

type Lesson = { lesson: number; title: string; learn: { term: string; explain: string }[] };
type Outcome = { q: StudentQuestion; firstTry: boolean; exact: boolean; misses: number; revealed: boolean; expected: string[]; typed: string[] };
type Phase = "intro" | "learn" | "loading" | "test" | "results";

const missedKey = (chapterId: string) => `mae-practice-missed:${chapterId}`;
const learnedKey = (chapterId: string) => `mae-practice-learned:${chapterId}`;

function logPractice(chapterId: string, detail: string, extra: Record<string, unknown>) {
  void fetch("/api/engine/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: "practice-test",
      events: [{ id: crypto.randomUUID(), type: "game_event", activityId: chapterId, payload: { game_id: "practice-test", chapter_id: chapterId, detail, ...extra } }],
    }),
  }).catch(() => undefined);
}

function readable(q: StudentQuestion): string {
  if (q.kind === "match") return `${q.text} ${(q.prompts ?? []).join(". ")}.`;
  return q.text.replace(/___/g, "blank");
}

export function PracticeTest({ chapterId, lessons, startMode, bankSize }: { chapterId: string; lessons: Lesson[]; startMode: "full" | "retry"; bankSize: number }) {
  const prefs = useKidPrefs();
  const [phase, setPhase] = useState<Phase>("intro");
  const [lessonIdx, setLessonIdx] = useState(0);
  const [learnReady, setLearnReady] = useState(false);
  const [learnedBefore, setLearnedBefore] = useState(false);
  const [savedMissed, setSavedMissed] = useState<string[]>([]);
  const [mode, setMode] = useState<"full" | "retry">(startMode);
  const [queue, setQueue] = useState<StudentQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [error, setError] = useState("");
  const startedAt = useRef(Date.now());

  useEffect(() => {
    try {
      setLearnedBefore(window.localStorage.getItem(learnedKey(chapterId)) === "1");
      setSavedMissed(JSON.parse(window.localStorage.getItem(missedKey(chapterId)) ?? "[]"));
    } catch {
      /* private mode */
    }
  }, [chapterId]);

  const start = useCallback(
    async (m: "full" | "retry", factIds?: string[]) => {
      setPhase("loading");
      setError("");
      setMode(m);
      try {
        const res = await fetch("/api/engine/practice-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempt: { chapterId, factIds: m === "retry" ? factIds : undefined } }),
        });
        const json = (await res.json()) as { questions?: StudentQuestion[] };
        if (!res.ok || !json.questions?.length) throw new Error("load");
        setQueue(json.questions);
        setIdx(0);
        setOutcomes({});
        requeued.current = new Set();
        startedAt.current = Date.now();
        setPhase("test");
        logPractice(chapterId, "started", { mode: m, questions: json.questions.length });
      } catch {
        setError("Hmm, the test didn't load. Tap to try again.");
        setPhase("intro");
      }
    },
    [chapterId],
  );

  function finishLearn() {
    try {
      window.localStorage.setItem(learnedKey(chapterId), "1");
    } catch {
      /* ignore */
    }
    logPractice(chapterId, "learn_done", {});
    void start("full");
  }

  const requeued = useRef<Set<string>>(new Set());

  function onDone(o: Outcome, again: boolean) {
    let nextQueue = queue;
    if (again && !requeued.current.has(o.q.factId)) {
      requeued.current.add(o.q.factId);
      nextQueue = [...queue, o.q];
      setQueue(nextQueue);
    }
    const next = { ...outcomes, [o.q.factId]: outcomes[o.q.factId] ? { ...outcomes[o.q.factId], misses: outcomes[o.q.factId].misses + o.misses } : o };
    setOutcomes(next);
    if (o.revealed) {
      // Re-teach later: the same fact comes back at the end, in different words.
      logPractice(chapterId, "revealed", { item: o.q.factId, misses: o.misses });
    }
    if (idx + 1 < nextQueue.length) {
      setIdx(idx + 1);
      return;
    }
    finish(next);
  }

  function finish(all: Record<string, Outcome>) {
    const list = Object.values(all);
    const byLesson = lessons.map((l) => {
      const rows = list.filter((o) => o.q.lesson === l.lesson);
      return { lesson: l.lesson, right: rows.filter((o) => o.firstTry).length, total: rows.length };
    });
    const missed = list.filter((o) => !o.firstTry).map((o) => o.q.factId);
    const spelling = list.filter((o) => o.firstTry && !o.exact).map((o) => o.q.factId);
    try {
      window.localStorage.setItem(missedKey(chapterId), JSON.stringify([...new Set([...missed, ...spelling])]));
    } catch {
      /* ignore */
    }
    setSavedMissed([...new Set([...missed, ...spelling])]);
    logPractice(chapterId, "finished", {
      mode,
      score: list.filter((o) => o.firstTry).length,
      total: list.length,
      exact_spelling: list.filter((o) => o.firstTry && o.exact).length,
      by_lesson: byLesson,
      missed: missed.slice(0, 40),
      misspelled: spelling.slice(0, 40),
      minutes: Math.round((Date.now() - startedAt.current) / 60000),
    });
    setPhase("results");
  }

  if (phase === "intro") {
    return (
      <div className="card">
        <h2>Get ready for your science test</h2>
        <p>This works like the Guided Notes at school. Read each sentence and type the missing word. Spelling counts, so type carefully!</p>
        <p className="kid-kicker">{bankSize} practice questions in the bank. Each test mixes them up.</p>
        {error ? <p role="alert">{error}</p> : null}
        <p>
          <button className="btn" onClick={() => setPhase("learn")}>📖 Learn it first</button>{" "}
          {learnedBefore ? <button className="btn secondary" onClick={() => void start("full")}>📝 Take the full practice test</button> : null}{" "}
          {savedMissed.length ? <button className="btn secondary" onClick={() => void start("retry", savedMissed)}>🔁 Retry the ones I missed ({savedMissed.length})</button> : null}
        </p>
        {startMode === "retry" && !savedMissed.length ? <p className="kid-kicker">No missed questions saved yet. Take the full test!</p> : null}
      </div>
    );
  }

  if (phase === "learn") {
    const l = lessons[lessonIdx];
    return (
      <div className="card">
        <p className="kid-kicker">Learn it · Lesson {l.lesson} of {lessons.length}</p>
        <h2>{l.title}</h2>
        <ul>
          {l.learn.map((k) => (
            <li key={k.term}><strong>{k.term}</strong></li>
          ))}
        </ul>
        <CarefulRead key={l.lesson} sentences={l.learn.map((k, i) => ({ id: `${l.lesson}-${i}`, text: k.explain }))} onReady={setLearnReady} />
        <p>
          <button
            className="btn"
            disabled={!learnReady}
            onClick={() => {
              setLearnReady(false);
              if (lessonIdx + 1 < lessons.length) setLessonIdx(lessonIdx + 1);
              else finishLearn();
            }}
          >
            {lessonIdx + 1 < lessons.length ? "Next lesson →" : "Start the practice test →"}
          </button>
        </p>
        {!learnReady ? <p className="kid-kicker">Read every word to keep going.</p> : null}
      </div>
    );
  }

  if (phase === "loading") return <div className="card"><p>Getting your test ready…</p></div>;

  if (phase === "test") {
    const q = queue[idx];
    const lessonTitle = lessons.find((l) => l.lesson === q.lesson)?.title ?? "";
    return (
      <div>
        <p className="kid-kicker">
          Lesson {q.lesson}: {lessonTitle} · Question {idx + 1} of {queue.length}
        </p>
        <QuestionCard key={`${q.qid}:${idx}`} q={q} chapterId={chapterId} onDone={onDone} speak={prefs.speak} soundOn={prefs.soundOn} />
      </div>
    );
  }

  const list = Object.values(outcomes);
  const right = list.filter((o) => o.firstTry).length;
  const missed = list.filter((o) => !o.firstTry);
  const misspelled = list.filter((o) => o.firstTry && !o.exact);
  return (
    <div className="card" role="status">
      <h2>{mode === "retry" ? "Retry done!" : "Practice test done!"}</h2>
      <p>
        <strong>{right} of {list.length}</strong> right on the first try.
      </p>
      <table className="pt-table">
        <tbody>
          {lessons.map((l) => {
            const rows = list.filter((o) => o.q.lesson === l.lesson);
            if (!rows.length) return null;
            return (
              <tr key={l.lesson}>
                <td>Lesson {l.lesson}: {l.title}</td>
                <td>{rows.filter((o) => o.firstTry).length} / {rows.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {missed.length ? (
        <>
          <h3>Let&apos;s look at the ones you missed</h3>
          <ul>
            {missed.map((o) => (
              <li key={o.q.factId}>
                {o.q.kind === "match" ? o.q.text : o.q.text.replace(/___/g, "_____")} <br />
                <strong>Answer: {o.expected.join(", ")}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {misspelled.length ? (
        <>
          <h3>Right, but check the spelling</h3>
          <ul>
            {misspelled.map((o) => (
              <li key={o.q.factId}>
                You typed &ldquo;{o.typed.join(", ")}&rdquo;. It&apos;s spelled <strong>{o.expected.join(", ")}</strong>.
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        {missed.length || misspelled.length ? (
          <button className="btn" onClick={() => void start("retry", [...new Set([...missed, ...misspelled].map((o) => o.q.factId))])}>
            🔁 Retry missed
          </button>
        ) : null}{" "}
        <button className="btn secondary" onClick={() => void start("full")}>📝 New full practice test</button>{" "}
        <a className="btn secondary" href={`/study`}>Back to Today</a>
      </p>
    </div>
  );
}

function QuestionCard({
  q,
  chapterId,
  onDone,
  speak,
  soundOn,
}: {
  q: StudentQuestion;
  chapterId: string;
  onDone: (o: Outcome, again: boolean) => void;
  speak: (text: string) => void;
  soundOn: boolean;
}) {
  const [values, setValues] = useState<string[]>(() => Array(q.slots).fill(""));
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<StuckHelp | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(true);
  const [lockRound, setLockRound] = useState(0);
  const firstTyped = useRef<string[] | null>(null);
  const text = useMemo(() => readable(q), [q]);

  // Slow down: answers unlock only after time to read every word (again after each miss).
  useEffect(() => {
    setLocked(true);
    const t = window.setTimeout(() => setLocked(false), answerUnlockMs(text.split(/\s+/).length));
    return () => window.clearTimeout(t);
  }, [text, lockRound]);

  function set(i: number, v: string) {
    setValues((prev) => prev.map((x, j) => (j === i ? v : x)));
    setMessage("");
  }

  function fillFromBank(word: string) {
    const i = values.findIndex((v) => !v.trim());
    set(i >= 0 ? i : 0, word);
  }

  async function check() {
    setSending(true);
    if (!firstTyped.current) firstTyped.current = [...values];
    try {
      const res = await fetch("/api/engine/practice-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check: { qid: q.qid, responses: values, misses } }),
      });
      const json = (await res.json()) as { result: GradeResult; help: StuckHelp | null };
      if (json.result.correct) {
        setResult(json.result);
        playSound("pair", soundOn);
        const note = json.result.exact ? "Yes! Spelled just right." : `Right! Spelling check: it's spelled ${json.result.slots.filter((s) => !s.exact).map((s) => `"${s.expected}"`).join(", ")}.`;
        setMessage(note);
        speak(note);
        return;
      }
      const n = misses + 1;
      setMisses(n);
      setHelp(json.help);
      if (n === 4) logPractice(chapterId, "stuck", { item: q.factId, misses: n });
      setMessage(json.help ? "" : "Not yet. Read every word of the sentence again, slowly.");
      setLockRound((r) => r + 1);
    } catch {
      setMessage("Hmm, that didn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  function showMe() {
    if (!help?.reveal) return;
    setRevealed(true);
    const words = help.reveal.response as string[];
    setValues(words.map(() => ""));
    speak(`${help.reveal.answer}. ${help.reveal.why}`);
  }

  function next() {
    const expected = result ? result.slots.map((s) => s.expected) : ((help?.reveal?.response as string[]) ?? []);
    const firstTry = misses === 0 && !revealed;
    onDone({ q, firstTry, exact: firstTry && Boolean(result?.exact), misses, revealed, expected, typed: firstTyped.current ?? values }, revealed || misses >= 4);
  }

  function skip() {
    onDone({ q, firstTry: false, exact: false, misses, revealed: true, expected: (help?.reveal?.response as string[]) ?? [], typed: firstTyped.current ?? values }, true);
  }

  const parts = q.text.split("___");
  const canCheck = !locked && !sending && !result && values.every((v) => v.trim());
  const input = (i: number) => (
    <input
      key={i}
      aria-label={`Blank ${i + 1}`}
      className="pt-blank"
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      value={values[i]}
      disabled={Boolean(result)}
      onChange={(e) => set(i, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && canCheck) void check();
      }}
      style={{ minWidth: 120, fontSize: "1.1em", margin: "0 4px" }}
    />
  );

  return (
    <div className="card">
      <p>
        <button className="btn secondary" onClick={() => speak(text)}>🔊 Read it to me</button>
      </p>
      {q.kind === "blank" ? (
        <p style={{ fontSize: "1.25em", lineHeight: 2 }}>
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < parts.length - 1 ? input(i) : null}
            </span>
          ))}
        </p>
      ) : null}
      {q.kind === "list" ? (
        <>
          <p style={{ fontSize: "1.25em" }}>{q.text}</p>
          <ol type="a">
            {values.map((_, i) => (
              <li key={i}>{input(i)}</li>
            ))}
          </ol>
        </>
      ) : null}
      {q.kind === "match" ? (
        <>
          <p style={{ fontSize: "1.25em" }}>{q.text}</p>
          {(q.prompts ?? []).map((p, i) => (
            <p key={i}>
              <select aria-label={p} value={values[i]} disabled={Boolean(result)} onChange={(e) => set(i, e.target.value)} style={{ fontSize: "1.05em", marginRight: 8 }}>
                <option value="">Choose…</option>
                {(q.choices ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {p}
            </p>
          ))}
        </>
      ) : null}
      {q.wordBank && !result ? (
        <p>
          <span className="kid-kicker">Word bank: </span>
          {q.wordBank.map((w) => (
            <button key={w} className="btn secondary" style={{ margin: 3 }} onClick={() => fillFromBank(w)} disabled={locked}>
              {w}
            </button>
          ))}
        </p>
      ) : null}
      {locked && !result ? <p className="kid-kicker">Read every word first…</p> : null}
      {message ? <p role="status" aria-live="polite">{message}</p> : null}
      {!result ? <StuckHelpPanel help={help} revealed={revealed} onShowMe={showMe} onSkip={skip} /> : null}
      <p>
        {!result ? (
          <button className="btn" disabled={!canCheck} onClick={() => void check()}>{sending ? "Checking…" : "Check"}</button>
        ) : (
          <button className="btn" onClick={next}>Next →</button>
        )}
      </p>
    </div>
  );
}
