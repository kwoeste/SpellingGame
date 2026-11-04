import { READ_ALOUD, registerPlayer } from "@/lib/media/onePlayer";

export type NarratorSpeak = (text: string, opts: { onend?: () => void; onboundary?: (charIndex: number) => void }) => void;

export type NarratorDeps = {
  speak: NarratorSpeak;
  stopSpeak: () => void;
  unlockMs: number;
  slideCount: () => number;
  onBoundary: (charIndex: number) => void;
  onEnd: () => void;
  /** Narration finished + pause elapsed: unlock Next and (unless last) advance. */
  onUnlock: (index: number) => void;
  onPausedChange: (paused: boolean) => void;
  setTimeout?: (fn: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
};

/**
 * Drives the Watch-it slideshow narration. Registers with onePlayer so that when a video or other
 * audio starts, narration stops AND the auto-advance timer is cancelled, leaving a paused state.
 */
export function createNarrator(deps: NarratorDeps) {
  const setT = deps.setTimeout ?? ((fn, ms) => window.setTimeout(fn, ms));
  const clearT = deps.clearTimeout ?? ((id) => window.clearTimeout(id));
  let runId = 0;
  let timer: number | null = null;
  let current = -1;
  let paused = false;
  const clearTimer = () => {
    if (timer !== null) clearT(timer);
    timer = null;
  };
  const setPaused = (p: boolean) => {
    if (paused === p) return;
    paused = p;
    deps.onPausedChange(p);
  };

  function narrate(index: number, text: string) {
    clearTimer();
    setPaused(false);
    current = index;
    const id = ++runId;
    deps.speak(text, {
      onboundary: (c) => {
        if (runId === id) deps.onBoundary(c);
      },
      onend: () => {
        if (runId !== id) return;
        deps.onEnd();
        timer = setT(() => {
          timer = null;
          if (runId !== id) return;
          deps.onUnlock(index);
        }, deps.unlockMs);
      },
    });
  }

  /** Stop without showing paused (navigation, unmount). */
  function cancel() {
    runId += 1;
    current = -1;
    clearTimer();
    setPaused(false);
    deps.stopSpeak();
  }

  /** Another player took over: stop talking, stop advancing, show paused. */
  function pauseForOther() {
    if (current < 0 || paused) return;
    runId += 1;
    clearTimer();
    deps.stopSpeak();
    setPaused(true);
  }

  const unregister = registerPlayer(pauseForOther, READ_ALOUD);

  return {
    narrate,
    cancel,
    pauseForOther,
    isPaused: () => paused,
    hasPendingAdvance: () => timer !== null,
    dispose() {
      cancel();
      unregister();
    },
  };
}
