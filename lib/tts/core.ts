/**
 * Grok (xAI) text-to-speech: pure helpers shared by the client and server.
 * Nothing secret lives here. The API key is only read in lib/tts/server.ts.
 */

export const GROK_PREFIX = "grok:";

/** Allowlisted xAI voices with kid-friendly names. The first one is the default. */
export const GROK_VOICES = [
  { id: "luna", kidName: "Luna the Owl 🦉" },
  { id: "cosmo", kidName: "Cosmo the Explorer 🚀" },
  { id: "carina", kidName: "Carina the Dolphin 🐬" },
  { id: "lux", kidName: "Lux the Wise Turtle 🐢" },
  { id: "eve", kidName: "Eve the Storyteller 📖" },
] as const;

export type GrokVoiceId = (typeof GROK_VOICES)[number]["id"];

export const DEFAULT_GROK_VOICE: GrokVoiceId = "luna";
export const DEFAULT_GROK_VOICE_NAME = `${GROK_PREFIX}${DEFAULT_GROK_VOICE}`;

/** Longest text one request may synthesize (a Study passage read aloud is well under this). */
export const TTS_MAX_CHARS = 2000;
/** Fresh (uncached) characters one user may synthesize per Eastern day. ~$0.75/day worst case. */
export const TTS_DAILY_CHAR_CAP = 50_000;
/**
 * Floor for how long the client waits for Grok audio before using the browser voice.
 * Fresh (uncached) xAI synthesis of a long passage routinely takes well over 4 s, so a flat 4 s
 * timeout silently fell back to the robotic browser voice for every new passage or question.
 */
export const TTS_CLIENT_TIMEOUT_MS = 8000;
/** Hard ceiling, just above the server's own xAI timeout. */
export const TTS_CLIENT_TIMEOUT_MAX_MS = 30_000;
/** Server-side wait for xAI. */
export const TTS_UPSTREAM_TIMEOUT_MS = 25_000;

/** Longer text takes xAI longer to synthesize, so give it proportionally more time. */
export function ttsClientTimeoutMs(chars: number): number {
  const n = Number.isFinite(chars) && chars > 0 ? chars : 0;
  return Math.min(TTS_CLIENT_TIMEOUT_MAX_MS, TTS_CLIENT_TIMEOUT_MS + Math.ceil(n * 20));
}

export function isGrokVoiceId(value: unknown): value is GrokVoiceId {
  return typeof value === "string" && GROK_VOICES.some((voice) => voice.id === value);
}

/** "grok:luna" -> "luna"; anything else (a device voice name, "") -> null. */
export function grokVoiceFromName(voiceName: string): GrokVoiceId | null {
  if (!voiceName.startsWith(GROK_PREFIX)) return null;
  const id = voiceName.slice(GROK_PREFIX.length);
  return isGrokVoiceId(id) ? id : null;
}

/** The picker's Slow / Normal / Fast rates (0.7 / 0.85 / 1) map onto xAI's 0.7–1.5 speed range. */
export function rateToSpeed(rate: number): number {
  const value = Number.isFinite(rate) ? rate : 0.85;
  const clamped = Math.min(1.5, Math.max(0.7, value));
  return Math.round(clamped * 100) / 100;
}

/** Collapse whitespace so trivially different strings share a cache entry. */
export function normalizeTtsText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export type TtsWord = { charIndex: number; start: number; end: number };

/**
 * Turn xAI's per-character timestamps into word starts. charIndex points into the text we sent,
 * matching what browser `onboundary` events report, so existing highlight code keeps working.
 */
export function wordsFromTimestamps(chars: string[], times: number[][]): TtsWord[] {
  const words: TtsWord[] = [];
  let offset = 0;
  let current: TtsWord | null = null;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] ?? "";
    const [start = 0, end = start] = times[i] ?? [];
    if (/^\s+$/.test(ch)) {
      current = null;
    } else if (!current) {
      current = { charIndex: offset, start, end };
      words.push(current);
    } else {
      current.end = end;
    }
    offset += ch.length;
  }
  return words;
}

/** Index of the last word that has started by `time` seconds, or -1. */
export function wordAtTime(words: TtsWord[], time: number): number {
  let found = -1;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].start <= time + 0.02) found = i;
    else break;
  }
  return found;
}
