"use client";

import { useMemo, useState } from "react";
import type { ChapterPack } from "@/lib/content/types";
import { ReadAloud } from "@/components/ReadAloud";

type Step = "read" | "vocab" | "seq" | "proof" | "done";

export function ChapterPlayer({ chapter }: { chapter: ChapterPack }) {
  const [step, setStep] = useState<Step>("read");
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [proofIdx, setProofIdx] = useState(0);
  const [choice, setChoice] = useState<string>("");
  const [evidence, setEvidence] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [correctCount, setCorrectCount] = useState(0);
  const proofs = chapter.items.filter((item) => item.type === "tap_evidence");
  const proof = proofs[proofIdx];
  const vocabPairs = useMemo(() => chapter.vocab, [chapter]);

  async function submitProof() {
    if (!proof) return;
    const res = await fetch("/api/engine/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submit: {
          sessionId: "local",
          itemId: proof.id,
          response: choice,
        },
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { feedback?: { correct: boolean; explanation: string } };
      setFeedback(json.feedback?.explanation ?? "");
      if (json.feedback?.correct && evidence === proof.evidenceSentenceId) {
        setCorrectCount((n) => n + 1);
      }
    } else {
      const localCorrect = choice === proof.answer && evidence === proof.evidenceSentenceId;
      setFeedback(localCorrect ? proof.feedbackCorrect : proof.feedbackWrong);
      if (localCorrect) setCorrectCount((n) => n + 1);
    }
  }

  return (
    <div className="card">
      {chapter.pendingReligionReview ? (
        <p className="notice">
          Religion content is pending review. Bible translation is {chapter.bibleTranslation || "NABRE"} (configurable).
        </p>
      ) : null}
      <p style={{ color: "var(--soft)" }}>{chapter.bigQuestion}</p>
      {step === "read" ? (
        <>
          <ReadAloud sentences={chapter.sentences} />
          <button className="btn" onClick={() => setStep("vocab")}>
            Next: vocab
          </button>
        </>
      ) : null}
      {step === "vocab" ? (
        <>
          <h3>Match the words</h3>
          {vocabPairs.map((card) => (
            <p key={card.word}>
              <strong>{card.word}</strong>{" "}
              <select
                value={matches[card.word] ?? ""}
                onChange={(e) => setMatches((prev) => ({ ...prev, [card.word]: e.target.value }))}
              >
                <option value="">Choose meaning</option>
                {vocabPairs.map((opt) => (
                  <option key={opt.definition} value={opt.definition}>
                    {opt.definition}
                  </option>
                ))}
              </select>
            </p>
          ))}
          <button
            className="btn"
            onClick={() => {
              const allRight = vocabPairs.every((card) => matches[card.word] === card.definition);
              setFeedback(allRight ? "Yes! Those meanings fit." : "Not yet. Read the word in its sentence and try again.");
              if (allRight) setStep("seq");
            }}
          >
            Check vocab
          </button>
        </>
      ) : null}
      {step === "seq" ? (
        <>
          <h3>Put the events in order</h3>
          <div className="chips">
            {chapter.sequence
              .filter((card) => !order.includes(card.id))
              .map((card) => (
                <button key={card.id} className="tile" onClick={() => setOrder((prev) => [...prev, card.id])}>
                  {card.label}
                </button>
              ))}
          </div>
          <ol>
            {order.map((id) => (
              <li key={id}>{chapter.sequence.find((card) => card.id === id)?.label}</li>
            ))}
          </ol>
          <button
            className="btn"
            onClick={() => {
              const expected = [...chapter.sequence].sort((a, b) => a.order - b.order).map((c) => c.id);
              const ok = JSON.stringify(order) === JSON.stringify(expected);
              setFeedback(ok ? "That's the right order." : "Not yet. Think first, next, last.");
              if (ok) setStep("proof");
            }}
          >
            Check order
          </button>
        </>
      ) : null}
      {step === "proof" && proof ? (
        <>
          <h3>Tap the sentence that proves it</h3>
          <p>{proof.stem}</p>
          <div className="grid">
            {(proof.options ?? []).map((opt) => (
              <button key={opt} className={`option ${choice === opt ? "selected" : ""}`} onClick={() => setChoice(opt)}>
                {opt}
              </button>
            ))}
          </div>
          <p>Which sentence proves your answer?</p>
          {chapter.sentences.map((sentence) => (
            <button
              key={sentence.id}
              className={`option ${evidence === sentence.id ? "selected" : ""}`}
              onClick={() => setEvidence(sentence.id)}
            >
              {sentence.text}
            </button>
          ))}
          <button className="btn" onClick={submitProof} style={{ marginTop: 12 }}>
            Check
          </button>
          {proofIdx < proofs.length - 1 ? (
            <button className="btn secondary" onClick={() => { setProofIdx((n) => n + 1); setChoice(""); setEvidence(""); }}>
              Next question
            </button>
          ) : (
            <button className="btn secondary" onClick={() => setStep("done")}>
              Finish chapter check
            </button>
          )}
        </>
      ) : null}
      {step === "done" ? (
        <div>
          <h3>Nice work</h3>
          <p>
            You finished this chapter pack. Mastery still needs a 90% gate on a fresh item set. Score so far: {correctCount} of{" "}
            {proofs.length} proof items.
          </p>
        </div>
      ) : null}
      {feedback ? <p>{feedback}</p> : null}
    </div>
  );
}
