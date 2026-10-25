import { describe, expect, it } from "vitest";
import { chapterStarInfo, overdueForRefresh } from "@/lib/admin/dashboard";
import { parentTakeaway } from "@/lib/admin/takeaway";
import { groupMisses } from "@/app/admin/_ui/wrong-answers";

const ev = (itemId: string, serverTs: number, isCorrect: boolean) => ({ itemId, serverTs, isCorrect, hintLevel: 0, type: "answer_submitted", isPreview: false });

describe("chapter star info matches the gate's round rule", () => {
  const items = ["a", "b", "c"];
  it("failed round then passed round: star earned at 100%, not the lifetime first try", () => {
    const events = [ev("a", 1, true), ev("b", 2, false), ev("c", 3, false), ev("a", 11, true), ev("b", 12, true), ev("c", 13, true)];
    const gates = [
      { chapterId: "x", score: 0.33, passed: false, finishedAt: 5, override: false },
      { chapterId: "x", score: 1, passed: true, finishedAt: 15, override: false },
    ];
    const info = chapterStarInfo(items, events as never, gates);
    expect(info.how).toBe("earned");
    expect(info.earnedPct).toBe(100);
    expect(info.roundAnswered).toBe(0);
  });
  it("labels overrides and pre-90% passes, never revoking", () => {
    expect(chapterStarInfo(items, [], [{ chapterId: "x", score: null, passed: true, finishedAt: 1, override: true }]).how).toBe("parent");
    expect(chapterStarInfo(items, [], [{ chapterId: "x", score: 0.8, passed: true, finishedAt: 1, override: false }]).how).toBe("earlier_rule");
  });
  it("current round uses first answer per item after last check", () => {
    const info = chapterStarInfo(items, [ev("a", 1, false), ev("a", 6, true), ev("a", 7, false)] as never, [
      { chapterId: "x", score: 0.33, passed: false, finishedAt: 5, override: false },
    ]);
    expect(info.roundAnswered).toBe(1);
    expect(info.roundPct).toBe(33);
  });
});

describe("refresh vs same-day retry", () => {
  it("box 0 items due minutes ago are not 'Needs a refresh'", () => {
    const now = new Date("2026-10-25T14:00:00Z");
    expect(overdueForRefresh(now.getTime() - 60 * 60_000, 0, now)).toBe(false);
    expect(overdueForRefresh(now.getTime() - 3 * 86_400_000, 1, now)).toBe(true);
  });
});

describe("one healthy range", () => {
  it("takeaway uses the 70–95% band, no separate 80% target", () => {
    expect(parentTakeaway({ firstTryAccuracy: 0.75, engagedMinutesToday: 0, dailyMinutesGoal: 0 })).toContain("in the healthy 70–95% range");
    expect(parentTakeaway({ firstTryAccuracy: 0.75, engagedMinutesToday: 0, dailyMinutesGoal: 0 })).not.toContain("80%");
  });
});

describe("wrong answers grouping", () => {
  it("collapses repeat misses of one question", () => {
    const rows = [
      { itemId: "q1", eventId: "1", ts: 1 },
      { itemId: "q1", eventId: "2", ts: 3 },
      { itemId: "q2", eventId: "3", ts: 2 },
    ];
    const groups = groupMisses(rows as never);
    expect(groups).toHaveLength(2);
    expect(groups[0].latest.eventId).toBe("2");
    expect(groups[0].earlier).toHaveLength(1);
  });
});
