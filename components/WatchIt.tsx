"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import type { StudentRecap } from "@/lib/content/recaps";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import type { StuckHelp } from "@/lib/help/ladder";

/** Pause after narration ends before Next unlocks / the slide auto-advances. */
export const WATCH_NEXT_UNLOCK_MS = 1500;

type Phase = { kind: "slides"; index: number } | { kind: "check" } | { kind: "home" };

export type WatchResult = { slidesSeen: number; checkCorrectFirstTry: boolean | null; checkTries: number };

function wordIndexAt(words: string[], charIndex: number): number {
  let walking = 0;
  for (let i = 0; i < words.length; i += 1) {
    walking += words[i].length + 1;
    if (charIndex < walking) return i;
  }
  return words.length - 1;
}

export function WatchIt({
  chapterId,
  recap,
  onDone,
}: {
  chapterId: string;
  recap: StudentRecap;
  onDone: (result: WatchResult) => void;
}) {
  const prefs = useKidPrefs();
  const [phase, setPhase] = useState<Phase>({ kind: "slides", index: 0 });
  const [active, setActive] = useState<number | null>(null);
  const [spoken, setSpoken] = useState(-1);
  const [unlocked, setUnlocked] = useState(false);
  const [maxSeen, setMaxSeen] = useState(0);
  const [tries, setTries] = useState(0);
  const [firstTry, setFirstTry] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // Stuck-help ladder for the quick check (misses = wrong picks so far).
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<StuckHelp | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const timer = useRef<number | null>(null);
  const runId = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const narrate = useCallback(
    (index: number) => {
      const slide = recap.slides[index];
      if (!slide) return;
      clearTimer();
      const id = ++runId.current;
      const words = slide.text.split(/\s+/);
      setUnlocked(false);
      setActive(0);
      setSpoken(-1);
      prefs.speak(slide.text, {
        onboundary: (charIndex) => {
          if (runId.current !== id) return;
          const w = wordIndexAt(words, charIndex);
          setActive(w);
          setSpoken(w - 1);
        },
        onend: () => {
          if (runId.current !== id) return;
          setActive(null);
          setSpoken(words.length);
          timer.current = window.setTimeout(() => {
            if (runId.current !== id) return;
            setUnlocked(true);
            // Auto-advance after the pause, but never past the last slide on its own.
            if (index < recap.slides.length - 1) setPhase({ kind: "slides", index: index + 1 });
          }, WATCH_NEXT_UNLOCK_MS);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recap.slides],
  );

  useEffect(() => {
    if (phase.kind !== "slides") return;
    setMaxSeen((m) => Math.max(m, phase.index + 1));
    narrate(phase.index);
  }, [phase, narrate]);

  useEffect(
    () => () => {
      runId.current += 1;
      clearTimer();
      prefs.stopSpeak();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function go(next: Phase) {
    runId.current += 1;
    clearTimer();
    prefs.stopSpeak();
    setPhase(next);
    if (next.kind === "check") prefs.speak(recap.check.prompt);
  }

  async function pick(choiceId: string) {
    if (checking || feedback?.correct) return;
    setChecking(true);
    setPicked(choiceId);
    try {
      const res = await fetch("/api/engine/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchCheck: { chapterId, choiceId, misses } }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { correct: boolean; feedback: string; help?: StuckHelp | null };
      setTries((t) => t + 1);
      if (!json.correct) {
        setMisses((n) => n + 1);
        if (json.help) {
          setHelp(json.help);
          logHelp(json.help.stage === "show_me" ? "show_me_offered" : "hint_shown");
        }
      }
      if (firstTry === null) setFirstTry(json.correct);
      setFeedback({ correct: json.correct, text: json.feedback });
      prefs.speak(json.feedback);
    } catch {
      setFeedback({ correct: false, text: "We couldn't check that. Try again." });
    } finally {
      setChecking(false);
    }
  }

  function logHelp(detail: string) {
    void fetch("/api/engine/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [{ type: "hint_requested", activityId: chapterId, clientTs: Date.now(), payload: { source: "watch_check", detail, level: detail === "revealed" ? 3 : 2, misses: misses + 1 } }],
      }),
    }).catch(() => {});
  }

  function showMe() {
    setRevealed(true);
    setFeedback(null);
    setPicked(null);
    logHelp("revealed");
    if (help?.reveal) prefs.speak(`${help.reveal.answer} ${help.reveal.why}`);
  }

  const ruledOut = (id: string) => Boolean(help && !feedback?.correct && help.removeChoices?.includes(id));

  if (phase.kind === "slides") {
    const slide = recap.slides[phase.index];
    const words = slide.text.split(/\s+/);
    const last = phase.index === recap.slides.length - 1;
    return (
      <div className="watch-it" data-testid="watch-it">
        <div className="watch-top">
          <p className="kid-kicker">
            Watch it · {phase.index + 1} of {recap.slides.length}
          </p>
          <VoicePicker />
        </div>
        <img className="watch-img" src={slide.image} alt={slide.alt} width={800} height={600} />
        <p className="watch-caption" aria-live="polite">
          {words.map((w, i) => (
            <span key={i} className={i === active ? "watch-word active" : i <= spoken ? "watch-word said" : "watch-word"}>
              {w}{" "}
            </span>
          ))}
        </p>
        <div className="watch-controls">
          <button className="btn secondary big" disabled={phase.index === 0} onClick={() => go({ kind: "slides", index: phase.index - 1 })}>
            ◀ Back
          </button>
          <button className="btn secondary big" onClick={() => narrate(phase.index)}>
            🔁 Replay
          </button>
          <button
            className="btn big"
            disabled={!unlocked && phase.index + 1 >= maxSeen}
            onClick={() => go(last ? { kind: "check" } : { kind: "slides", index: phase.index + 1 })}
          >
            {last ? "Quick check ▶" : "Next ▶"}
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === "check") {
    return (
      <div className="watch-it" data-testid="watch-check">
        <p className="kid-kicker">Quick check</p>
        <h3 className="watch-prompt">{recap.check.prompt}</h3>
        <button className="btn secondary" onClick={() => prefs.speak(recap.check.prompt)}>
          🔊 Hear it
        </button>
        <div className="watch-choices">
          {recap.check.choices.map((c) => (
            <button
              key={c.id}
              className={`watch-choice${picked === c.id && feedback ? (feedback.correct ? " right" : " wrong") : ""}${ruledOut(c.id) ? " ruled-out" : ""}`}
              onClick={() => pick(c.id)}
              disabled={checking || Boolean(feedback?.correct) || ruledOut(c.id)}
              aria-label={c.alt}
            >
              <img src={c.image} alt={c.alt} width={400} height={300} />
            </button>
          ))}
        </div>
        {feedback ? (
          <p role="status" className={feedback.correct ? "notice success" : "notice"}>
            {feedback.text}
          </p>
        ) : null}
        {feedback?.correct ? null : (
          <StuckHelpPanel
            help={help}
            revealed={revealed}
            onShowMe={showMe}
            onSkip={() => {
              setSkipped(true);
              logHelp("skipped");
              go({ kind: "home" });
            }}
          />
        )}
        <div className="watch-controls">
          <button className="btn secondary big" onClick={() => go({ kind: "slides", index: 0 })}>
            🔁 Watch again
          </button>
          <button className="btn big" disabled={!feedback?.correct && !skipped} onClick={() => go({ kind: "home" })}>
            Next ▶
          </button>
        </div>
      </div>
    );
  }

  const home = recap.tryAtHome;
  return (
    <div className="watch-it try-home" data-testid="try-at-home">
      <p className="kid-kicker">Try it at home (with a grown-up)</p>
      <h3>🏠 {home.title}</h3>
      <p>
        <strong>You need:</strong> {home.materials.join(", ")}
      </p>
      <ol>
        {home.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="notice">⚠️ {home.safety}</p>
      <button className="btn big" onClick={() => onDone({ slidesSeen: maxSeen, checkCorrectFirstTry: firstTry, checkTries: tries })}>
        Start reading ▶
      </button>
    </div>
  );
}
