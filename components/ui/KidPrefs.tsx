"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_VOICE_PREFS,
  applyVoice,
  effectiveVoiceName,
  readVoicePrefs,
  writeVoicePrefs,
  type VoicePrefs,
} from "@/lib/ui/voice";
import { grokVoiceFromName } from "@/lib/tts/core";
import { fetchGrokClip, playGrokClip, reportTtsFallback, stopGrokAudio, unlockGrokAudio } from "@/lib/tts/client";

type SpeakOpts = { onend?: () => void; onboundary?: (charIndex: number) => void };

type KidPrefsValue = VoicePrefs & {
  /** True when the server has Grok voices turned on (an xAI key is configured). */
  grokEnabled: boolean;
  /** The voice that will actually read aloud ("grok:luna" or a device voice name). */
  activeVoiceName: string;
  setVoiceName: (name: string) => void;
  setRate: (rate: number) => void;
  setSoundOn: (on: boolean) => void;
  speak: (text: string, opts?: SpeakOpts) => void;
  stopSpeak: () => void;
};

const KidPrefsContext = createContext<KidPrefsValue | null>(null);

function speakWithBrowser(text: string, prefs: VoicePrefs, opts?: SpeakOpts) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts?.onend?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  applyVoice(utterance, prefs, window.speechSynthesis.getVoices());
  if (opts?.onboundary) {
    utterance.onboundary = (event) => {
      if (event.name && event.name !== "word") return;
      opts.onboundary?.(event.charIndex);
    };
  }
  utterance.onend = () => opts?.onend?.();
  utterance.onerror = () => opts?.onend?.();
  window.speechSynthesis.speak(utterance);
}

export function KidPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<VoicePrefs>(DEFAULT_VOICE_PREFS);
  const [grokEnabled, setGrokEnabled] = useState(false);
  const speakToken = useRef(0);
  // Resolves once we know whether Grok is on, so a tap right after page load doesn't use the browser voice.
  const grokReady = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    setPrefs(readVoicePrefs());
    let alive = true;
    grokReady.current = fetch("/api/tts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { enabled?: boolean } | null) => {
        const enabled = Boolean(data?.enabled);
        if (alive) setGrokEnabled(enabled);
        return enabled;
      })
      .catch(() => false);
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<KidPrefsValue>(() => {
    function persist(next: Partial<VoicePrefs>) {
      setPrefs(writeVoicePrefs(next));
    }
    function stopSpeak() {
      speakToken.current += 1;
      stopGrokAudio();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    }
    function speak(text: string, opts?: SpeakOpts) {
      const current = readVoicePrefs();
      const pending = !grokEnabled && grokReady.current;
      // A device voice the kid picked by hand wins; otherwise Grok (default luna) is used when enabled.
      if (!grokEnabled && !pending) {
        speakWithBrowser(text, { ...current, voiceName: effectiveVoiceName(current, false) }, opts);
        return;
      }
      if (grokEnabled && !grokVoiceFromName(effectiveVoiceName(current, true))) {
        speakWithBrowser(text, { ...current, voiceName: effectiveVoiceName(current, true) }, opts);
        return;
      }
      stopSpeak();
      const token = speakToken.current;
      unlockGrokAudio();
      // Grok genuinely failed, timed out, or was blocked: read it with the device voice, and log why.
      const fallback = (error: unknown) => {
        if (token !== speakToken.current) return;
        reportTtsFallback(error instanceof Error ? `${error.name}:${error.message}` : String(error), text.length);
        speakWithBrowser(text, { ...current, voiceName: "" }, opts);
      };
      const enabled = grokEnabled ? Promise.resolve(true) : (grokReady.current ?? Promise.resolve(false));
      enabled
        .then((on) => {
          const grokVoice = on ? grokVoiceFromName(effectiveVoiceName(current, true)) : null;
          if (!grokVoice) {
            if (token === speakToken.current) speakWithBrowser(text, { ...current, voiceName: effectiveVoiceName(current, on) }, opts);
            return;
          }
          return fetchGrokClip(text, grokVoice, current.rate).then((clip) => {
            if (token !== speakToken.current) return;
            return playGrokClip(clip, opts ?? {});
          });
        })
        .catch(fallback);
    }
    return {
      ...prefs,
      grokEnabled,
      activeVoiceName: effectiveVoiceName(prefs, grokEnabled),
      setVoiceName: (voiceName) => persist({ voiceName, voiceChosen: true }),
      setRate: (rate) => persist({ rate }),
      setSoundOn: (soundOn) => persist({ soundOn }),
      speak,
      stopSpeak,
    };
  }, [prefs, grokEnabled]);

  return <KidPrefsContext.Provider value={value}>{children}</KidPrefsContext.Provider>;
}

export function useKidPrefs(): KidPrefsValue {
  const value = useContext(KidPrefsContext);
  if (!value) {
    return {
      ...DEFAULT_VOICE_PREFS,
      grokEnabled: false,
      activeVoiceName: "",
      setVoiceName: () => undefined,
      setRate: () => undefined,
      setSoundOn: () => undefined,
      speak: (_text, opts) => opts?.onend?.(),
      stopSpeak: () => undefined,
    };
  }
  return value;
}
