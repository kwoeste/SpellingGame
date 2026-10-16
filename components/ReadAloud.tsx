"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  sentences: { id: string; text: string }[];
  autoStart?: boolean;
};

export function ReadAloud({ sentences, autoStart }: Props) {
  const words = useMemo(
    () =>
      sentences.flatMap((sentence) =>
        sentence.text.split(/\s+/).map((word) => ({ sentenceId: sentence.id, word })),
      ),
    [sentences],
  );
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);

  function speak() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setPlaying(true);
    setActive(0);
    const full = new SpeechSynthesisUtterance(sentences.map((s) => s.text).join(" "));
    full.rate = 0.9;
    const parts = sentences.map((s) => s.text.split(/\s+/).length);
    let spoken = 0;
    const timer = window.setInterval(() => {
      spoken += 1;
      setActive((prev) => Math.min(words.length - 1, prev + 1));
      if (spoken >= parts.reduce((a, b) => a + b, 0)) window.clearInterval(timer);
    }, 320);
    full.onend = () => {
      window.clearInterval(timer);
      setPlaying(false);
      setActive(-1);
    };
    window.speechSynthesis.speak(full);
  }

  useEffect(() => {
    if (autoStart) speak();
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, sentences.map((s) => s.id).join(",")]);

  return (
    <div>
      <button className="btn secondary" type="button" onClick={speak} disabled={playing}>
        {playing ? "Reading…" : "Read aloud"}
      </button>
      <p style={{ fontSize: "1.2rem", lineHeight: 1.8 }}>
        {words.map((item, idx) => (
          <span key={`${item.sentenceId}-${idx}`} className={`word ${idx === active ? "active" : ""}`}>
            {item.word}{" "}
          </span>
        ))}
      </p>
    </div>
  );
}
