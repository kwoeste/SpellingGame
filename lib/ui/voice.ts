export const VOICE_NAME_KEY = "mae-voice-name";
export const VOICE_RATE_KEY = "mae-voice-rate";
export const SOUND_KEY = "mae-sound";

export const VOICE_RATES = [
  { value: 0.7, label: "Slow" },
  { value: 0.85, label: "Normal" },
  { value: 1, label: "Fast" },
] as const;

export type VoicePrefs = {
  voiceName: string;
  rate: number;
  soundOn: boolean;
};

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  voiceName: "",
  rate: 0.85,
  soundOn: true,
};

/** Higher score = nicer sounding. Names vary by browser and device. */
export function voiceScore(voice: { lang: string; name: string }): number {
  if (!voice.lang.toLowerCase().startsWith("en")) return -1;
  let score = voice.lang.toLowerCase() === "en-us" ? 2 : 1;
  if (/natural|neural|online/i.test(voice.name)) score += 10;
  if (/Google US English|Samantha|Ava|Allison|Aria|Jenny|Karen|Moira/i.test(voice.name)) score += 5;
  return score;
}

export function rankVoices<T extends { lang: string; name: string }>(voices: T[]): T[] {
  return voices.filter((voice) => voiceScore(voice) >= 0).sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function pickVoice<T extends { name: string }>(voices: T[], preferredName: string): T | undefined {
  return voices.find((voice) => voice.name === preferredName) ?? voices[0];
}

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_VOICE_PREFS.rate;
  return Math.min(1.2, Math.max(0.5, rate));
}

/**
 * Storage can be unavailable (Safari private mode, blocked site data, some in-app browsers):
 * even touching window.localStorage throws a SecurityError. Never let that crash the page.
 */
function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences just won't persist.
  }
}

export function readVoicePrefs(): VoicePrefs {
  if (typeof window === "undefined") return DEFAULT_VOICE_PREFS;
  const rate = clampRate(parseFloat(storageGet(VOICE_RATE_KEY) || ""));
  const sound = storageGet(SOUND_KEY);
  return {
    voiceName: storageGet(VOICE_NAME_KEY) ?? "",
    rate,
    soundOn: sound !== "off",
  };
}

export function writeVoicePrefs(prefs: Partial<VoicePrefs>): VoicePrefs {
  const next = { ...readVoicePrefs(), ...prefs };
  if (typeof window === "undefined") return next;
  storageSet(VOICE_NAME_KEY, next.voiceName);
  storageSet(VOICE_RATE_KEY, String(next.rate));
  storageSet(SOUND_KEY, next.soundOn ? "on" : "off");
  return next;
}

export function applyVoice(utterance: SpeechSynthesisUtterance, prefs: VoicePrefs, voices: SpeechSynthesisVoice[]): void {
  utterance.rate = prefs.rate;
  utterance.lang = "en-US";
  const ranked = rankVoices(voices);
  const voice = pickVoice(ranked, prefs.voiceName);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
}
