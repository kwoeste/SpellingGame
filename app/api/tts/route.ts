import { NextResponse } from "next/server";
import { jsonForbidden, jsonUnauthorized, noStoreHeaders, requireRole, sameOriginOrForbidden } from "@/lib/auth/guards";
import { GROK_VOICES, TTS_MAX_CHARS, isGrokVoiceId, normalizeTtsText, rateToSpeed } from "@/lib/tts/core";
import { TtsError, synthesize, ttsEnabled } from "@/lib/tts/server";

export const runtime = "nodejs";

/** Tells the voice picker whether Grok voices are available (never reveals the key). */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  const enabled = ttsEnabled();
  return NextResponse.json({ enabled, voices: enabled ? GROK_VOICES.map((v) => v.id) : [] }, { headers: noStoreHeaders() });
}

export async function POST(req: Request) {
  const blocked = sameOriginOrForbidden(req);
  if (blocked) return blocked;
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();

  const body = (await req.json().catch(() => null)) as { text?: unknown; voice?: unknown; rate?: unknown } | null;
  const text = normalizeTtsText(typeof body?.text === "string" ? body.text : "");
  if (!text) return NextResponse.json({ error: "empty_text" }, { status: 400, headers: noStoreHeaders() });
  if (text.length > TTS_MAX_CHARS) return NextResponse.json({ error: "text_too_long" }, { status: 413, headers: noStoreHeaders() });
  if (!isGrokVoiceId(body?.voice)) return NextResponse.json({ error: "unknown_voice" }, { status: 400, headers: noStoreHeaders() });
  const speed = rateToSpeed(typeof body?.rate === "number" ? body.rate : Number.NaN);

  try {
    const clip = await synthesize({ email: gate.actor.email, text, voice: body.voice, speed });
    return NextResponse.json(
      { audio: clip.audioBase64, contentType: clip.contentType, words: clip.words, duration: clip.duration, cached: clip.cached },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    const status = error instanceof TtsError ? error.status : 500;
    const code = error instanceof TtsError ? error.message : "tts_failed";
    if (status >= 500) console.error("tts", code);
    return NextResponse.json({ error: code }, { status, headers: noStoreHeaders() });
  }
}
