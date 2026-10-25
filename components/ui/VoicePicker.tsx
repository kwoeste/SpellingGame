"use client";

import { useEffect, useState } from "react";
import { VOICE_RATES, rankVoices } from "@/lib/ui/voice";
import { GROK_PREFIX, GROK_VOICES } from "@/lib/tts/core";
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

  // Show the voice that will really be used. With no Grok key, Grok voices are hidden entirely.
  const selected = prefs.activeVoiceName || voices[0]?.name || "";

  return (
    <div className="voice-panel" role="group" aria-label="Voice options">
      <label>
        Voice
        <select
          value={selected}
          onChange={(e) => prefs.setVoiceName(e.target.value)}
          aria-label="Choose a reading voice"
        >
          {prefs.grokEnabled ? (
            <optgroup label="Grok voices">
              {GROK_VOICES.map((voice) => (
                <option key={voice.id} value={`${GROK_PREFIX}${voice.id}`}>
                  {voice.kidName}
                </option>
              ))}
            </optgroup>
          ) : null}
          {voices.length === 0 ? <option value="">Browser voice</option> : null}
          {prefs.grokEnabled && voices.length > 0 ? (
            <optgroup label="Device voices">
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </optgroup>
          ) : (
            voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name}
              </option>
            ))
          )}
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
