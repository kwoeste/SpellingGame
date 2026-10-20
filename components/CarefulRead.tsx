"use client";

import { useEffect, useMemo, useState } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { flattenPassage, type ReadableWord } from "@/lib/ui/careful-read";

type Mode = "tap" | "reveal";

export function CarefulRead({
  sentences,
  highlightId,
  onReady,
  showVoice = true,
}: {
  sentences: { id: string; text: string }[];
  highlightId?: string | null;
  onReady?: (ready: boolean) => void;
  showVoice?: boolean;
}) {
  const prefs = useKidPrefs();
  const words = useMemo(() => flattenPassage(sentences), [sentences]);
  const [mode, setMode] = useState<Mode>("tap");
  const [tapped, setTapped] = useState<Set<number>>(() => new Set());
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  const ready = mode === "tap" ? tapped.size >= words.length : revealed >= words.length;

  useEffect(() => {
    onReady?.(ready);
  }, [onReady, ready]);

  useEffect(() => {
    if (mode !== "reveal" || revealed >= words.length) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(words.length);
      return;
    }
    const timer = window.setTimeout(() => setRevealed((n) => n + 1), 280);
    return () => window.clearTimeout(timer);
  }, [mode, revealed, words.length]);

  function tapWord(index: number) {
    setTapped((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setActive(index);
  }

  function startAloud() {
    if (playing) {
      prefs.stopSpeak();
      setPlaying(false);
      setActive(null);
      return;
    }
    setPlaying(true);
    setMode("tap");
    const full = sentences.map((s) => s.text).join(" ");
    prefs.speak(full, {
      onboundary: (charIndex) => {
        let idx = 0;
        let walking = 0;
        for (let i = 0; i < words.length; i += 1) {
          walking += words[i].text.length + 1;
          if (charIndex < walking) {
            idx = i;
            break;
          }
        }
        setActive(idx);
        setTapped((prev) => {
          const next = new Set(prev);
          for (let i = 0; i <= idx; i += 1) next.add(i);
          return next;
        });
      },
      onend: () => {
        setPlaying(false);
        setTapped(new Set(words.map((_, i) => i)));
        setActive(null);
      },
    });
  }

  function wordClass(index: number, word: ReadableWord): string {
    const sentence = sentences[word.sentenceIdx];
    const classes = ["word-btn", "word"];
    if (sentence?.id === highlightId) classes.push("proving");
    if (active === index) classes.push("active");
    if (mode === "reveal" && index >= revealed) classes.push("hidden-word");
    if (tapped.has(index)) classes.push("tapped");
    return classes.join(" ");
  }

  return (
    <div>
      <div className="chips" style={{ marginBottom: 10 }}>
        <button type="button" className="btn secondary" onClick={startAloud} aria-pressed={playing}>
          {playing ? "Stop reading" : "Read aloud"}
        </button>
        <button
          type="button"
          className="btn secondary"
          aria-pressed={mode === "tap"}
          onClick={() => setMode("tap")}
        >
          Tap each word
        </button>
        <button
          type="button"
          className="btn secondary"
          aria-pressed={mode === "reveal"}
          onClick={() => {
            setMode("reveal");
            setRevealed(0);
          }}
        >
          Reveal slowly
        </button>
      </div>
      {showVoice ? <VoicePicker compact /> : null}
      <p className="careful-read">
        {words.map((word, index) => (
          <button
            key={`${word.sentenceIdx}-${word.start}`}
            type="button"
            className={wordClass(index, word)}
            onClick={() => tapWord(index)}
          >
            {word.text}
          </button>
        ))}
      </p>
      <p style={{ color: "var(--muted)", fontWeight: 800 }}>
        {ready ? "Nice careful reading." : "Tap every word as you read — no skipping."}
      </p>
    </div>
  );
}
