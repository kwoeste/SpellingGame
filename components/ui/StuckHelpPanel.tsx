"use client";

import { useEffect, useState } from "react";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { SHOW_ME_PAUSE_MS, STUCK_COPY, type StuckHelp } from "@/lib/help/ladder";

/**
 * The visible part of the stuck-help ladder. Nothing renders before HINT_AT_MISS (help is null).
 * Hint stage: one kind clue. Show-me stage: a big Show me button that unlocks after a short pause,
 * with "Skip for now" beside it. After Show me: the answer plus a one-line why.
 */
export function StuckHelpPanel({
  help,
  revealed,
  onShowMe,
  onSkip,
  skipLabel = STUCK_COPY.skip,
}: {
  help: StuckHelp | null | undefined;
  revealed: boolean;
  onShowMe: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const prefs = useKidPrefs();
  const showMe = help?.stage === "show_me";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (!showMe) return;
    const t = window.setTimeout(() => setReady(true), SHOW_ME_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [showMe, help?.hint]);

  if (!help) return null;

  if (revealed && help.reveal) {
    const text = `${help.reveal.answer} ${help.reveal.why}`;
    return (
      <div className="stuck-help revealed" role="status" aria-live="polite" data-testid="stuck-reveal">
        <p>
          <strong>{help.reveal.answer}</strong>
        </p>
        <p>Why: {help.reveal.why}</p>
        <p className="kid-kicker">{STUCK_COPY.afterReveal}</p>
        <button className="btn secondary" onClick={() => prefs.speak(text)}>
          🔊 Hear it
        </button>
      </div>
    );
  }

  return (
    <div className="stuck-help" role="status" aria-live="polite" data-testid={showMe ? "stuck-show-me" : "stuck-hint"}>
      <p>
        <strong>💡 {STUCK_COPY.hintLead}</strong> {help.hint}
      </p>
      <button className="btn secondary" onClick={() => prefs.speak(help.hint)}>
        🔊 Hear the clue
      </button>
      {showMe ? (
        <>
          <p>{STUCK_COPY.showMeLead}</p>
          <button className="btn big show-me" disabled={!ready} onClick={onShowMe}>
            {ready ? `👀 ${STUCK_COPY.showMe}` : "Get ready…"}
          </button>{" "}
          {onSkip && ready ? (
            <button className="btn secondary" onClick={onSkip}>
              {skipLabel}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
