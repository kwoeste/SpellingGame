import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as fallbackPOST } from "@/app/api/tts/fallback/route";
import { mintTestSession, resetSessions } from "@/lib/auth/sessions";
import { TTS_CLIENT_TIMEOUT_MAX_MS, TTS_UPSTREAM_TIMEOUT_MS, ttsClientTimeoutMs } from "@/lib/tts/core";

/**
 * Regression (Oct 27 2026): the client gave up on Grok after a flat 4 s. Fresh xAI synthesis of a
 * Study passage or a new practice-test question takes longer than that, so read-aloud silently
 * switched to the robotic browser voice (the server still finished and cached the clip).
 */
describe("Grok read-aloud does not fall back to the browser voice on slow fresh synthesis", () => {
  afterEach(() => {
    resetSessions();
    vi.restoreAllMocks();
  });

  it("waits long enough for long passages, and never longer than the server", () => {
    expect(ttsClientTimeoutMs(10)).toBeGreaterThanOrEqual(8000);
    expect(ttsClientTimeoutMs(650)).toBeGreaterThanOrEqual(15_000);
    expect(ttsClientTimeoutMs(2000)).toBe(TTS_CLIENT_TIMEOUT_MAX_MS);
    expect(TTS_CLIENT_TIMEOUT_MAX_MS).toBeGreaterThan(TTS_UPSTREAM_TIMEOUT_MS);
    expect(ttsClientTimeoutMs(Number.NaN)).toBe(8000);
  });

  it("client code uses the length-based timeout and reports every fallback", () => {
    const client = readFileSync("lib/tts/client.ts", "utf8");
    expect(client).toContain("ttsClientTimeoutMs(text.length)");
    const prefs = readFileSync("components/ui/KidPrefs.tsx", "utf8");
    expect(prefs).toContain("reportTtsFallback(");
    expect(prefs).toContain("grokReady");
  });

  it("the legacy spelling game uses the Grok voice before the browser voice", () => {
    const html = readFileSync("spelling-game.html", "utf8");
    expect(html).toContain('fetch("/api/tts"');
    expect(html.indexOf("grokSpeak(text, token)")).toBeLessThan(html.indexOf("browserVoice();"));
  });

  it("logs browser-voice fallbacks from signed-in users", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const headers = new Headers({ "content-type": "application/json", "x-test-session": mintTestSession("mae.woeste@gmail.com").id });
    const res = await fallbackPOST(new Request("http://local/api/tts/fallback", {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Error:tts_client_timeout", chars: 640, path: "/study/savvas.ch3/practice-test" }),
    }));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("tts fallback", expect.objectContaining({ reason: "Error:tts_client_timeout", chars: 640 }));
  });
});
