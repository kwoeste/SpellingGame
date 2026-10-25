import { createHash } from "node:crypto";
import { hasDatabase, queryOnce } from "@/lib/db/client";
import { etDateKey } from "@/lib/engine/scheduler";
import { TTS_DAILY_CHAR_CAP, wordsFromTimestamps, type GrokVoiceId, type TtsWord } from "@/lib/tts/core";

/** Bump when xAI changes models or we change output format, so old audio is regenerated. */
export const TTS_MODEL_TAG = "xai-tts-v1-mp3-24k-64k";

export type TtsClip = { audioBase64: string; contentType: string; words: TtsWord[]; duration: number | null; cached: boolean };

export function ttsEnabled(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

export function ttsCacheKey(text: string, voice: string, speed: number): string {
  return createHash("sha256").update(`${TTS_MODEL_TAG}\n${voice}\n${speed.toFixed(2)}\n${text}`).digest("hex");
}

function userKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
}

type CacheRow = { audio: string; content_type: string; words: TtsWord[]; duration: number | null };

export type TtsStore = {
  get(key: string): Promise<CacheRow | null>;
  put(key: string, row: CacheRow & { voice: string; speed: number; chars: number }): Promise<void>;
  /** Adds chars to today's tally if it stays under the cap; returns false when it would exceed it. */
  takeChars(user: string, day: string, chars: number, cap: number): Promise<boolean>;
};

function memoryStore(): TtsStore {
  const cache = new Map<string, CacheRow>();
  const usage = new Map<string, number>();
  return {
    async get(key) {
      return cache.get(key) ?? null;
    },
    async put(key, row) {
      cache.set(key, { audio: row.audio, content_type: row.content_type, words: row.words, duration: row.duration });
    },
    async takeChars(user, day, chars, cap) {
      const k = `${user}:${day}`;
      const used = usage.get(k) ?? 0;
      if (used + chars > cap) return false;
      usage.set(k, used + chars);
      return true;
    },
  };
}

const pgStore: TtsStore = {
  async get(key) {
    const rows = await queryOnce<{ audio: string; content_type: string; words: TtsWord[]; duration: number | null }>(
      "student",
      "select encode(audio, 'base64') as audio, content_type, words, duration from tts.tts_cache where cache_key = $1",
      [key],
    );
    return rows[0] ?? null;
  },
  async put(key, row) {
    await queryOnce(
      "student",
      `insert into tts.tts_cache (cache_key, voice, speed, chars, content_type, audio, words, duration)
       values ($1, $2, $3, $4, $5, decode($6, 'base64'), $7::jsonb, $8)
       on conflict (cache_key) do nothing`,
      [key, row.voice, row.speed, row.chars, row.content_type, row.audio, JSON.stringify(row.words), row.duration],
    );
  },
  async takeChars(user, day, chars, cap) {
    const rows = await queryOnce<{ chars: number }>(
      "student",
      `insert into tts.tts_usage (user_key, day, chars) values ($1, $2::date, $3)
       on conflict (user_key, day) do update set chars = tts.tts_usage.chars + excluded.chars
       where tts.tts_usage.chars + excluded.chars <= $4
       returning chars`,
      [user, day, chars, cap],
    );
    return rows.length > 0 && chars <= cap;
  },
};

let storeOverride: TtsStore | null = null;
let memory: TtsStore | null = null;

export function setTtsStoreForTests(store: TtsStore | null): void {
  storeOverride = store;
  memory = null;
}

function store(): TtsStore {
  if (storeOverride) return storeOverride;
  if (hasDatabase()) return pgStore;
  memory ??= memoryStore();
  return memory;
}

export class TtsError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type FetchLike = typeof fetch;
let fetchOverride: FetchLike | null = null;
export function setTtsFetchForTests(fn: FetchLike | null): void {
  fetchOverride = fn;
}

async function callXai(text: string, voice: GrokVoiceId, speed: number): Promise<CacheRow> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new TtsError(503, "tts_disabled");
  const doFetch = fetchOverride ?? fetch;
  const response = await doFetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice_id: voice,
      language: "en",
      speed,
      with_timestamps: true,
      output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 64000 },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response) throw new TtsError(502, "tts_upstream_unreachable");
  if (!response.ok) throw new TtsError(502, `tts_upstream_${response.status}`);
  const payload = (await response.json().catch(() => null)) as {
    audio?: string;
    content_type?: string;
    duration?: number;
    audio_timestamps?: { graph_chars?: string[]; graph_times?: number[][] };
  } | null;
  if (!payload?.audio) throw new TtsError(502, "tts_upstream_bad_payload");
  const ts = payload.audio_timestamps;
  return {
    audio: payload.audio,
    content_type: payload.content_type || "audio/mpeg",
    duration: typeof payload.duration === "number" ? payload.duration : null,
    words: ts?.graph_chars && ts.graph_times ? wordsFromTimestamps(ts.graph_chars, ts.graph_times) : [],
  };
}

/** Cached synthesis. Cache hits are free and do not count toward the daily cap. */
export async function synthesize(args: { email: string; text: string; voice: GrokVoiceId; speed: number; now?: Date; skipDailyCap?: boolean }): Promise<TtsClip> {
  const key = ttsCacheKey(args.text, args.voice, args.speed);
  const s = store();
  const hit = await s.get(key).catch(() => null);
  if (hit) return { audioBase64: hit.audio, contentType: hit.content_type, words: hit.words, duration: hit.duration, cached: true };
  if (!ttsEnabled()) throw new TtsError(503, "tts_disabled");
  const day = etDateKey(args.now ?? new Date());
  const allowed = args.skipDailyCap || await s.takeChars(userKey(args.email), day, args.text.length, TTS_DAILY_CHAR_CAP);
  if (!allowed) throw new TtsError(429, "tts_daily_cap");
  const fresh = await callXai(args.text, args.voice, args.speed);
  await s.put(key, { ...fresh, voice: args.voice, speed: args.speed, chars: args.text.length }).catch(() => undefined);
  return { audioBase64: fresh.audio, contentType: fresh.content_type, words: fresh.words, duration: fresh.duration, cached: false };
}
