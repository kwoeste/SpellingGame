import { describe, expect, it } from "vitest";
import { ringProgress, formatDayKey } from "@/lib/admin/format";
import { partName, subjectName, targetName } from "@/lib/admin/names";
import { groupByKey, groupBySubject } from "@/lib/admin/group";
import { parentTakeaway } from "@/lib/admin/takeaway";
import { relabelChoicesFor } from "@/lib/admin/strategy-labels";
import { chapterFirstTryCorrect } from "@/lib/admin/dashboard";
import { MATH_CONCEPTS } from "@/lib/content/concepts";
import { axisLabel } from "@/app/admin/_ui/charts";

describe("ring math", () => {
  it("shows Goal met past the goal and exact percents otherwise", () => {
    expect(ringProgress(44, 15)).toMatchObject({ met: true, label: "Goal met", arcPct: 100 });
    expect(ringProgress(440, 600)).toMatchObject({ met: false, label: "73%" });
    expect(ringProgress(4, 51).label).toBe("8%");
    expect(ringProgress(0, 0).label).toBe("—");
  });
});

describe("id to name", () => {
  it("names subjects and parts in plain words", () => {
    expect(subjectName("ela")).toBe("Reading");
    expect(partName("seq")).toBe("Put in order");
    expect(partName("vocab")).toBe("Word meanings");
    expect(partName("q3")).toBe("Question 3");
  });
  it("maps raw ids to chapter names", () => {
    expect(targetName("col.ch4.seq")).toBe("Christ Our Life Ch 4 – Put in order");
    const math = MATH_CONCEPTS[0];
    expect(targetName(math.id)).toBe(math.titleAdmin);
    const tidy = targetName("some_weird.id-thing");
    expect(tidy).not.toMatch(/[._]/);
  });
});

describe("grouping", () => {
  it("groups repeats with counts, newest first", () => {
    const rows = [
      { id: "a", at: 1 },
      { id: "b", at: 5 },
      { id: "a", at: 9 },
    ];
    const groups = groupByKey(rows, (r) => r.id, (r) => r.at);
    expect(groups.map((g) => [g.key, g.count, g.latestAt])).toEqual([
      ["a", 2, 9],
      ["b", 1, 5],
    ]);
  });
  it("orders subjects Reading, Math, Religion, Science", () => {
    const groups = groupBySubject([{ s: "science" }, { s: "math" }, { s: "ela" }, { s: "religion" }], (r) => r.s);
    expect(groups.map((g) => g.label)).toEqual(["Reading", "Math", "Religion", "Science"]);
  });
});

describe("first-try rule matches the chapter gate", () => {
  it("counts only the latest first attempt, correct with hint ≤ 1", () => {
    const n = chapterFirstTryCorrect([
      { itemId: "x", attemptNo: 1, isCorrect: false, hintLevel: 0, serverTs: 1 },
      { itemId: "x", attemptNo: 2, isCorrect: true, hintLevel: 0, serverTs: 2 },
      { itemId: "y", attemptNo: 1, isCorrect: true, hintLevel: 2, serverTs: 3 },
      { itemId: "z", attemptNo: 1, isCorrect: true, hintLevel: 1, serverTs: 4 },
    ] as never);
    expect(n).toBe(1);
  });
});

describe("plain labels", () => {
  it("filters re-teach reasons by subject", () => {
    const math = relabelChoicesFor("math").map((c) => c.id);
    const reading = relabelChoicesFor("ela").map((c) => c.id);
    expect(math).not.toEqual(reading);
    expect(reading.length).toBeGreaterThan(0);
  });
  it("writes a one-line takeaway", () => {
    const text = parentTakeaway({ firstTryAccuracy: 0.53, engagedMinutesToday: 44, dailyMinutesGoal: 15 });
    expect(text).toContain("53%");
    expect(text).toContain("goal met");
  });
  it("formats chart dates without raw keys", () => {
    expect(formatDayKey("2026-10-19")).toBe("Mon, Oct 19");
    expect(axisLabel("2026-10-19", true)).not.toContain("2026-10-19");
  });
});
