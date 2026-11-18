"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ColoniesMap, type MapFrame, type MapShape } from "@/components/ColoniesMap";
import { ColonySpellBox } from "@/components/ColonySpell";
import { ReadFirst } from "@/components/ReadFirst";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import type { StuckHelp } from "@/lib/help/ladder";
import { coloniesFinishedPayload, coloniesItemFormat, nextColoniesStep, payloadFits } from "@/lib/practice/colonies-log";
import type { GradeResult, StudentQuestion } from "@/lib/practice/types";
import { playSound } from "@/lib/ui/sounds";

type Lesson = { lesson: number; title: string; learn: { term: string; explain: string }[] };
type Outcome = { q: StudentQuestion; firstTry: boolean; exact: boolean; misses: number; revealed: boolean; expected: string[]; typed: string[] };
type Phase = "intro" | "learn" | "loading" | "test" | "results";
type QuizMap = MapFrame & { shapes: MapShape[] };

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

function promptText(q: StudentQuestion): string {
  const base = q.text.replace(/___/g, "blank");
  if ((q.kind === "choice" || q.spellFormat === "choice") && q.choices?.length) return `${base} ${q.choices.join(". ")}.`;
  if (q.activity === "map-name" && q.wordBank?.length) return `${base} ${q.wordBank.join(". ")}.`;
  return base;
}

function yesLine(q: StudentQuestion): string {
  if (q.kind === "choice" || q.kind === "tap") return "Yes! That's right.";
  return "Yes! Spelled just right.";
}

function binClass(name: string): string {
  if (name === "New England") return "region-new-england";
  if (name === "Middle Colonies") return "region-middle";
  if (name === "Southern Colonies") return "region-southern";
  return "";
}

function isQuizMap(value: unknown): value is QuizMap {
  if (!value || typeof value !== "object") return false;
  const map = value as QuizMap;
  return typeof map.viewBox === "string" && Array.isArray(map.shapes);
}

async function gradeRemote(qid: string, response: string, misses: number): Promise<{ correct: boolean; exact: boolean; why: string; help: StuckHelp | null; expected: string }> {
  const res = await fetch("/api/engine/practice-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check: { qid, responses: [response], misses } }),
  });
  if (!res.ok) throw new Error("check");
  const json = (await res.json()) as { result: GradeResult; help: StuckHelp | null; why?: string | null };
  return {
    correct: json.result.correct,
    exact: json.result.exact,
    why: json.why ?? "",
    help: json.help,
    expected: json.result.slots[0]?.expected ?? "",
  };
}

function answerLabel(o: Outcome): string {
  if (o.q.activity === "map-tap") return o.q.card ?? "that colony";
  return o.expected.filter(Boolean).join(", ") || (o.q.card ?? "");
}

export function ColoniesPracticeTest({
  chapterId,
  lessons,
  startMode,
  bankSize,
  intro,
  sortPrompt,
}: {
  chapterId: string;
  lessons: Lesson[];
  startMode: "full" | "retry" | "review";
  bankSize: number;
  intro?: { heading: string; body: string };
  sortPrompt: string;
}) {
  const prefs = useKidPrefs();
  const [phase, setPhase] = useState<Phase>("intro");
  const [lessonIdx, setLessonIdx] = useState(0);
  const [learnedBefore, setLearnedBefore] = useState(false);
  const [savedMissed, setSavedMissed] = useState<string[]>([]);
  const [mode, setMode] = useState<"full" | "retry" | "review">(startMode);
  const [queue, setQueue] = useState<StudentQuestion[]>([]);
  const [map, setMap] = useState<QuizMap | null>(null);
  const [idx, setIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [error, setError] = useState("");
  const [caughtUp, setCaughtUp] = useState(false);
  const startedAt = useRef(Date.now());
  const requeued = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      setLearnedBefore(window.localStorage.getItem(learnedKey(chapterId)) === "1");
      setSavedMissed(JSON.parse(window.localStorage.getItem(missedKey(chapterId)) ?? "[]") as string[]);
    } catch {
      /* private mode */
    }
  }, [chapterId]);

  const finish = useCallback((all: Record<string, Outcome>, modeNow: "full" | "retry" | "review") => {
    const list = Object.values(all);
    const byLesson = lessons.map((lesson) => {
      const rows = list.filter((row) => row.q.lesson === lesson.lesson);
      return { lesson: lesson.lesson, right: rows.filter((row) => row.firstTry).length, total: rows.length };
    });
    const missed = list.filter((row) => !row.firstTry).map((row) => row.q.factId);
    const misspelled = list.filter((row) => row.firstTry && !row.exact).map((row) => row.q.factId);
    if (modeNow === "review") {
      void fetch("/api/engine/practice-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: { chapterId, results: list.map((row) => ({ factId: row.q.factId, correct: row.firstTry })) } }),
      }).catch(() => undefined);
    } else {
      try {
        window.localStorage.setItem(missedKey(chapterId), JSON.stringify([...new Set([...missed, ...misspelled])]));
      } catch {
        /* ignore */
      }
    }
    setSavedMissed([...new Set([...missed, ...misspelled])]);
    const formats = list.map((row) => `${row.q.factId}:${coloniesItemFormat(row.q)}`);
    const score = list.filter((row) => row.firstTry).length;
    const minutes = Math.round((Date.now() - startedAt.current) / 60000);
    const payload = coloniesFinishedPayload({
      chapterId,
      mode: modeNow,
      score,
      total: list.length,
      exactSpelling: list.filter((row) => row.firstTry && row.exact).length,
      byLesson,
      missed,
      misspelled,
      formats,
      minutes,
    });
    logPractice(chapterId, "finished", payloadFits(payload) ? payload : { ...payload, formats: undefined });
    setPhase("results");
  }, [chapterId, lessons]);

  const start = useCallback(async (nextMode: "full" | "retry" | "review", factIds?: string[]) => {
    setPhase("loading");
    setError("");
    setMode(nextMode);
    try {
      const res = await fetch("/api/engine/practice-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt: { chapterId, factIds: nextMode === "retry" ? factIds : undefined, review: nextMode === "review" ? true : undefined } }),
      });
      const json = (await res.json()) as { questions?: StudentQuestion[]; none?: boolean; map?: unknown };
      if (res.ok && json.none) {
        setCaughtUp(true);
        setPhase("intro");
        return;
      }
      if (!res.ok || !json.questions?.length) throw new Error("load");
      setQueue(json.questions);
      setMap(isQuizMap(json.map) ? json.map : null);
      setIdx(0);
      setOutcomes({});
      requeued.current = new Set();
      startedAt.current = Date.now();
      setPhase("test");
      logPractice(chapterId, "started", { mode: nextMode, questions: json.questions.length });
    } catch {
      setError("Hmm, the test didn't load. Tap to try again.");
      setPhase("intro");
    }
  }, [chapterId]);

  function finishLearn() {
    try {
      window.localStorage.setItem(learnedKey(chapterId), "1");
    } catch {
      /* ignore */
    }
    logPractice(chapterId, "learn_done", {});
    void start("full");
  }

  function commit(rows: Outcome[], nextIndex: number, queueNow: StudentQuestion[]) {
    const next = { ...outcomes };
    for (const row of rows) {
      const prior = next[row.q.factId];
      if (prior) next[row.q.factId] = { ...prior, misses: prior.misses + row.misses };
      else {
        next[row.q.factId] = row;
        logPractice(chapterId, "answered", { item: row.q.factId, format: coloniesItemFormat(row.q), correct: row.firstTry });
        if (row.revealed) logPractice(chapterId, "revealed", { item: row.q.factId, misses: row.misses });
      }
    }
    setOutcomes(next);
    if (nextIndex < queueNow.length) setIdx(nextIndex);
    else finish(next, mode);
  }

  function onOne(row: Outcome, again: boolean, nextIndex: number) {
    let queueNow = queue;
    if (again && !requeued.current.has(row.q.factId)) {
      requeued.current.add(row.q.factId);
      queueNow = [...queue, row.q];
      setQueue(queueNow);
    }
    commit([row], nextIndex, queueNow);
  }

  if (phase === "intro" && startMode === "review") {
    return (
      <div className="card">
        <h2>Quick review</h2>
        {caughtUp ? (
          <>
            <p>You&apos;re all caught up on this one. Nice work! These questions will come back in a few days.</p>
            <p><a className="btn" href="/study">Back to Today</a></p>
          </>
        ) : (
          <>
            <p>Your test is done, but your brain keeps learning! Here are a few questions from it to keep it fresh.</p>
            {error ? <p role="alert">{error}</p> : null}
            <p><button type="button" className="btn" onClick={() => void start("review")}>🧠 Start the quick review</button></p>
          </>
        )}
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="card">
        <h2>{intro?.heading ?? "Get ready for your test"}</h2>
        <p>{intro?.body}</p>
        <p className="kid-kicker">{bankSize} practice questions in the bank. Each test mixes them up.</p>
        {error ? <p role="alert">{error}</p> : null}
        <p>
          <button type="button" className="btn" onClick={() => setPhase("learn")}>📖 Learn it first</button>{" "}
          {learnedBefore ? <button type="button" className="btn secondary" onClick={() => void start("full")}>📝 Take the full practice test</button> : null}{" "}
          {savedMissed.length ? <button type="button" className="btn secondary" onClick={() => void start("retry", savedMissed)}>🔁 Retry the ones I missed ({savedMissed.length})</button> : null}
        </p>
      </div>
    );
  }

  if (phase === "learn") {
    const lesson = lessons[lessonIdx];
    if (!lesson) return null;
    return (
      <div className="card">
        <p className="kid-kicker">Learn it · Lesson {lesson.lesson} of {lessons.length}</p>
        <h2>{lesson.title}</h2>
        <ul>
          {lesson.learn.map((item) => <li key={item.term}><strong>{item.term}</strong></li>)}
        </ul>
        <ReadFirst text={lesson.learn.map((item) => item.explain).join(" ")}>
          {(ready) => (
            <p>
              <button
                type="button"
                className="btn"
                disabled={!ready}
                onClick={() => {
                  if (lessonIdx + 1 < lessons.length) setLessonIdx(lessonIdx + 1);
                  else finishLearn();
                }}
              >
                {lessonIdx + 1 < lessons.length ? "Next lesson →" : "Start the practice test →"}
              </button>
            </p>
          )}
        </ReadFirst>
      </div>
    );
  }

  if (phase === "loading") return <div className="card"><p>Getting your test ready…</p></div>;

  if (phase === "test") {
    const step = nextColoniesStep(queue, idx);
    if (!step) return <div className="card"><p>Getting your test ready…</p></div>;
    const lessonTitle = lessons.find((lesson) => lesson.lesson === (step.kind === "board" ? step.items[0] : step.item)?.lesson)?.title ?? "";
    const lessonNumber = (step.kind === "board" ? step.items[0] : step.item)?.lesson;
    return (
      <div>
        <p className="kid-kicker">Lesson {lessonNumber}: {lessonTitle} · Question {idx + 1} of {queue.length}</p>
        {step.kind === "board" ? (
          <SortBoard
            key={`board:${idx}`}
            questions={step.items}
            prompt={sortPrompt}
            onDone={(rows) => commit(rows, step.nextIndex, queue)}
          />
        ) : (
          <OneQuestion
            key={`${step.item.qid}:${idx}`}
            q={step.item}
            map={map}
            onDone={(row, again) => onOne(row, again, step.nextIndex)}
            speak={prefs.speak}
            soundOn={prefs.soundOn}
          />
        )}
      </div>
    );
  }

  const list = Object.values(outcomes);
  const right = list.filter((row) => row.firstTry).length;
  const missed = list.filter((row) => !row.firstTry);
  const misspelled = list.filter((row) => row.firstTry && !row.exact);
  return (
    <div className="card" role="status">
      <h2>{mode === "review" ? "Review done!" : mode === "retry" ? "Retry done!" : "Practice test done!"}</h2>
      <p><strong>{right} of {list.length}</strong> right on the first try.</p>
      <table className="pt-table">
        <tbody>
          {lessons.map((lesson) => {
            const rows = list.filter((row) => row.q.lesson === lesson.lesson);
            if (!rows.length) return null;
            return (
              <tr key={lesson.lesson}>
                <td>Lesson {lesson.lesson}: {lesson.title}</td>
                <td>{rows.filter((row) => row.firstTry).length} / {rows.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {missed.length ? (
        <>
          <h3>Let&apos;s look at the ones you missed</h3>
          <ul>
            {missed.map((row) => (
              <li key={row.q.factId}>{row.q.text.replace(/___/g, "_____")} <br /><strong>Answer: {answerLabel(row)}</strong></li>
            ))}
          </ul>
        </>
      ) : null}
      {misspelled.length ? (
        <>
          <h3>Right, but check the spelling</h3>
          <ul>
            {misspelled.map((row) => (
              <li key={row.q.factId}>You typed &ldquo;{row.typed.join(", ")}&rdquo;. It&apos;s spelled <strong>{answerLabel(row)}</strong>.</li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        {missed.length || misspelled.length ? (
          <button type="button" className="btn" onClick={() => void start("retry", [...new Set([...missed, ...misspelled].map((row) => row.q.factId))])}>🔁 Retry missed</button>
        ) : null}{" "}
        <button type="button" className="btn secondary" onClick={() => void start("full")}>📝 New full practice test</button>{" "}
        <a className="btn secondary" href="/study">Back to Today</a>
      </p>
    </div>
  );
}

function SortBoard({ questions, prompt, onDone }: { questions: StudentQuestion[]; prompt: string; onDone: (rows: Outcome[]) => void }) {
  const prefs = useKidPrefs();
  const regions = questions[0]?.choices ?? [];
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState("");
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<StuckHelp | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [readyToNext, setReadyToNext] = useState(false);
  const first = useRef<Record<string, boolean> | null>(null);
  const leftover = questions.filter((q) => q.factId && !placed[q.factId]);

  function place(factId: string, region: string) {
    if (readyToNext) return;
    setPlaced((prev) => ({ ...prev, [factId]: region }));
    setPicked("");
    setWrong(new Set());
    setMessage("");
  }

  async function check() {
    try {
      const results = await Promise.all(questions.map((q) => gradeRemote(q.qid, placed[q.factId] ?? "", misses)));
      if (!first.current) first.current = Object.fromEntries(questions.map((q, i) => [q.factId, Boolean(results[i]?.correct)]));
      if (results.every((result) => result.correct)) {
        setReadyToNext(true);
        setWrong(new Set());
        setHelp(null);
        setMessage("Yes! That's right.");
        prefs.speak("Yes! That's right.");
        playSound("fanfare", prefs.soundOn);
        return;
      }
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      const bad = questions.filter((q, i) => !results[i]?.correct).map((q) => q.factId);
      setWrong(new Set(bad));
      setHelp(results.find((result) => !result.correct)?.help ?? null);
      setMessage(bad.length === 1 ? "Not yet. One card needs a new region." : `Not yet. ${bad.length} cards need a new region.`);
      playSound("wrong", prefs.soundOn);
    } catch {
      setMessage("Hmm, that didn't send. Try again.");
    }
  }

  async function showMe() {
    const fixes = await Promise.all(questions.filter((q) => !first.current?.[q.factId]).map(async (q) => {
      const result = await gradeRemote(q.qid, " ", 4);
      return { id: q.factId, answer: result.help?.reveal?.response };
    }));
    const next = { ...placed };
    for (const fix of fixes) {
      const answer = Array.isArray(fix.answer) ? String(fix.answer[0] ?? "") : "";
      if (answer) next[fix.id] = answer;
    }
    setPlaced(next);
    setRevealed(true);
    setWrong(new Set());
    setHelp(null);
    prefs.speak("Here is where each colony goes.");
  }

  function finishBoard() {
    onDone(questions.map((q) => ({
      q,
      firstTry: Boolean(first.current?.[q.factId]),
      exact: Boolean(first.current?.[q.factId]),
      misses,
      revealed: !first.current?.[q.factId],
      expected: [placed[q.factId] ?? ""],
      typed: [placed[q.factId] ?? ""],
    })));
  }

  return (
    <div className="card">
      <h2>Sort the colonies</h2>
      <ReadFirst text={prompt}>
        {(ready) => (
          <>
            <div className="chips">
              {leftover.map((q) => (
                <button
                  key={q.factId}
                  type="button"
                  className={`tile ${picked === q.factId ? "selected" : ""}`}
                  disabled={!ready || readyToNext}
                  draggable={ready && !readyToNext}
                  onClick={() => setPicked(q.factId)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", q.factId);
                    setPicked(q.factId);
                  }}
                >
                  {q.card}
                </button>
              ))}
            </div>
            <div className="grid cols-3">
              {regions.map((region) => (
                <div
                  key={region}
                  className={`drop ${binClass(region)}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData("text/plain") || picked;
                    if (ready && id) place(id, region);
                  }}
                  onClick={() => {
                    if (ready && picked) place(picked, region);
                  }}
                >
                  <strong>{region}</strong>
                  {questions.filter((q) => placed[q.factId] === region).map((q) => (
                    <p key={q.factId} className={wrong.has(q.factId) ? "misplaced" : ""}>
                      {q.card}{" "}
                      <button type="button" className="btn secondary" onClick={(event) => { event.stopPropagation(); setPlaced((prev) => { const next = { ...prev }; delete next[q.factId]; return next; }); setWrong(new Set()); }}>
                        Move
                      </button>
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <p>
              {!readyToNext ? (
                <button type="button" className="btn" disabled={!ready || leftover.length > 0} onClick={() => void check()}>Check</button>
              ) : (
                <button type="button" className="btn" onClick={finishBoard}>Next →</button>
              )}
            </p>
          </>
        )}
      </ReadFirst>
      {message ? <p role="status">{message}</p> : null}
      {!readyToNext ? <StuckHelpPanel help={help} revealed={revealed} onShowMe={() => void showMe()} onSkip={finishBoard} /> : null}
    </div>
  );
}

function OneQuestion({
  q,
  map,
  onDone,
  speak,
  soundOn,
}: {
  q: StudentQuestion;
  map: QuizMap | null;
  onDone: (row: Outcome, again: boolean) => void;
  speak: (text: string) => void;
  soundOn: boolean;
}) {
  const [value, setValue] = useState("");
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<StuckHelp | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [why, setWhy] = useState("");
  const [correct, setCorrect] = useState(false);
  const [expected, setExpected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const heard = useRef(false);
  const onSpell = useCallback((next: string) => setValue(next), []);
  const text = promptText(q);
  const showMap = q.activity === "map-name" || q.activity === "map-tap" || q.compass;

  useEffect(() => {
    if (q.clip && !heard.current) {
      heard.current = true;
      speak(q.clip);
    }
  }, [q.clip, speak]);

  async function check() {
    setSending(true);
    try {
      const result = await gradeRemote(q.qid, value, misses);
      if (result.correct) {
        setCorrect(true);
        setExpected(result.expected ? [result.expected] : []);
        setWhy(result.why);
        const note = yesLine(q);
        setMessage(note);
        speak(result.why ? `${note} ${result.why}` : note);
        playSound("pair", soundOn);
        return;
      }
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      setHelp(result.help);
      setMessage(result.help ? "" : "Not yet. Read every word again, slowly.");
      playSound("wrong", soundOn);
    } catch {
      setMessage("Hmm, that didn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  function showMe() {
    if (!help?.reveal) return;
    setRevealed(true);
    const response = Array.isArray(help.reveal.response) ? help.reveal.response.map(String) : [];
    setExpected(response);
    if (q.activity === "map-tap" && response[0]) setValue(response[0]);
    speak(`${help.reveal.answer}. ${help.reveal.why}`);
  }

  function done(wasRevealed: boolean) {
    const firstTry = misses === 0 && !wasRevealed && correct;
    onDone({
      q,
      firstTry,
      exact: firstTry,
      misses,
      revealed: wasRevealed,
      expected: expected.length ? expected : [value],
      typed: [value],
    }, wasRevealed || misses >= 4);
  }

  const frame = map ? { viewBox: map.viewBox, oceanX: map.oceanX, compassX: map.compassX, compassY: map.compassY } : null;
  return (
    <div className="card">
      <ReadFirst text={text}>
        {(ready) => (
          <>
            {showMap && frame && map ? (
              <ColoniesMap
                frame={frame}
                shapes={map.shapes}
                highlightId={q.activity === "map-name" ? q.highlightId : q.activity === "map-tap" ? value : null}
                selectedId={q.activity === "map-tap" ? value : null}
                interactive={q.activity === "map-tap" && ready && !correct && !revealed}
                onSelect={setValue}
              />
            ) : null}
            {showMap && !map ? <p role="alert">The map didn&apos;t load. Tap to try the test again.</p> : null}
            {q.activity === "sort" || q.kind === "choice" ? (
              <div role="radiogroup" aria-label="Choices">
                {(q.choices ?? []).map((choice) => (
                  <p key={choice}>
                    <button type="button" role="radio" aria-checked={value === choice} className={value === choice ? "btn" : "btn secondary"} disabled={!ready || correct || revealed} onClick={() => setValue(choice)}>
                      {choice}
                    </button>
                  </p>
                ))}
              </div>
            ) : null}
            {q.activity === "map-name" ? (
              <>
                <p>
                  <input aria-label="Colony name" className="pt-blank" value={value} disabled={!ready || correct || revealed} onChange={(event) => setValue(event.target.value)} style={{ minWidth: 180 }} />
                </p>
                {q.wordBank ? (
                  <p>
                    <span className="kid-kicker">Word bank: </span>
                    {q.wordBank.map((word) => (
                      <button key={word} type="button" className="btn secondary" style={{ margin: 3 }} disabled={!ready || correct || revealed} onClick={() => setValue(word)}>{word}</button>
                    ))}
                  </p>
                ) : null}
              </>
            ) : null}
            {q.activity === "map-tap" ? <p className="kid-kicker">{value ? "Shape picked." : "Tap the colony on the map."}</p> : null}
            {q.activity === "spell" && q.spellFormat ? (
              <ColonySpellBox
                format={q.spellFormat}
                shown={q.shown}
                tiles={q.tiles}
                choices={q.choices}
                disabled={!ready || correct || revealed}
                onValue={onSpell}
                onHear={q.clip ? () => speak(q.clip ?? "") : undefined}
              />
            ) : null}
            <p>
              {!correct && !revealed ? (
                <button type="button" className="btn" disabled={!ready || sending || !value.trim()} onClick={() => void check()}>{sending ? "Checking…" : "Check"}</button>
              ) : (
                <button type="button" className="btn" onClick={() => done(revealed)}>Next →</button>
              )}
            </p>
          </>
        )}
      </ReadFirst>
      {message ? <p role="status">{message}</p> : null}
      {why ? <p className="story-hook">💡 {why}</p> : null}
      {!correct && !revealed ? <StuckHelpPanel help={help} revealed={revealed} onShowMe={showMe} onSkip={() => done(true)} /> : null}
    </div>
  );
}
