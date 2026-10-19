"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReadAloud } from "@/components/ReadAloud";
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

function say(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function viewFor(progress: Progress | null, steps: number): View {
  if (!progress || !progress.readDone) return { kind: "read" };
  return progress.nextStep >= steps ? { kind: "read" } : { kind: "step", index: progress.nextStep };
}

export function ChapterPlayer({ chapter, isAdmin }: { chapter: StudentChapter; isAdmin: boolean }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [error, setError] = useState("");
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

  const onAnswered = useCallback(
    (feedback: Feedback) => {
      if (feedback.session_id) setSessionId(feedback.session_id);
      if (feedback.chapter) setProgress(feedback.chapter);
    },
    [],
  );

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
      <p style={{ color: "var(--soft)" }}>{chapter.bigQuestion}</p>
      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : null}

      {view.kind === "loading" ? <p>Loading…</p> : null}
      {view.kind === "read" ? (
        <>
          <ReadAloud sentences={chapter.sentences} />
          <button className="btn" onClick={finishReading}>
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
            setView({ kind: "read" });
          }}
        />
      ) : null}
    </div>
  );
}

function DoneView({ gate, onAgain }: { gate: Feedback["gate"]; onAgain: () => void }) {
  if (gate?.passed) {
    return (
      <div role="status">
        <h3>⭐ Star earned!</h3>
        <p>
          You got {gate.correct} of {gate.total} right on the first try. Great place to stop, or pick another chapter.
        </p>
      </div>
    );
  }
  return (
    <div role="status">
      <h3>Nice work finishing!</h3>
      {gate ? (
        <p>
          You got {gate.correct} of {gate.total} right on the first try. A star needs {gate.needPct}%. Want to go again?
        </p>
      ) : (
        <p>You finished this chapter.</p>
      )}
      <button className="btn" onClick={onAgain}>
        Go again
      </button>
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
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [choice, setChoice] = useState("");
  const [evidence, setEvidence] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const shownAt = useRef(Date.now());

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
    shownAt.current = Date.now();
  }

  const locked = Boolean(feedback);

  return (
    <div>
      <p style={{ color: "var(--soft)" }}>
        Step {number} of {total}
      </p>
      <h3>{step.prompt}</h3>

      {step.kind === "vocab"
        ? step.words.map((word) => (
            <p key={word}>
              <label>
                <strong>{word}</strong>{" "}
                <select
                  value={matches[word] ?? ""}
                  disabled={locked}
                  onChange={(e) => setMatches((prev) => ({ ...prev, [word]: e.target.value }))}
                >
                  <option value="">Choose meaning</option>
                  {step.definitions.map((definition) => (
                    <option key={definition} value={definition}>
                      {definition}
                    </option>
                  ))}
                </select>
              </label>
            </p>
          ))
        : null}

      {step.kind === "order" ? (
        <>
          <div className="chips">
            {step.cards
              .filter((card) => !order.includes(card.id))
              .map((card) => (
                <button key={card.id} className="tile" disabled={locked} onClick={() => setOrder((prev) => [...prev, card.id])}>
                  {card.label}
                </button>
              ))}
          </div>
          <ol>
            {order.map((id) => (
              <li key={id}>{step.cards.find((card) => card.id === id)?.label}</li>
            ))}
          </ol>
          {order.length && !locked ? (
            <button className="btn secondary" onClick={() => setOrder([])}>
              Start over
            </button>
          ) : null}
        </>
      ) : null}

      {step.kind === "proof" ? (
        <>
          <div className="grid" role="group" aria-label="Answer choices">
            {step.options.map((option) => (
              <button
                key={option}
                className={`option ${choice === option ? "selected" : ""}`}
                aria-pressed={choice === option}
                disabled={locked}
                onClick={() => setChoice(option)}
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
                    className={`option ${evidence === sentence.id ? "selected" : ""} ${feedback && !feedback.correct && feedback.proving_sentence_id === sentence.id ? "proving" : ""}`}
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
        <button className="btn" onClick={check} disabled={!ready() || sending} style={{ marginTop: 12 }}>
          {sending ? "Checking…" : "Check"}
        </button>
      ) : (
        <div role="status" aria-live="polite" style={{ marginTop: 12 }}>
          <p>
            <strong>{feedback.correct ? "Yes!" : "Not yet."}</strong> {feedback.explanation}
          </p>
          <button className="btn secondary" onClick={() => say(feedback.read_aloud_text)}>
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
