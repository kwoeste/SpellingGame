/**
 * "One player at a time": starting any audio/video source pauses every other one on the page,
 * so the read-aloud (Grok TTS / browser voice) never talks over a recap video and vice versa.
 */
type Stopper = { el?: HTMLMediaElement; stop: () => void };

const players = new Set<Stopper>();

/** Register an off-DOM player (e.g. the shared TTS Audio element). Returns an unregister fn. */
export function registerPlayer(stop: () => void, el?: HTMLMediaElement): () => void {
  const entry: Stopper = { el, stop };
  players.add(entry);
  return () => players.delete(entry);
}

/** Call when `owner` starts playing: pause all other media and stop registered players. */
export function claimPlayback(owner?: HTMLMediaElement | null, opts: { keepSpeech?: boolean } = {}): void {
  for (const p of players) {
    if (owner && p.el === owner) continue;
    try {
      p.stop();
    } catch {
      // never let one player break another
    }
  }
  if (typeof document !== "undefined") {
    document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((m) => {
      if (m !== owner && !m.paused) m.pause();
    });
  }
  if (!opts.keepSpeech && typeof window !== "undefined" && window.speechSynthesis?.speaking) {
    window.speechSynthesis.cancel();
  }
}
