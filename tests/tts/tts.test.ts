import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/tts/route";
import { decideRequest } from "@/lib/auth/decide";
import { resetAudit } from "@/lib/auth/audit";
import { mintTestSession, resetSessions } from "@/lib/auth/sessions";
import { resetMemoryUsers } from "@/lib/auth/users";
import {
  DEFAULT_GROK_VOICE_NAME,
  TTS_DAILY_CHAR_CAP,
  TTS_MAX_CHARS,
  grokVoiceFromName,
  rateToSpeed,
  wordAtTime,
  wordsFromTimestamps,
} from "@/lib/tts/core";
import { setTtsFetchForTests, setTtsStoreForTests, ttsCacheKey } from "@/lib/tts/server";
import { effectiveVoiceName } from "@/lib/ui/voice";

const MAE = "mae.woeste@gmail.com";
const FAKE_KEY = "xai-test-key-should-never-leak";

function req(method: "GET" | "POST", body?: unknown, email?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (email) headers.set("x-test-session", mintTestSession(email).id);
  return new Request("http://local/api/tts", { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

function fakeXai(status = 200) {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const sent = JSON.parse(String(init?.body)) as { text: string };
    const chars = [...sent.text];
    const payload = {
      audio: Buffer.from("ID3fake-mp3").toString("base64"),
      content_type: "audio/mpeg",
      duration: chars.length * 0.05,
      audio_timestamps: { graph_chars: chars, graph_times: chars.map((_, i) => [i * 0.05, i * 0.05 + 0.05]) },
    };
    return new Response(status === 200 ? JSON.stringify(payload) : "nope", { status, headers: { "content-type": "application/json" } });
  });
}

describe("tts helpers", () => {
  it("maps picker speeds into xAI's range and parses voice names", () => {
    expect(rateToSpeed(0.7)).toBe(0.7);
    expect(rateToSpeed(0.85)).toBe(0.85);
    expect(rateToSpeed(0.5)).toBe(0.7);
    expect(rateToSpeed(9)).toBe(1.5);
    expect(rateToSpeed(Number.NaN)).toBe(0.85);
    expect(grokVoiceFromName("grok:luna")).toBe("luna");
    expect(grokVoiceFromName("grok:rex")).toBeNull();
    expect(grokVoiceFromName("Samantha")).toBeNull();
  });

  it("turns character timestamps into word starts that match browser charIndex", () => {
    const text = "Hello big world.";
    const chars = [...text];
    const words = wordsFromTimestamps(chars, chars.map((_, i) => [i / 10, i / 10 + 0.1]));
    expect(words.map((w) => w.charIndex)).toEqual([0, 6, 10]);
    expect(words.map((w) => text.slice(w.charIndex).split(" ")[0])).toEqual(["Hello", "big", "world."]);
    expect(wordAtTime(words, 0)).toBe(0);
    expect(wordAtTime(words, 0.65)).toBe(1);
    expect(wordAtTime(words, 5)).toBe(2);
  });

  it("uses browser voices exactly as before when Grok is off, and Luna by default when on", () => {
    expect(effectiveVoiceName({ voiceName: "Samantha", voiceChosen: false }, false)).toBe("Samantha");
    expect(effectiveVoiceName({ voiceName: "grok:cosmo", voiceChosen: true }, false)).toBe("");
    expect(effectiveVoiceName({ voiceName: "", voiceChosen: false }, false)).toBe("");
    expect(effectiveVoiceName({ voiceName: "Samantha", voiceChosen: false }, true)).toBe(DEFAULT_GROK_VOICE_NAME);
    expect(effectiveVoiceName({ voiceName: "Samantha", voiceChosen: true }, true)).toBe("Samantha");
    expect(effectiveVoiceName({ voiceName: "grok:cosmo", voiceChosen: true }, true)).toBe("grok:cosmo");
  });

  it("keys the cache on text, voice and speed", () => {
    const a = ttsCacheKey("cat", "luna", 0.85);
    expect(a).toBe(ttsCacheKey("cat", "luna", 0.85));
    expect(a).not.toBe(ttsCacheKey("cat", "cosmo", 0.85));
    expect(a).not.toBe(ttsCacheKey("cat", "luna", 1));
    expect(a).not.toBe(ttsCacheKey("cats", "luna", 0.85));
  });
});

describe("/api/tts", () => {
  beforeEach(() => {
    delete process.env.XAI_API_KEY;
    resetSessions();
    resetMemoryUsers();
    resetAudit();
    setTtsStoreForTests(null);
    setTtsFetchForTests(null);
  });
  afterEach(() => {
    delete process.env.XAI_API_KEY;
    setTtsFetchForTests(null);
  });

  it("is behind sign-in (route and middleware)", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
    expect((await POST(req("POST", { text: "hi", voice: "luna" }))).status).toBe(401);
    expect(decideRequest({ pathname: "/api/tts", hasSession: false, role: null })).toEqual({ kind: "unauthorized", status: 401 });
    expect(decideRequest({ pathname: "/api/tts", hasSession: true, role: "outsider" }).kind).toBe("forbidden");
  });

  it("reports disabled and refuses synthesis when no key is configured", async () => {
    const status = await GET(req("GET", undefined, MAE));
    expect(await status.json()).toEqual({ enabled: false, voices: [] });
    const fetchSpy = fakeXai();
    setTtsFetchForTests(fetchSpy as unknown as typeof fetch);
    expect((await POST(req("POST", { text: "hi", voice: "luna" }, MAE))).status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates text length and the voice allowlist", async () => {
    process.env.XAI_API_KEY = FAKE_KEY;
    setTtsFetchForTests(fakeXai() as unknown as typeof fetch);
    expect((await POST(req("POST", { text: "  ", voice: "luna" }, MAE))).status).toBe(400);
    expect((await POST(req("POST", { text: "a".repeat(TTS_MAX_CHARS + 1), voice: "luna" }, MAE))).status).toBe(413);
    expect((await POST(req("POST", { text: "hi", voice: "rex" }, MAE))).status).toBe(400);
    expect((await POST(req("POST", { text: "hi", voice: "../etc" }, MAE))).status).toBe(400);
  });

  it("synthesizes with word timings, caches repeats, and never echoes the key", async () => {
    process.env.XAI_API_KEY = FAKE_KEY;
    const fetchSpy = fakeXai();
    setTtsFetchForTests(fetchSpy as unknown as typeof fetch);
    const status = await (await GET(req("GET", undefined, MAE))).json();
    expect(status.enabled).toBe(true);
    expect(status.voices).toContain("luna");

    const first = await POST(req("POST", { text: "The  cat sat.", voice: "luna", rate: 0.85 }, MAE));
    expect(first.status).toBe(200);
    const raw = await first.text();
    expect(raw).not.toContain(FAKE_KEY);
    const body = JSON.parse(raw);
    expect(body.cached).toBe(false);
    expect(body.words.map((w: { charIndex: number }) => w.charIndex)).toEqual([0, 4, 8]);

    const sent = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(sent).toMatchObject({ text: "The cat sat.", voice_id: "luna", language: "en", speed: 0.85, with_timestamps: true });
    expect((fetchSpy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE_KEY}`);

    const again = await (await POST(req("POST", { text: "The cat sat.", voice: "luna", rate: 0.85 }, MAE))).json();
    expect(again.cached).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("enforces the per-user daily character cap (cache hits stay free)", async () => {
    process.env.XAI_API_KEY = FAKE_KEY;
    setTtsFetchForTests(fakeXai() as unknown as typeof fetch);
    const chunk = "b".repeat(TTS_MAX_CHARS);
    const allowed = Math.floor(TTS_DAILY_CHAR_CAP / TTS_MAX_CHARS);
    for (let i = 0; i < allowed; i += 1) {
      const res = await POST(req("POST", { text: `${chunk.slice(0, -4)}${String(i).padStart(4, "0")}`, voice: "luna" }, MAE));
      expect(res.status).toBe(200);
    }
    expect((await POST(req("POST", { text: "one more new sentence", voice: "luna" }, MAE))).status).toBe(429);
    expect((await POST(req("POST", { text: `${chunk.slice(0, -4)}0000`, voice: "luna" }, MAE))).status).toBe(200);
  });

  it("returns 502 when xAI fails so the client falls back to the browser voice", async () => {
    process.env.XAI_API_KEY = FAKE_KEY;
    setTtsFetchForTests(fakeXai(500) as unknown as typeof fetch);
    expect((await POST(req("POST", { text: "hello", voice: "carina" }, MAE))).status).toBe(502);
  });
});
