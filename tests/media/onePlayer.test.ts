import { afterEach, describe, expect, it, vi } from "vitest";
import { claimPlayback, registerPlayer } from "@/lib/media/onePlayer";

function fakeMedia(paused = false) {
  return { paused, pause: vi.fn(function (this: { paused: boolean }) { this.paused = true; }) } as unknown as HTMLMediaElement & { pause: ReturnType<typeof vi.fn> };
}

describe("one player at a time", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pauses other page media and stops registered TTS when a video starts", () => {
    const video = fakeMedia();
    const other = fakeMedia();
    vi.stubGlobal("document", { querySelectorAll: () => [video, other] });
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { speaking: true, cancel } });
    const ttsStop = vi.fn();
    const unregister = registerPlayer(ttsStop, fakeMedia());
    claimPlayback(video);
    expect(ttsStop).toHaveBeenCalledOnce();
    expect(other.pause).toHaveBeenCalled();
    expect(video.pause).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    unregister();
  });

  it("read-aloud claiming playback pauses the video but not itself or browser speech", () => {
    const video = fakeMedia();
    const tts = fakeMedia();
    vi.stubGlobal("document", { querySelectorAll: () => [video] });
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { speaking: true, cancel } });
    const ttsStop = vi.fn();
    const unregister = registerPlayer(ttsStop, tts);
    claimPlayback(tts, { keepSpeech: true });
    expect(video.pause).toHaveBeenCalled();
    expect(ttsStop).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    unregister();
  });
});
