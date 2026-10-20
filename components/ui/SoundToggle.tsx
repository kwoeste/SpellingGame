"use client";

import { useKidPrefs } from "@/components/ui/KidPrefs";

export function SoundToggle() {
  const { soundOn, setSoundOn } = useKidPrefs();
  return (
    <button
      type="button"
      className="linkish"
      aria-pressed={soundOn}
      aria-label={soundOn ? "Sound on" : "Sound off"}
      onClick={() => setSoundOn(!soundOn)}
    >
      {soundOn ? "Sound on" : "Sound off"}
    </button>
  );
}
