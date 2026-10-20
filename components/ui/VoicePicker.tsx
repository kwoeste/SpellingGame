"use client";

import { useEffect, useState } from "react";
import { VOICE_RATES, rankVoices } from "@/lib/ui/voice";
import { useKidPrefs } from "@/components/ui/KidPrefs";

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const prefs = useKidPrefs();
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    
    function load() {
      const available = synth.getVoices();
      if (available.length > 0) {
        setVoices(rankVoices(available));
      }
    }
    
    load();
    synth.addEventListener("voiceschanged", load);
    
    const fallback = setTimeout(load, 500);
    const retry = setTimeout(load, 1500);
    
    return () => {
      synth.removeEventListener("voiceschanged", load);
      clearTimeout(fallback);
      clearTimeout(retry);
    };
  }, []);

  useEffect(() => {
    if (!prefs.voiceName && voices[0]) prefs.setVoiceName(voices[0].name);
  }, [prefs, voices]);

  return (
    <div className="voice-panel" role="group" aria-label="Voice options">
      <label>
        Voice
        <select
          value={prefs.voiceName}
          onChange={(e) => prefs.setVoiceName(e.target.value)}
          aria-label="Choose a reading voice"
        >
          {voices.length === 0 ? <option value="">Browser voice</option> : null}
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Speed
        <select
          value={String(prefs.rate)}
          onChange={(e) => prefs.setRate(Number(e.target.value))}
          aria-label="Reading speed"
        >
          {VOICE_RATES.map((rate) => (
            <option key={rate.value} value={rate.value}>
              {rate.label}
            </option>
          ))}
        </select>
      </label>
      {compact ? null : (
        <button type="button" className="btn secondary" onClick={() => prefs.speak("Hi! I am your reading voice.")}>
          Try voice
        </button>
      )}
    </div>
  );
}
