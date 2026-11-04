/**
 * "One player at a time": starting any audio/video source pauses every other one on the page,
 * so the read-aloud (Grok TTS / browser voice) never talks over a recap video and vice versa.
 */
type Owner = HTMLMediaElement | object;
type Stopper = { el?: Owner; stop: () => void };

/** Shared owner token for everything that reads aloud (Grok audio, browser voice, Watch-it slideshow). */
export const READ_ALOUD: object = Object.freeze({ readAloud: true });

const players = new Set<Stopper>();

/** Register an off-DOM player (e.g. the shared TTS Audio element). Returns an unregister fn. */
export function registerPlayer(stop: () => void, el?: Owner): () => void {
  const entry: Stopper = { el, stop };
  players.add(entry);
  return () => players.delete(entry);
}

/** Call when `owner` starts playing: pause all other media and stop registered players. */
export function claimPlayback(owner?: Owner | null, opts: { keepSpeech?: boolean } = {}): void {
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
