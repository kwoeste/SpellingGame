"use client";

import { useEffect, useRef, useState } from "react";
import { answerUnlockMs } from "@/lib/ui/careful-read";
import type { WatchListen as WatchListenData } from "@/lib/content/nlm";

/** Modalities logged as `media_event` so learns-best reporting can count video / podcast / flashcards. */
export type MediaModality = "video" | "podcast" | "flashcards";

export function logMedia(chapterId: string, modality: MediaModality, action: string, extra: Record<string, unknown> = {}) {
  void fetch("/api/engine/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      events: [{ id: crypto.randomUUID(), type: "media_event", activityId: chapterId, clientTs: Date.now(), payload: { modality, action, ...extra } }],
    }),
  }).catch(() => undefined);
}

export function mediaHandlers(chapterId: string, modality: MediaModality, extra: Record<string, unknown> = {}, onStart?: () => void) {
  const started = { current: false };
  return {
    onPlay: () => {
      if (!started.current) logMedia(chapterId, modality, "play", extra);
      started.current = true;
      onStart?.();
    },
    onEnded: (e: React.SyntheticEvent<HTMLMediaElement>) => logMedia(chapterId, modality, "complete", { ...extra, seconds: Math.round(e.currentTarget.duration || 0) }),
  };
}

export function Flashcards({ chapterId, cards, extra = {}, onFlip }: { chapterId: string; cards: WatchListenData["flashcards"]; extra?: Record<string, unknown>; onFlip?: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const seen = useRef(new Set<number>());
  const card = cards[index];

  // Read-carefully: the flip button unlocks only after a short pause sized to the question.
  useEffect(() => {
    setCanFlip(false);
    const t = window.setTimeout(() => setCanFlip(true), answerUnlockMs(card.front.split(/\s+/).length));
    return () => window.clearTimeout(t);
  }, [index, card.front]);

  function flip() {
    if (!canFlip) return;
    setFlipped((f) => !f);
    onFlip?.();
    if (!flipped && !seen.current.has(index)) {
      seen.current.add(index);
      logMedia(chapterId, "flashcards", seen.current.size === cards.length ? "complete" : "flip", { ...extra, card: index, seen: seen.current.size, total: cards.length });
    }
  }

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
  }

  return (
    <div className="flashcards">
      <p className="kid-kicker">
        Card {index + 1} of {cards.length}
      </p>
      <button type="button" className="flashcard" aria-live="polite" onClick={flip} disabled={!canFlip && !flipped} data-flipped={flipped}>
        <span className="flashcard-label">{flipped ? "Answer" : "Question"}</span>
        <span className="flashcard-text">{flipped ? card.back : card.front}</span>
        <span className="flashcard-hint">{flipped ? "Tap to see the question" : canFlip ? "Think first, then tap to flip" : "Read it carefully…"}</span>
      </button>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={() => go(-1)}>
          Back
        </button>
        <button type="button" className="btn" onClick={() => go(1)}>
          Next card
        </button>
      </div>
    </div>
  );
}

export function WatchListen({ data }: { data: WatchListenData }) {
  const [tab, setTab] = useState<MediaModality>(data.video ? "video" : data.audio ? "podcast" : "flashcards");
  const video = mediaHandlers(data.chapterId, "video");
  const audio = mediaHandlers(data.chapterId, "podcast");
  const tabs: { id: MediaModality; label: string; show: boolean }[] = [
    { id: "video", label: "Video", show: Boolean(data.video) },
    { id: "podcast", label: "Podcast", show: Boolean(data.audio) },
    { id: "flashcards", label: "Flashcards", show: data.flashcards.length > 0 },
  ];
  return (
    <section className="card watch-listen" aria-label="Watch and listen" style={{ marginTop: 20 }}>
      <h2>Watch &amp; listen</h2>
      <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="btn" style={{ opacity: tab === t.id ? 1 : 0.6 }} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
      </div>
      <div style={{ marginTop: 12 }}>
        {tab === "video" && data.video ? (
          <video controls preload="metadata" playsInline controlsList="nodownload" style={{ width: "100%", borderRadius: 12 }} src={data.video} onPlay={video.onPlay} onEnded={video.onEnded} />
        ) : null}
        {tab === "podcast" && data.audio ? (
          <audio controls preload="metadata" controlsList="nodownload" style={{ width: "100%" }} src={data.audio} onPlay={audio.onPlay} onEnded={audio.onEnded} />
        ) : null}
        {tab === "flashcards" && data.flashcards.length > 0 ? <Flashcards chapterId={data.chapterId} cards={data.flashcards} /> : null}
      </div>
    </section>
  );
}

/** NotebookLM media as the first step of a teach / re-teach ("Start with the video, then practice"). */
export function MediaStart({
  data,
  modality,
  context,
  onDone,
}: {
  data: WatchListenData;
  modality: "nlm_video" | "nlm_podcast" | "nlm_flashcards";
  context: "first_teach" | "reteach";
  onDone: () => void;
}) {
  const [started, setStarted] = useState(false);
  const extra = { context, start: true };
  const video = mediaHandlers(data.chapterId, "video", extra, () => setStarted(true));
  const audio = mediaHandlers(data.chapterId, "podcast", extra, () => setStarted(true));
  const label = modality === "nlm_video" ? "Watch the video" : modality === "nlm_podcast" ? "Listen to the podcast" : "Flip through the flashcards";
  return (
    <div className="media-start">
      <p className="kid-kicker">{label}, then practice</p>
      {modality === "nlm_video" && data.video ? (
        <video controls preload="metadata" playsInline controlsList="nodownload" style={{ width: "100%", borderRadius: 12 }} src={data.video} onPlay={video.onPlay} onEnded={video.onEnded} />
      ) : null}
      {modality === "nlm_podcast" && data.audio ? (
        <audio controls preload="metadata" controlsList="nodownload" style={{ width: "100%" }} src={data.audio} onPlay={audio.onPlay} onEnded={audio.onEnded} />
      ) : null}
      {modality === "nlm_flashcards" && data.flashcards.length > 0 ? <Flashcards chapterId={data.chapterId} cards={data.flashcards} extra={extra} onFlip={() => setStarted(true)} /> : null}
      <button type="button" className="btn" onClick={onDone} disabled={!started} style={{ marginTop: 12 }}>
        {started ? "I'm ready to practice" : modality === "nlm_flashcards" ? "Flip a card first" : "Press play first"}
      </button>
    </div>
  );
}
