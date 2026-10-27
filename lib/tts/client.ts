"use client";

import { ttsClientTimeoutMs, wordAtTime, type GrokVoiceId, type TtsWord } from "@/lib/tts/core";

type Clip = { src: string; words: TtsWord[] };

const clipCache = new Map<string, Clip>();
const CLIP_CACHE_MAX = 200;
let audioEl: HTMLAudioElement | null = null;
let silentSrc: string | null = null;

/** 50 ms of silent 8 kHz WAV, used to unlock audio on iOS Safari inside the tap handler. */
function silentWav(): string {
  if (silentSrc) return silentSrc;
  const samples = 400;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  write(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i += 1) view.setUint8(44 + i, 128);
  let binary = "";
  new Uint8Array(buffer).forEach((b) => (binary += String.fromCharCode(b)));
  silentSrc = `data:audio/wav;base64,${btoa(binary)}`;
  return silentSrc;
}

function audio(): HTMLAudioElement {
  audioEl ??= new Audio();
  return audioEl;
}

/** Must run synchronously inside the click/tap handler, before any await. */
export function unlockGrokAudio(): void {
  try {
    const el = audio();
    el.src = silentWav();
    void el.play().catch(() => undefined);
  } catch {
    // No audio element support; caller will fall back.
  }
}

let stopCurrent: (() => void) | null = null;

export function stopGrokAudio(): void {
  stopCurrent?.();
  stopCurrent = null;
}

export async function fetchGrokClip(text: string, voice: GrokVoiceId, rate: number): Promise<Clip> {
  const key = `${voice}|${rate}|${text}`;
  const cached = clipCache.get(key);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttsClientTimeoutMs(text.length));
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(`tts_http_${response.status}${detail?.error ? `_${detail.error}` : ""}`);
    }
    const data = (await response.json()) as { audio?: string; contentType?: string; words?: TtsWord[] };
    if (!data.audio) throw new Error("tts empty");
    const clip = { src: `data:${data.contentType || "audio/mpeg"};base64,${data.audio}`, words: Array.isArray(data.words) ? data.words : [] };
    if (clipCache.size >= CLIP_CACHE_MAX) clipCache.delete(clipCache.keys().next().value as string);
    clipCache.set(key, clip);
    return clip;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("tts_client_timeout");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Fire-and-forget: tell the server the browser voice was used instead of Grok, so it shows in Vercel logs. */
export function reportTtsFallback(reason: string, chars: number): void {
  try {
    console.warn("[tts] Grok voice fell back to the browser voice:", reason);
    const body = JSON.stringify({ reason: String(reason).slice(0, 120), chars, path: window.location.pathname });
    if (navigator.sendBeacon?.("/api/tts/fallback", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/tts/fallback", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    // Logging must never break read-aloud.
  }
}

/** Plays a clip, reporting word starts as onboundary(charIndex) like the browser voice does. */
export function playGrokClip(clip: Clip, opts: { onend?: () => void; onboundary?: (charIndex: number) => void }): Promise<void> {
  stopGrokAudio();
  const el = audio();
  let raf = 0;
  let lastWord = -1;
  let done = false;
  const finish = (callEnd: boolean) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    el.onended = null;
    el.onerror = null;
    if (callEnd) opts.onend?.();
  };
  const tick = () => {
    if (done) return;
    const idx = wordAtTime(clip.words, el.currentTime);
    if (idx > lastWord) {
      for (let i = lastWord + 1; i <= idx; i += 1) opts.onboundary?.(clip.words[i].charIndex);
      lastWord = idx;
    }
    raf = requestAnimationFrame(tick);
  };
  stopCurrent = () => {
    el.pause();
    finish(false);
  };
  el.onended = () => finish(true);
  el.onerror = () => finish(true);
  el.src = clip.src;
  el.currentTime = 0;
  return el.play().then(() => {
    if (opts.onboundary && clip.words.length) raf = requestAnimationFrame(tick);
  }, (error) => {
    finish(false);
    throw error;
  });
}
