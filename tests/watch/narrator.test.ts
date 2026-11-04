import { afterEach, describe, expect, it, vi } from "vitest";
import { READ_ALOUD, claimPlayback } from "@/lib/media/onePlayer";
import { createNarrator, type NarratorSpeak } from "@/lib/watch/narrator";

function fakeMedia(paused = false) {
  return { paused, pause: vi.fn(function (this: { paused: boolean }) { this.paused = true; }) } as unknown as HTMLMediaElement & { pause: ReturnType<typeof vi.fn> };
}

function setup() {
  const timers = new Map<number, () => void>();
  let nextId = 1;
  let lastOpts: Parameters<NarratorSpeak>[1] = {};
  const speak = vi.fn<NarratorSpeak>((_t, opts) => {
    lastOpts = opts;
    claimPlayback(READ_ALOUD, { keepSpeech: true });
  });
  const stopSpeak = vi.fn(() => {
    // Browser voice: cancel() fires onerror -> onend; must not resume auto-advance.
    lastOpts.onend?.();
  });
  const onUnlock = vi.fn();
  const onPausedChange = vi.fn();
  const n = createNarrator({
    speak,
    stopSpeak,
    unlockMs: 1500,
    slideCount: () => 6,
    onBoundary: () => {},
    onEnd: () => {},
    onUnlock,
    onPausedChange,
    setTimeout: (fn) => {
      const id = nextId++;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  const flush = () => [...timers.values()].forEach((f) => f());
  return { n, speak, stopSpeak, onUnlock, onPausedChange, timers, flush, end: () => lastOpts.onend?.() };
}

describe("Watch-it narrator + one player", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("video play pauses slideshow narration and halts auto-advance", () => {
    const video = fakeMedia();
    vi.stubGlobal("document", { querySelectorAll: () => [video] });
    vi.stubGlobal("window", { speechSynthesis: { speaking: true, cancel: vi.fn() } });
    const s = setup();
    s.n.narrate(1, "slide two words");
    claimPlayback(video); // kid presses play on the recap video
    expect(s.stopSpeak).toHaveBeenCalled();
    expect(s.n.isPaused()).toBe(true);
    expect(s.onPausedChange).toHaveBeenLastCalledWith(true);
    s.end();
    s.flush();
    expect(s.n.hasPendingAdvance()).toBe(false);
    expect(s.onUnlock).not.toHaveBeenCalled();
    s.n.dispose();
  });

  it("video play during the post-narration pause cancels the pending advance", () => {
    const video = fakeMedia();
    vi.stubGlobal("document", { querySelectorAll: () => [video] });
    vi.stubGlobal("window", { speechSynthesis: { speaking: false, cancel: vi.fn() } });
    const s = setup();
    s.n.narrate(1, "slide two");
    s.end();
    expect(s.n.hasPendingAdvance()).toBe(true);
    claimPlayback(video);
    expect(s.n.hasPendingAdvance()).toBe(false);
    s.flush();
    expect(s.onUnlock).not.toHaveBeenCalled();
    expect(s.n.isPaused()).toBe(true);
    s.n.dispose();
  });

  it("resume continues narration on the same slide and pauses the video", () => {
    const video = fakeMedia();
    vi.stubGlobal("document", { querySelectorAll: () => [video] });
    vi.stubGlobal("window", { speechSynthesis: { speaking: false, cancel: vi.fn() } });
    const s = setup();
    s.n.narrate(1, "slide two");
    claimPlayback(video);
    (video as unknown as { paused: boolean }).paused = false; // video now playing
    s.n.narrate(1, "slide two"); // ▶ Play
    expect(s.speak).toHaveBeenLastCalledWith("slide two", expect.anything());
    expect(video.pause).toHaveBeenCalled();
    expect(s.n.isPaused()).toBe(false);
    s.end();
    s.flush();
    expect(s.onUnlock).toHaveBeenCalledWith(1);
    s.n.dispose();
  });
});
