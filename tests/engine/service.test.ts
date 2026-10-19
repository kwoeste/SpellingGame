import { beforeEach, describe, expect, it } from "vitest";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { toStudentChapter } from "@/lib/content/student";
import type { ChapterItem, ChapterPack } from "@/lib/content/types";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import {
  EngineError,
  SESSION_IDLE_MS,
  progressSummary,
  recordEvents,
  resumePoint,
  startSession,
  submitAnswer,
  type EngineActor,
} from "@/lib/engine/service";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const otherKid: EngineActor = { role: "student", learnerId: "22222222-2222-2222-2222-222222222222" };
const admin: EngineActor = { role: "admin", learnerId: null };
const repo = memoryEngineRepo;
const T0 = Date.parse("2026-10-19T14:00:00Z");

function chapter(id = "savvas.ch1"): ChapterPack {
  const found = getChapter(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

function rightAnswer(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: item.answer, evidence: item.evidenceSentenceId };
  return item.answer;
}

function wrongAnswer(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: "definitely not it", evidence: item.evidenceSentenceId };
  if (item.type === "drag_order") return [...(item.answer as string[])].reverse();
  if (item.type === "drag_match") return {};
  return "nope";
}

async function answerAll(ch: ChapterPack, sessionId: string, now: number, wrongFirst?: string) {
  let last = null;
  let t = now;
  for (const item of ch.items) {
    if (item.id === wrongFirst) {
      await submitAnswer(repo, mae, { sessionId, itemId: item.id, response: wrongAnswer(item), latencyMs: 8000, now: (t += 5000) });
    }
    last = await submitAnswer(repo, mae, { sessionId, itemId: item.id, response: rightAnswer(item), latencyMs: 8000, now: (t += 5000) });
  }
  return last;
}

describe("engine service", () => {
  beforeEach(() => resetMemoryRepo());

  it("scores on the server and ignores client-claimed answers", async () => {
    const ch = chapter();
    const { sessionId } = await startSession(repo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    const claimed = await recordEvents(repo, mae, {
      sessionId,
      events: [{ type: "answer_submitted", itemId: ch.items[2].id, isCorrect: true } as never],
      now: T0 + 1000,
    });
    expect(claimed).toMatchObject({ accepted: 0, rejected: 1 });
    expect(await memoryAdminRepo.mastery()).toEqual([]);

    const wrong = await submitAnswer(repo, mae, { sessionId, itemId: ch.items[2].id, response: wrongAnswer(ch.items[2]), latencyMs: 9000, now: T0 + 2000 });
    expect(wrong.correct).toBe(false);
    expect(wrong.proving_sentence).toBeTruthy();
    const right = await submitAnswer(repo, mae, { sessionId, itemId: ch.items[2].id, response: rightAnswer(ch.items[2]), latencyMs: 9000, now: T0 + 3000 });
    expect(right.correct).toBe(true);
  });

  it("tap-evidence needs both the answer and the proving sentence", async () => {
    const item = chapter().items.find((row) => row.type === "tap_evidence" && row.evidenceSentenceId);
    if (!item) throw new Error("no evidence item");
    const half = await submitAnswer(repo, admin, { itemId: item.id, response: { choice: item.answer, evidence: "nope" } });
    expect(half.correct).toBe(false);
    expect(half.explanation).toMatch(/find the sentence/i);
  });

  it("never writes into another learner's session", async () => {
    const theirs = await startSession(repo, otherKid, { entryPoint: "study", now: T0 });
    const ch = chapter();
    const feedback = await submitAnswer(repo, mae, { sessionId: theirs.sessionId, itemId: ch.items[0].id, response: rightAnswer(ch.items[0]), now: T0 + 1000 });
    expect(feedback.session_id).not.toBe(theirs.sessionId);
    const events = await memoryAdminRepo.events(10);
    expect(events.every((event) => event.learnerId === SEEDED_LEARNER_ID)).toBe(true);
    expect(events.every((event) => event.sessionId === feedback.session_id)).toBe(true);
  });

  it("passes the chapter gate only at 90%+ first-try accuracy and awards a star", async () => {
    const ch = chapter();
    const { sessionId } = await startSession(repo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    const missed = await answerAll(ch, sessionId as string, T0, ch.items[3].id);
    expect(missed?.gate).toMatchObject({ passed: false, correct: ch.items.length - 1 });
    expect(missed?.chapter).toMatchObject({ nextStep: 0, starEarned: false, lastTry: "not_yet" });

    const clean = await answerAll(ch, sessionId as string, T0 + 120_000);
    expect(clean?.gate).toMatchObject({ passed: true, correct: ch.items.length });
    expect(clean?.chapter).toMatchObject({ starEarned: true, lastTry: "passed" });
    const summary = await progressSummary(repo, mae, T0 + 200_000);
    expect(summary.badges).toContain(`${ch.id}-star`);
    expect(summary.rings.find((ring) => ring.id === ch.id)?.pct).toBe(100);
  });

  it("schedules reviews: right first try waits a day, a miss comes back in 15 minutes", async () => {
    const ch = chapter();
    const { sessionId } = await startSession(repo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    await submitAnswer(repo, mae, { sessionId, itemId: ch.items[2].id, response: rightAnswer(ch.items[2]), latencyMs: 9000, now: T0 });
    await submitAnswer(repo, mae, { sessionId, itemId: ch.items[3].id, response: wrongAnswer(ch.items[3]), latencyMs: 9000, now: T0 });
    await repo.withLearner(SEEDED_LEARNER_ID, async (tx) => {
      expect(await tx.getReview("item", ch.items[2].id)).toMatchObject({ box: 1, dueAt: T0 + 86_400_000 });
      expect(await tx.getReview("item", ch.items[3].id)).toMatchObject({ box: 0, dueAt: T0 + 15 * 60_000 });
    });
  });

  it("awards XP once per session-minute", async () => {
    const ch = chapter();
    const { sessionId } = await startSession(repo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    await recordEvents(repo, mae, { sessionId, events: [{ type: "heartbeat", payload: { visible: true } }], now: T0 + 1000 });
    await recordEvents(repo, mae, { sessionId, events: [{ type: "heartbeat", payload: { visible: true } }], now: T0 + 20_000 });
    await recordEvents(repo, mae, { sessionId, events: [{ type: "heartbeat", payload: { visible: false } }], now: T0 + 70_000 });
    expect((await progressSummary(repo, mae, T0 + 80_000)).xp_today).toBe(10);
  });

  it("keeps religion chapters from the student until approved; admin previews without saving", async () => {
    const religion = listChapters().find((row) => row.pendingReligionReview);
    if (!religion) throw new Error("expected a pending religion chapter");
    await expect(startSession(repo, mae, { entryPoint: "study", chapterId: religion.id })).rejects.toMatchObject({ status: 403 });
    await expect(submitAnswer(repo, mae, { itemId: religion.items[0].id, response: "x" })).rejects.toBeInstanceOf(EngineError);
    const preview = await submitAnswer(repo, admin, { itemId: religion.items[0].id, response: rightAnswer(religion.items[0]) });
    expect(preview).toMatchObject({ preview: true, correct: true });
    expect(await memoryAdminRepo.counts()).toEqual({ events: 0, mastery: 0, reviews: 0 });
    const summary = await progressSummary(repo, mae);
    expect(summary.rings.some((ring) => ring.id === religion.id)).toBe(false);
  });

  it("starts a new session after 30 idle minutes and keeps the resume point", async () => {
    const ch = chapter();
    const first = await startSession(repo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    await submitAnswer(repo, mae, { sessionId: first.sessionId, itemId: ch.items[0].id, response: rightAnswer(ch.items[0]), latencyMs: 9000, now: T0 + 1000 });
    const again = await startSession(repo, mae, { entryPoint: "study", now: T0 + 5 * 60_000 });
    expect(again.sessionId).toBe(first.sessionId);
    const later = await startSession(repo, mae, { entryPoint: "study", now: T0 + 5 * 60_000 + SESSION_IDLE_MS + 1 });
    expect(later.sessionId).not.toBe(first.sessionId);
    const resume = await resumePoint(repo, mae);
    expect(resume).toMatchObject({ chapterId: ch.id, progress: { nextStep: 1 } });
  });

  it("zone controller waits for five scored answers before adapting", async () => {
    const ch = chapter();
    const { sessionId } = await startSession(repo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    for (let i = 0; i < 4; i += 1) {
      const item = ch.items[i % ch.items.length];
      await submitAnswer(repo, mae, { sessionId, itemId: item.id, response: wrongAnswer(item), latencyMs: 9000, now: T0 + i * 1000 });
    }
    expect(await memoryAdminRepo.decisions(10)).toEqual([]);
  });

  it("student chapter payloads carry no answer keys or wrong-answer feedback", () => {
    for (const ch of listChapters()) {
      const json = JSON.stringify(toStudentChapter(ch));
      expect(json).not.toMatch(/"answer"|feedbackWrong|feedbackCorrect|evidenceSentenceId|"order":/);
    }
  });
});
