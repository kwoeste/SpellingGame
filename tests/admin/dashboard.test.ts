import { describe, expect, it } from "vitest";
import { buildAssignments, buildKnowledgeNodes, buildOverview, buildProgress, suggestedHoleAssignments, type DashboardSnapshot } from "@/lib/admin/dashboard";
import { detectHoles } from "@/lib/admin/holes";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import type { AdminEventRow, AdminMasteryRow, PlaySession } from "@/lib/engine/repo";

const NOW = Date.parse("2026-10-20T16:00:00-04:00");

function snap(partial: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    learnerId: SEEDED_LEARNER_ID,
    nickname: "Mae",
    now: NOW,
    mastery: [],
    events: [],
    sessions: [],
    reviews: [],
    xp: [],
    strategies: [],
    assignments: [],
    goal: null,
    gatedChapterIds: [],
    ...partial,
  };
}

function event(over: Partial<AdminEventRow> & Pick<AdminEventRow, "id" | "isCorrect">): AdminEventRow {
  return {
    sessionId: "sess-1",
    learnerId: SEEDED_LEARNER_ID,
    seq: 1,
    clientTs: null,
    serverTs: NOW - 60_000,
    type: "answer_submitted",
    itemId: "savvas.ch1.q1",
    activityId: "savvas.ch1.check",
    attemptNo: 1,
    response: "A tool you buy",
    latencyMs: 9000,
    hintLevel: 0,
    payload: { chapter_id: "savvas.ch1", item_stem: "What is an observation?", correct_answer: "Something you notice with your senses" },
    isPreview: false,
    ...over,
  };
}

describe("admin dashboard aggregations", () => {
  it("shows empty-state zeros when Mae has not played", () => {
    const overview = buildOverview(snap());
    expect(overview.xpTotal).toBe(0);
    expect(overview.itemsCompleted).toBe(0);
    expect(overview.firstTryAccuracy).toBeNull();
    expect(overview.inTargetBand).toBeNull();
    expect(overview.alerts).toEqual([]);
    expect(overview.rings.every((ring) => ring.pct === 0 || ring.id === "review")).toBe(true);
  });

  it("computes time, XP, accuracy band, and streak from first-try answers", () => {
    const overview = buildOverview(
      snap({
        xp: [
          { learnerId: SEEDED_LEARNER_ID, sessionId: "s1", minuteStart: NOW - 60_000, xp: 10 },
          { learnerId: SEEDED_LEARNER_ID, sessionId: "s1", minuteStart: NOW - 120_000, xp: 10 },
        ],
        events: [
          event({ id: "e1", isCorrect: true, latencyMs: 8000 }),
          event({ id: "e2", isCorrect: true, itemId: "savvas.ch1.q2", latencyMs: 7000 }),
          event({ id: "e3", isCorrect: false, itemId: "savvas.ch1.vocab", latencyMs: 9000 }),
        ],
      }),
    );
    expect(overview.xpTotal).toBe(20);
    expect(overview.engagedMinutesToday).toBe(2);
    expect(overview.firstTryAccuracy).toBeCloseTo(2 / 3);
    expect(overview.inTargetBand).toBe(false);
    expect(overview.streakDays).toBeGreaterThanOrEqual(1);
    expect(overview.itemsAttempted).toBe(3);
  });

  it("flags a hole when a hard prerequisite is missing under an in-progress concept", () => {
    const mastery: AdminMasteryRow[] = [
      {
        learnerId: SEEDED_LEARNER_ID,
        conceptId: "math.nf.compare_unlike",
        pMastery: 0.4,
        theta: -0.2,
        thetaN: 4,
        state: "in_progress",
        attempts: 4,
        correctUnhinted: 1,
        gatePassedAt: null,
        lastPracticedAt: NOW,
      },
      {
        learnerId: SEEDED_LEARNER_ID,
        conceptId: "math.nf.equivalence_n_times",
        pMastery: 0.3,
        theta: -0.5,
        thetaN: 3,
        state: "missing",
        attempts: 3,
        correctUnhinted: 0,
        gatePassedAt: null,
        lastPracticedAt: NOW,
      },
    ];
    const nodes = buildKnowledgeNodes(snap({ mastery }));
    const holes = detectHoles(nodes, NOW);
    expect(holes.some((alert) => alert.targetId === "math.nf.equivalence_n_times")).toBe(true);
    const suggested = suggestedHoleAssignments(snap({ mastery }), "kevinw@mcsteen.com");
    expect(suggested[0]?.kind).toBe("hole_fill");
    expect(suggested[0]?.targetId).toBe("math.nf.equivalence_n_times");
  });

  it("builds subject progress toward 90% and chapter rows", () => {
    const progress = buildProgress(
      snap({
        mastery: [
          {
            learnerId: SEEDED_LEARNER_ID,
            conceptId: "savvas.ch1.knowledge",
            pMastery: 0.96,
            theta: 0.4,
            thetaN: 8,
            state: "mastered",
            attempts: 8,
            correctUnhinted: 7,
            gatePassedAt: NOW - 86400000,
            lastPracticedAt: NOW - 86400000,
          },
        ],
        gatedChapterIds: ["savvas.ch1"],
        events: [event({ id: "e1", isCorrect: true })],
      }),
    );
    const science = progress.subjects.find((row) => row.subject === "science");
    expect(science?.mastered).toBeGreaterThanOrEqual(1);
    const ch1 = progress.chapters.find((row) => row.chapterId === "savvas.ch1");
    expect(ch1?.gated).toBe(true);
    expect(ch1?.itemsCorrect).toBeGreaterThanOrEqual(1);
  });

  it("sends assignment dropdowns as id/title only", () => {
    const assignments = buildAssignments(snap());
    expect(assignments.concepts.length).toBeGreaterThan(0);
    expect(assignments.chapters.some((chapter) => chapter.id === "savvas.ch1")).toBe(true);
    expect(JSON.stringify(assignments.concepts)).not.toContain("Scientists start by looking closely");
    expect(JSON.stringify(assignments.chapters)).not.toContain("Scientists start by looking closely");
  });

  it("does not treat preview sessions as dashboard time", () => {
    const preview: PlaySession = {
      id: "prev",
      learnerId: SEEDED_LEARNER_ID,
      startedAt: NOW,
      lastEventAt: NOW,
      endedAt: null,
      entryPoint: "study",
      resumeState: { chapterId: null, activityId: null, itemId: null, scaffoldLevel: 0 },
      isPreview: true,
      rollingSuccess: 0.82,
      scoredCount: 0,
      consecutiveHigh: 0,
      outOfBand: 0,
    };
    const overview = buildOverview(
      snap({
        sessions: [preview],
        events: [event({ id: "e1", isCorrect: false, isPreview: true })],
      }),
    );
    expect(overview.itemsAttempted).toBe(0);
  });
});
