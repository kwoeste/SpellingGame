"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  sentences: { id: string; text: string }[];
  /** A sentence to call out (for example the one that proves an answer). */
  highlightId?: string | null;
};

type Word = { sentenceIdx: number; start: number; text: string };

function splitWords(text: string, sentenceIdx: number): Word[] {
  const words: Word[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) words.push({ sentenceIdx, start: match.index, text: match[0] });
  return words;
}

/**
 * Karaoke read-aloud: one utterance per sentence, highlighting the word the voice is on via
 * `boundary` events. Voices that never fire boundaries fall back to an estimated pace.
 */
export function ReadAloud({ sentences, highlightId }: Props) {
  const perSentence = useMemo(() => sentences.map((s, idx) => splitWords(s.text, idx)), [sentences]);
  const [active, setActive] = useState<{ sentence: number; word: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const runId = useRef(0);

  function clearFallback() {
    if (fallbackTimer.current !== null) window.clearInterval(fallbackTimer.current);
    fallbackTimer.current = null;
  }

  function stop() {
    runId.current += 1;
    clearFallback();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
    setActive(null);
  }

  function speakSentence(idx: number, run: number) {
    if (run !== runId.current) return;
    if (idx >= sentences.length) {
      stop();
      return;
    }
    const words = perSentence[idx];
    const utterance = new SpeechSynthesisUtterance(sentences[idx].text);
    utterance.rate = 0.9;
    let sawBoundary = false;
    setActive({ sentence: idx, word: 0 });
    utterance.onboundary = (event) => {
      if (event.name && event.name !== "word") return;
      sawBoundary = true;
      clearFallback();
      let wordIdx = 0;
      for (let i = 0; i < words.length; i += 1) if (words[i].start <= event.charIndex) wordIdx = i;
      setActive({ sentence: idx, word: wordIdx });
    };
    utterance.onstart = () => {
      window.setTimeout(() => {
        if (sawBoundary || run !== runId.current) return;
        let w = 0;
        fallbackTimer.current = window.setInterval(() => {
          w = Math.min(words.length - 1, w + 1);
          setActive({ sentence: idx, word: w });
        }, 380);
      }, 600);
    };
    utterance.onend = () => {
      clearFallback();
      speakSentence(idx + 1, run);
    };
    utterance.onerror = () => stop();
    window.speechSynthesis.speak(utterance);
  }

  function start() {
    if (!("speechSynthesis" in window)) return;
    stop();
    const run = runId.current;
    setPlaying(true);
    speakSentence(0, run);
  }

  useEffect(() => stop, []);

  return (
    <div>
      <button className="btn secondary" type="button" onClick={playing ? stop : start} aria-pressed={playing}>
        {playing ? "Stop reading" : "Read aloud"}
      </button>
      <div style={{ fontSize: "1.2rem", lineHeight: 1.8 }}>
        {perSentence.map((words, sIdx) => (
          <span
            key={sentences[sIdx].id}
            className={`sentence ${sentences[sIdx].id === highlightId ? "proving" : ""}`}
          >
            {words.map((word, wIdx) => (
              <span
                key={wIdx}
                className={`word ${active?.sentence === sIdx && active.word === wIdx ? "active" : ""}`}
              >
                {word.text}{" "}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
