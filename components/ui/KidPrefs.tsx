"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_VOICE_PREFS,
  applyVoice,
  readVoicePrefs,
  writeVoicePrefs,
  type VoicePrefs,
} from "@/lib/ui/voice";

type KidPrefsValue = VoicePrefs & {
  setVoiceName: (name: string) => void;
  setRate: (rate: number) => void;
  setSoundOn: (on: boolean) => void;
  speak: (text: string, opts?: { onend?: () => void; onboundary?: (charIndex: number) => void }) => void;
  stopSpeak: () => void;
};

const KidPrefsContext = createContext<KidPrefsValue | null>(null);

export function KidPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<VoicePrefs>(DEFAULT_VOICE_PREFS);

  useEffect(() => {
    setPrefs(readVoicePrefs());
  }, []);

  const value = useMemo<KidPrefsValue>(() => {
    function persist(next: Partial<VoicePrefs>) {
      setPrefs(writeVoicePrefs(next));
    }
    function stopSpeak() {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    }
    function speak(text: string, opts?: { onend?: () => void; onboundary?: (charIndex: number) => void }) {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        opts?.onend?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      applyVoice(utterance, readVoicePrefs(), window.speechSynthesis.getVoices());
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
    return {
      ...prefs,
      setVoiceName: (voiceName) => persist({ voiceName }),
      setRate: (rate) => persist({ rate }),
      setSoundOn: (soundOn) => persist({ soundOn }),
      speak,
      stopSpeak,
    };
  }, [prefs]);

  return <KidPrefsContext.Provider value={value}>{children}</KidPrefsContext.Provider>;
}

export function useKidPrefs(): KidPrefsValue {
  const value = useContext(KidPrefsContext);
  if (!value) {
    return {
      ...DEFAULT_VOICE_PREFS,
      setVoiceName: () => undefined,
      setRate: () => undefined,
      setSoundOn: () => undefined,
      speak: (_text, opts) => opts?.onend?.(),
      stopSpeak: () => undefined,
    };
  }
  return value;
}
