"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StepView } from "@/components/ChapterPlayer";
import { Mascot } from "@/components/ui/Mascot";
import type { StudentChapter, StudentStep } from "@/lib/content/student";

export type WarmUpEntry = { chapter: StudentChapter; step: StudentStep };

const HEARTBEAT_MS = 30_000;
const ACTIVE_WINDOW_MS = 45_000;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`request_failed_${res.status}`);
  return (await res.json()) as T;
}

/** Spaced-review warm-up: a few quick questions from earlier chapters, scored in review mode. */
export function WarmUp({ entries }: { entries: WarmUpEntry[] }) {
  const [index, setIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!entries.length) return;
    post<{ session_id: string | null }>("/api/engine/session/start", { entry: "study", chapterId: entries[0].chapter.id })
      .then((json) => setSessionId(json.session_id))
      .catch(() => undefined);
  }, [entries]);

  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", mark);
    window.addEventListener("keydown", mark);
    const timer = window.setInterval(() => {
      if (!sessionId || document.visibilityState !== "visible" || Date.now() - lastActivity.current > ACTIVE_WINDOW_MS) return;
      void post("/api/engine/events", {
        sessionId,
        events: [{ id: crypto.randomUUID(), type: "heartbeat", clientTs: Date.now(), payload: { visible: true } }],
      }).catch(() => undefined);
    }, HEARTBEAT_MS);
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      window.clearInterval(timer);
    };
  }, [sessionId]);

  if (!entries.length || index >= entries.length) {
    return (
      <section className="kid-card warmup-done" style={{ textAlign: "center" }}>
        <Mascot mood="cheer" size={120} />
        <h2>{entries.length ? "Warm-up done!" : "Nothing to review right now!"}</h2>
        {entries.length ? <p>You worked through {entries.length} review{entries.length === 1 ? "" : "s"}{right ? ` (${right} right)` : ""}. Your brain is warmed up.</p> : <p>Your reviews are all caught up.</p>}
        <Link className="btn" href="/study">Back to today&apos;s plan</Link>
      </section>
    );
  }
  const entry = entries[index];
  return (
    <section aria-label="Warm-up">
      <p className="kid-kicker">
        Warm-up {index + 1} of {entries.length} · from {entry.chapter.titleKid}
      </p>
      <StepView
        key={entry.step.itemId}
        step={entry.step}
        number={index + 1}
        total={entries.length}
        chapter={entry.chapter}
        sessionId={sessionId}
        mode="review"
        onAnswered={(feedback) => {
          if (feedback.session_id) setSessionId(feedback.session_id);
        }}
        onNext={(feedback) => {
          if (feedback.correct) setRight((n) => n + 1);
          setIndex((i) => i + 1);
        }}
      />
    </section>
  );
}
