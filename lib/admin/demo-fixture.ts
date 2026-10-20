/**
 * Synthetic dashboard rows for unit tests and the DEV/PREVIEW seed script.
 * Never imported by production request paths. Do not call this from /admin pages.
 */
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import type { DashboardSnapshot } from "@/lib/admin/dashboard";
import type { AdminEventRow, AdminMasteryRow, PlaySession } from "@/lib/engine/repo";

const LEARNER = SEEDED_LEARNER_ID;

export function demoSnapshot(now = Date.parse("2026-10-20T19:10:00-04:00")): DashboardSnapshot {
  const day = 24 * 60 * 60 * 1000;
  const session: PlaySession = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    learnerId: LEARNER,
    startedAt: now - 2 * day,
    lastEventAt: now - 2 * day + 12 * 60_000,
    endedAt: now - 2 * day + 12 * 60_000,
    entryPoint: "study",
    resumeState: { chapterId: "savvas.ch1", activityId: null, itemId: null, scaffoldLevel: 0 },
    isPreview: false,
    rollingSuccess: 0.74,
    scoredCount: 6,
    consecutiveHigh: 0,
    outOfBand: 0,
  };
  const mastery: AdminMasteryRow[] = [
    {
      learnerId: LEARNER,
      conceptId: "math.nf.compare_unlike",
      pMastery: 0.42,
      theta: -0.3,
      thetaN: 5,
      state: "in_progress",
      attempts: 5,
      correctUnhinted: 1,
      gatePassedAt: null,
      lastPracticedAt: now - day,
    },
    {
      learnerId: LEARNER,
      conceptId: "math.nf.equivalence_n_times",
      pMastery: 0.28,
      theta: -0.6,
      thetaN: 4,
      state: "missing",
      attempts: 4,
      correctUnhinted: 0,
      gatePassedAt: null,
      lastPracticedAt: now - 3 * day,
    },
    {
      learnerId: LEARNER,
      conceptId: "savvas.ch1.knowledge",
      pMastery: 0.96,
      theta: 0.5,
      thetaN: 8,
      state: "mastered",
      attempts: 8,
      correctUnhinted: 7,
      gatePassedAt: now - 4 * day,
      lastPracticedAt: now - 4 * day,
    },
  ];
  const events: AdminEventRow[] = [
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      sessionId: session.id,
      learnerId: LEARNER,
      seq: 1,
      clientTs: null,
      serverTs: now - 2 * day + 3 * 60_000,
      type: "answer_submitted",
      itemId: "savvas.ch1.q1",
      activityId: "savvas.ch1.check",
      attemptNo: 1,
      response: "A tool you buy",
      isCorrect: false,
      latencyMs: 1100,
      hintLevel: 0,
      payload: {
        chapter_id: "savvas.ch1",
        item_stem: "What is an observation?",
        correct_answer: "Something you notice with your senses",
        subject: "science",
        concept_id: "savvas.ch1.knowledge",
      },
      isPreview: false,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
      sessionId: session.id,
      learnerId: LEARNER,
      seq: 2,
      clientTs: null,
      serverTs: now - 2 * day + 6 * 60_000,
      type: "answer_submitted",
      itemId: "savvas.ch1.q2",
      activityId: "savvas.ch1.check",
      attemptNo: 1,
      response: "So the test is fair",
      isCorrect: true,
      latencyMs: 9000,
      hintLevel: 0,
      payload: { chapter_id: "savvas.ch1", item_stem: "Why change only one variable?", subject: "science" },
      isPreview: false,
    },
  ];
  return {
    learnerId: LEARNER,
    nickname: "Mae",
    now,
    mastery,
    events,
    sessions: [session],
    reviews: [
      {
        learnerId: LEARNER,
        targetType: "concept",
        targetId: "savvas.ch1.knowledge",
        box: 2,
        dueAt: now - 60_000,
        lastResult: "pass",
        lapses: 0,
      },
    ],
    xp: [
      { learnerId: LEARNER, sessionId: session.id, minuteStart: now - 2 * day + 3 * 60_000, xp: 10 },
      { learnerId: LEARNER, sessionId: session.id, minuteStart: now - 2 * day + 6 * 60_000, xp: 10 },
      { learnerId: LEARNER, sessionId: session.id, minuteStart: now - 60_000, xp: 10 },
    ],
    strategies: [
      {
        eventId: events[0]!.id,
        learnerId: LEARNER,
        conceptId: "savvas.ch1.knowledge",
        strategy: "guess",
        source: "inferred_rules",
        confidence: 0.7,
        misconception: null,
        isCorrect: false,
      },
    ],
    assignments: [],
    goal: null,
    gatedChapterIds: ["savvas.ch1"],
  };
}
