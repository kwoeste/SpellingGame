"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CarefulRead } from "@/components/CarefulRead";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { Mascot } from "@/components/ui/Mascot";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { playSound } from "@/lib/ui/sounds";
import { answerUnlockMs } from "@/lib/ui/careful-read";
import type { StudentChapter, StudentStep } from "@/lib/content/student";

type Progress = {
  chapterId: string;
  readDone: boolean;
  nextStep: number;
  totalSteps: number;
  starEarned: boolean;
  lastTry: "passed" | "not_yet" | null;
};

type Feedback = {
  correct: boolean;
  explanation: string;
  proving_sentence_id?: string;
  read_aloud_text: string;
  session_id: string | null;
  preview: boolean;
  chapter: Progress | null;
  gate: { passed: boolean; correct: number; total: number; needPct: number } | null;
};

type View =
  | { kind: "loading" }
  | { kind: "read" }
  | { kind: "step"; index: number }
  | { kind: "done"; gate: Feedback["gate"] };

const HEARTBEAT_MS = 30_000;
const ACTIVE_WINDOW_MS = 45_000;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function viewFor(progress: Progress | null, steps: number): View {
  if (!progress || !progress.readDone) return { kind: "read" };
  return progress.nextStep >= steps ? { kind: "read" } : { kind: "step", index: progress.nextStep };
}

export function ChapterPlayer({
  chapter,
  isAdmin,
  nextChapterHref,
}: {
  chapter: StudentChapter;
  isAdmin: boolean;
  nextChapterHref: string | null;
}) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [error, setError] = useState("");
  const [readReady, setReadReady] = useState(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    postJson<{ session_id: string | null; preview: boolean; chapter: Progress | null }>("/api/engine/session/start", {
      entry: "study",
      chapterId: chapter.id,
    })
      .then((json) => {
        if (cancelled) return;
        setSessionId(json.session_id);
        setPreview(json.preview);
        setProgress(json.chapter);
        setWelcomeBack(Boolean(json.chapter && (json.chapter.readDone || json.chapter.nextStep > 0)));
        setView(viewFor(json.chapter, chapter.steps.length));
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn't load your place. Check the internet and refresh.");
        setView({ kind: "read" });
      });
    return () => {
      cancelled = true;
    };
  }, [chapter.id, chapter.steps.length]);

  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", mark);
    window.addEventListener("keydown", mark);
    const timer = window.setInterval(() => {
      const engaged = document.visibilityState === "visible" && Date.now() - lastActivity.current < ACTIVE_WINDOW_MS;
      if (!engaged || preview) return;
      void postJson("/api/engine/events", {
        sessionId,
        events: [{ id: crypto.randomUUID(), type: "heartbeat", clientTs: Date.now(), payload: { visible: true } }],
      }).catch(() => undefined);
    }, HEARTBEAT_MS);
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      window.clearInterval(timer);
    };
  }, [sessionId, preview]);

  async function finishReading() {
    setError("");
    if (!preview) {
      try {
        const json = await postJson<{ session_id: string | null }>("/api/engine/events", {
          sessionId,
          events: [{ id: crypto.randomUUID(), type: "read_done", activityId: chapter.id, clientTs: Date.now() }],
        });
        if (json.session_id) setSessionId(json.session_id);
      } catch {
        setError("We couldn't save that. Check the internet and try again.");
        return;
      }
    }
    const next = progress && progress.nextStep < chapter.steps.length ? progress.nextStep : 0;
    setView({ kind: "step", index: next });
  }

  const onAnswered = useCallback((feedback: Feedback) => {
    if (feedback.session_id) setSessionId(feedback.session_id);
    if (feedback.chapter) setProgress(feedback.chapter);
  }, []);

  function advance(feedback: Feedback, current: number) {
    if (feedback.gate) {
      setView({ kind: "done", gate: feedback.gate });
      return;
    }
    const next = feedback.chapter ? feedback.chapter.nextStep : current + 1;
    setView(next >= chapter.steps.length ? { kind: "done", gate: null } : { kind: "step", index: next });
  }

  return (
    <div className="card">
      {preview ? <p className="notice">Preview: answers are checked but not saved.</p> : null}
      {isAdmin && chapter.pendingReligionReview ? (
        <p className="notice">
          Religion content is pending review and hidden from Mae. Bible translation: {chapter.bibleTranslation ?? "NABRE"} (set with BIBLE_TRANSLATION).
        </p>
      ) : null}
      {progress?.starEarned ? <p aria-label="Star earned">⭐ You earned the star for this chapter.</p> : null}
      {welcomeBack && view.kind !== "done" ? <p className="notice">Welcome back! Picking up where you left off.</p> : null}
      <p className="kid-kicker">{chapter.bigQuestion}</p>
      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : null}

      {view.kind === "loading" ? <p>Loading…</p> : null}
      {view.kind === "read" ? (
        <>
          <CarefulRead sentences={chapter.sentences} onReady={setReadReady} />
          <button className="btn" onClick={finishReading} disabled={!readReady} style={{ marginTop: 12 }}>
            I read it — next
          </button>
        </>
      ) : null}
      {view.kind === "step" && chapter.steps[view.index] ? (
        <StepView
          key={chapter.steps[view.index].itemId}
          step={chapter.steps[view.index]}
          number={view.index + 1}
          total={chapter.steps.length}
          chapter={chapter}
          sessionId={sessionId}
          onAnswered={onAnswered}
          onNext={(feedback) => advance(feedback, view.index)}
        />
      ) : null}
      {view.kind === "done" ? (
        <DoneView
          gate={view.gate}
          onAgain={() => {
            setWelcomeBack(false);
            setReadReady(false);
            setView({ kind: "read" });
          }}
          nextChapterHref={nextChapterHref}
        />
      ) : null}
    </div>
  );
}

function DoneView({
  gate,
  onAgain,
  nextChapterHref,
}: {
  gate: Feedback["gate"];
  onAgain: () => void;
  nextChapterHref: string | null;
}) {
  if (gate?.passed) {
    return (
      <div role="status" className="feedback-card">
        <Mascot mood="cheer" size={96} />
        <h3>⭐ Star earned!</h3>
        <p>
          You got {gate.correct} of {gate.total} right on the first try. Great place to stop, or pick another chapter.
        </p>
        <ConfettiLayer fire />
        <div className="chips" style={{ marginTop: 16, justifyContent: "center" }}>
          <a href="/study" className="btn secondary">
            Back to Study
          </a>
          {nextChapterHref ? (
            <a href={nextChapterHref} className="btn">
              Next chapter
            </a>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div role="status">
      <Mascot mood="think" size={80} />
      <h3>Nice work finishing!</h3>
      {gate ? (
        <p>
          You got {gate.correct} of {gate.total} right on the first try. A star needs {gate.needPct}%. Want to go again?
        </p>
      ) : (
        <p>You finished this chapter.</p>
      )}
      <div className="chips" style={{ marginTop: 16, justifyContent: "center" }}>
        <a href="/study" className="btn secondary">
          Back to Study
        </a>
        <button className="btn" onClick={onAgain}>
          Go again
        </button>
        {nextChapterHref ? (
          <a href={nextChapterHref} className="btn">
            Next chapter
          </a>
        ) : null}
      </div>
    </div>
  );
}

type StepProps = {
  step: StudentStep;
  number: number;
  total: number;
  chapter: StudentChapter;
  sessionId: string | null;
  onAnswered: (feedback: Feedback) => void;
  onNext: (feedback: Feedback) => void;
};

function StepView({ step, number, total, chapter, sessionId, onAnswered, onNext }: StepProps) {
  const prefs = useKidPrefs();
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [choice, setChoice] = useState("");
  const [evidence, setEvidence] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    const words = step.prompt.split(/\s+/).length;
    const totalMs = answerUnlockMs(words);
    const totalSeconds = Math.ceil(totalMs / 1000);
    setCountdown(totalSeconds);
    setUnlocked(false);

    const countdownInterval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const unlockTimer = window.setTimeout(() => setUnlocked(true), totalMs);
    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(unlockTimer);
    };
  }, [step.prompt, attempt]);

  function response(): unknown {
    switch (step.kind) {
      case "vocab":
        return matches;
      case "order":
        return order;
      case "proof":
        return step.needsEvidence ? { choice, evidence } : { choice };
      default: {
        const unreachable: never = step;
        throw new Error(`Unhandled step ${String(unreachable)}`);
      }
    }
  }

  function ready(): boolean {
    switch (step.kind) {
      case "vocab":
        return step.words.every((word) => matches[word]);
      case "order":
        return order.length === step.cards.length;
      case "proof":
        return Boolean(choice) && (!step.needsEvidence || Boolean(evidence));
      default: {
        const unreachable: never = step;
        throw new Error(`Unhandled step ${String(unreachable)}`);
      }
    }
  }

  async function check() {
    setSending(true);
    setError("");
    try {
      const json = await postJson<{ feedback: Feedback }>("/api/engine/events", {
        submit: {
          sessionId,
          itemId: step.itemId,
          response: response(),
          hintLevel: 0,
          latencyMs: Date.now() - shownAt.current,
          eventId: crypto.randomUUID(),
        },
      });
      setFeedback(json.feedback);
      onAnswered(json.feedback);
      playSound(json.feedback.correct ? "correct" : "wrong", prefs.soundOn);
      if (json.feedback.correct) prefs.speak(json.feedback.read_aloud_text);
    } catch {
      setError("We couldn't check that. Check the internet and try again.");
    } finally {
      setSending(false);
    }
  }

  function tryAgain() {
    setFeedback(null);
    setOrder([]);
    setChoice("");
    setEvidence("");
    setMatches({});
    shownAt.current = Date.now();
    setUnlocked(false);
    // The effect above restarts the countdown and cleans up its timers.
    setAttempt((n) => n + 1);
  }

  const locked = Boolean(feedback) || !unlocked;

  return (
    <div>
      <p className="kid-kicker">
        Step {number} of {total}
      </p>
      <h3>{step.prompt}</h3>
      {!unlocked ? (
        <p className="notice">
          Read the question first. Answers unlock in {countdown} second{countdown !== 1 ? "s" : ""}.
        </p>
      ) : null}

      {step.kind === "vocab" ? (
        <MatchPairs
          words={step.words}
          definitions={step.definitions}
          matches={matches}
          locked={locked}
          onChange={setMatches}
        />
      ) : null}

      {step.kind === "order" ? (
        <OrderCards cards={step.cards} order={order} locked={locked} onChange={setOrder} />
      ) : null}

      {step.kind === "proof" ? (
        <>
          <div className="grid" role="group" aria-label="Answer choices">
            {step.options.map((option) => (
              <button
                key={option}
                className={`choice-btn ${choice === option ? "selected" : ""} ${locked && !feedback ? "locked" : ""}`}
                aria-pressed={choice === option}
                disabled={locked}
                onClick={() => {
                  playSound("tap", prefs.soundOn);
                  setChoice(option);
                }}
              >
                {option}
              </button>
            ))}
          </div>
          {step.needsEvidence ? (
            <>
              <p>Tap the sentence that proves your answer.</p>
              <div role="group" aria-label="Sentences">
                {chapter.sentences.map((sentence) => (
                  <button
                    key={sentence.id}
                    className={`choice-btn ${evidence === sentence.id ? "selected" : ""} ${feedback && !feedback.correct && feedback.proving_sentence_id === sentence.id ? "proving" : ""}`}
                    aria-pressed={evidence === sentence.id}
                    disabled={locked}
                    onClick={() => setEvidence(sentence.id)}
                  >
                    {sentence.text}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : null}

      {!feedback ? (
        <button className="btn" onClick={check} disabled={!ready() || sending || !unlocked} style={{ marginTop: 12 }}>
          {sending ? "Checking…" : "Check"}
        </button>
      ) : (
        <div role="status" aria-live="polite" className={`feedback-card ${feedback.correct ? "" : "miss"}`}>
          {feedback.correct ? <ConfettiLayer fire /> : null}
          <p>
            <strong>{feedback.correct ? "Yes!" : "Not yet."}</strong> {feedback.explanation}
          </p>
          <VoicePicker compact />
          <button className="btn secondary" onClick={() => prefs.speak(feedback.read_aloud_text)}>
            Hear it
          </button>{" "}
          {feedback.correct ? (
            <button className="btn" onClick={() => onNext(feedback)}>
              Next
            </button>
          ) : (
            <button className="btn" onClick={tryAgain}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const PAIR_COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#a855f7", "#eab308", "#ef4444"];

export function pairWord(matches: Record<string, string>, word: string, definition: string): Record<string, string> {
  const next = { ...matches };
  if (next[word] === definition) {
    delete next[word];
    return next;
  }
  for (const [other, def] of Object.entries(next)) {
    if (def === definition) delete next[other];
  }
  next[word] = definition;
  return next;
}

function MatchPairs({
  words,
  definitions,
  matches,
  locked,
  onChange,
}: {
  words: string[];
  definitions: string[];
  matches: Record<string, string>;
  locked: boolean;
  onChange: (next: Record<string, string>) => void;
}) {
  const { soundOn } = useKidPrefs();
  const [picked, setPicked] = useState<string>("");
  const colorFor = (word: string) => {
    const idx = words.indexOf(word);
    return PAIR_COLORS[idx % PAIR_COLORS.length];
  };

  function chooseWord(word: string) {
    if (locked) return;
    if (matches[word]) {
      const next = { ...matches };
      delete next[word];
      onChange(next);
      setPicked("");
      return;
    }
    setPicked(word);
    playSound("tap", soundOn);
  }

  function chooseDefinition(definition: string) {
    if (locked || !picked) return;
    playSound("pair", soundOn);
    onChange(pairWord(matches, picked, definition));
    setPicked("");
  }

  return (
    <div>
      <p>Tap a word, then tap its meaning.</p>
      <div className="pair-board">
        <div className="grid">
          {words.map((word) => (
            <button
              key={word}
              type="button"
              className={`pair-card ${picked === word ? "picked" : ""} ${matches[word] ? "paired" : ""}`}
              style={matches[word] ? { borderColor: colorFor(word) } : undefined}
              disabled={locked}
              onClick={() => chooseWord(word)}
            >
              {word}
            </button>
          ))}
        </div>
        <div className="grid">
          {definitions.map((definition) => {
            const owner = Object.entries(matches).find(([, def]) => def === definition)?.[0];
            return (
              <button
                key={definition}
                type="button"
                className={`pair-card ${owner ? "paired" : ""}`}
                style={owner ? { borderColor: colorFor(owner) } : undefined}
                disabled={locked}
                onClick={() => chooseDefinition(definition)}
              >
                {definition}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderCards({
  cards,
  order,
  locked,
  onChange,
}: {
  cards: { id: string; label: string }[];
  order: string[];
  locked: boolean;
  onChange: (next: string[]) => void;
}) {
  const leftover = cards.filter((card) => !order.includes(card.id));
  return (
    <>
      <p>Tap the cards in order.</p>
      <div className="chips">
        {leftover.map((card) => (
          <button key={card.id} className="tile" disabled={locked} onClick={() => onChange([...order, card.id])}>
            {card.label}
          </button>
        ))}
      </div>
      <ol>
        {order.map((id) => (
          <li key={id}>{cards.find((card) => card.id === id)?.label}</li>
        ))}
      </ol>
      {order.length && !locked ? (
        <button className="btn secondary" onClick={() => onChange([])}>
          Start over
        </button>
      ) : null}
    </>
  );
}
