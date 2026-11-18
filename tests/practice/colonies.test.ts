import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import {
  COLONIES,
  COLONY_SHAPES,
  MAP_NAME_IDS,
  MAP_TAP_IDS,
  REGIONS,
  coloniesInRegion,
  coloniesSpokenLines,
  pointInShape,
  shapeBounds,
} from "@/lib/content/colonies";
import { colonyBlankIndexes, colonyChoices, colonyMisses, colonySpellEqual, colonyTiles, gradeColonySpell } from "@/lib/content/colonies-spell";
import { getChapter } from "@/lib/content/catalog";
import { memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { progressSummary, recordEvents, type EngineActor } from "@/lib/engine/service";
import { todayPlan } from "@/lib/engine/plan";
import { buildAttempt, gradeQuestion, practiceBank } from "@/lib/practice/bank";
import { COLONIES_FACTS } from "@/lib/practice/bank-colonies";
import { coloniesFinishedPayload, nextColoniesStep, payloadFits } from "@/lib/practice/colonies-log";
import { dueFacts, factReviews, pastPracticeTests } from "@/lib/practice/review";
import { DEFAULT_UPCOMING, activeUpcomingTests, validUpcoming } from "@/lib/practice/upcoming";
import type { StudentQuestion } from "@/lib/practice/types";

const CH = "ss.colonies";
const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const repo = memoryEngineRepo;
const noAi = { ai: async () => null };
const NOV18 = Date.parse("2026-11-18T15:00:00Z");
const NOV24 = Date.parse("2026-11-24T15:00:00Z");
const NOV25 = Date.parse("2026-11-25T15:00:00Z");

describe("13 colonies chapter", () => {
  const chapter = getChapter(CH)!;

  it("is a social studies chapter she can study", () => {
    expect(chapter.subject).toBe("social");
    expect(chapter.titleKid).toBe("The 13 original colonies");
    const text = chapter.sentences.map((s) => s.text).join(" ");
    for (const colony of COLONIES) expect(text).toContain(colony.name);
    expect(text).toContain("New England Colonies");
    expect(text).toContain("Middle Colonies");
    expect(text).toContain("Southern Colonies");
    expect(text).toContain("breadbasket");
    expect(text).toMatch(/rocky/);
    expect(text).toMatch(/ships/);
    expect(text).toContain("farthest south");
    expect(text).toMatch(/compass/i);
  });

  it("lists each region north to south", () => {
    expect(coloniesInRegion("new-england").map((c) => c.name)).toEqual(["New Hampshire", "Massachusetts", "Rhode Island", "Connecticut"]);
    expect(coloniesInRegion("middle").map((c) => c.name)).toEqual(["New York", "New Jersey", "Pennsylvania", "Delaware"]);
    expect(coloniesInRegion("southern").map((c) => c.name)).toEqual(["Maryland", "Virginia", "North Carolina", "South Carolina", "Georgia"]);
    expect(REGIONS.map((r) => r.name)).toEqual(["New England", "Middle Colonies", "Southern Colonies"]);
  });
});

describe("colony map", () => {
  it("draws 13 original shapes with labels inside only their own colony", () => {
    expect(COLONY_SHAPES).toHaveLength(13);
    expect(new Set(COLONY_SHAPES.map((s) => s.id)).size).toBe(13);
    for (const shape of COLONY_SHAPES) {
      const [x, y] = shape.label;
      const hits = COLONY_SHAPES.filter((other) => pointInShape(x, y, other.points));
      expect(hits.map((h) => h.id), shape.id).toEqual([shape.id]);
    }
    const bounds = Object.fromEntries(COLONY_SHAPES.map((s) => [s.id, shapeBounds(s.points)]));
    const north = COLONY_SHAPES.reduce((best, shape) => (shapeBounds(shape.points).minY < shapeBounds(best.points).minY ? shape : best));
    const south = COLONY_SHAPES.reduce((best, shape) => (shapeBounds(shape.points).maxY > shapeBounds(best.points).maxY ? shape : best));
    expect(north.id).toBe("nh");
    expect(south.id).toBe("ga");
    expect(bounds.md.minY).toBeLessThan(bounds.va.minY);
    expect(bounds.va.minY).toBeLessThan(bounds.nc.minY);
    expect(bounds.nc.minY).toBeLessThan(bounds.sc.minY);
    expect(bounds.sc.minY).toBeLessThan(bounds.ga.minY);
    expect(bounds.ri.minX).toBeGreaterThanOrEqual(bounds.ct.maxX);
    expect(bounds.de.minX).toBeGreaterThanOrEqual(250);
    expect(bounds.pa.maxX).toBeLessThanOrEqual(bounds.de.minX);
  });
});

describe("colony spelling", () => {
  it("keeps the space in two-word names and rejects the listed miss", () => {
    expect(colonySpellEqual("Pensylvania", "Pennsylvania")).toBe(false);
    expect(colonySpellEqual("pennsylvania", "Pennsylvania")).toBe(true);
    expect(colonySpellEqual("RhodeIsland", "Rhode Island")).toBe(false);
    expect(colonySpellEqual("Rhode Island", "rhode island")).toBe(true);
    for (const colony of COLONIES) {
      expect(colony.sentence).toContain("___");
      expect(colony.sentence.includes(colony.name)).toBe(false);
      const misses = colonyMisses(colony.name, colony.oops);
      expect(new Set(misses).size).toBe(3);
      expect(misses[0]).toBe(colony.oops);
      expect(colonySpellEqual(colony.oops, colony.name)).toBe(false);
      const choices = colonyChoices(colony.name, colony.oops, colony.id);
      expect(choices).toHaveLength(4);
      expect(choices).toContain(colony.name);
      const tiles = colonyTiles(colony.name, colony.id);
      expect(tiles.join("")).not.toBe(colony.name.toLowerCase());
      expect([...tiles].sort().join("")).toBe([...colony.name.toLowerCase()].sort().join(""));
      const blanks = colonyBlankIndexes(colony.name, colony.trickyAt, colony.trickyLen);
      expect(blanks.length).toBeGreaterThanOrEqual(1);
      expect(blanks.length).toBeLessThan(colony.name.replace(/ /g, "").length);
      expect(blanks).toContain(colony.trickyAt);
      expect(blanks.some((index) => colony.name[index] === " ")).toBe(false);
    }
    expect(gradeColonySpell("Pennsylvania", "blanks", "Pensylvania").correct).toBe(false);
    expect(gradeQuestion("spell-pa~0~choice", ["Pensylvania"])?.correct).toBe(false);
    expect(gradeQuestion("spell-pa~0~listen", ["Pennsylvania"])?.correct).toBe(true);
  });
});

describe("colonies practice test", () => {
  const bank = practiceBank(CH)!;

  it("covers every colony on the full test without shipping answer keys", () => {
    expect(bank.facts).toHaveLength(COLONIES_FACTS.length);
    const questions = buildAttempt(CH, "colonies-seed");
    expect(questions.map((q) => q.factId).sort()).toEqual(bank.facts.map((f) => f.id).sort());
    const sortIds = questions.filter((q) => q.activity === "sort").map((q) => q.factId);
    expect(sortIds).toHaveLength(13);
    const named = new Set(questions.filter((q) => q.activity === "map-name").map((q) => q.highlightId));
    const tapped = new Set(questions.filter((q) => q.activity === "map-tap").map((q) => q.factId.replace("tap-", "")));
    expect([...named].sort()).toEqual([...MAP_NAME_IDS].sort());
    expect([...tapped].sort()).toEqual([...MAP_TAP_IDS].sort());
    const spells = questions.filter((q) => q.activity === "spell");
    const formats = spells.map((q) => q.spellFormat);
    expect(formats).toHaveLength(4);
    expect(new Set(formats).size).toBe(4);
    expect(formats).toContain("listen");
    expect(buildAttempt(CH, "colonies-seed").filter((q) => q.activity === "spell").map((q) => q.spellFormat)).toEqual(formats);
    const other = ["seed-b", "seed-c", "seed-d", "seed-e", "seed-f"].map((seed) => buildAttempt(CH, seed).filter((q) => q.activity === "spell").map((q) => q.spellFormat).join(","));
    expect(other.some((row) => row !== formats.join(","))).toBe(true);

    for (const q of questions) {
      expect(JSON.stringify(q)).not.toContain('"answers"');
      const fact = bank.facts.find((f) => f.id === q.factId)!;
      if (q.activity === "map-tap") {
        expect(q.choices).toBeUndefined();
        expect(q.highlightId).toBeUndefined();
        for (const value of Object.values(q)) expect(value).not.toBe(fact.answers[0][0]);
      }
      if (q.activity === "map-name") expect(q.wordBank).toContain(fact.answers[0][0]);
      if (q.kind === "choice") expect(q.choices).toEqual(expect.arrayContaining([fact.answers[0][0]]));
      if (q.activity === "spell" && (q.spellFormat === "blanks" || q.spellFormat === "scramble" || q.spellFormat === "sentence")) {
        expect(JSON.stringify(q).includes(fact.answers[0][0])).toBe(false);
      }
    }
    expect(gradeQuestion("ch-region-south~0~b", ["Southern Colonies"])?.correct).toBe(true);
    expect(gradeQuestion("tap-de~0~b", ["de"])?.correct).toBe(true);
    expect(gradeQuestion("tap-de~0~b", ["delaware"])?.correct).toBe(false);
    expect(gradeQuestion("map-pa~0~w", ["Pensylvania"])?.correct).toBe(false);
    expect(gradeQuestion("map-pa~0~w", ["Pennsylvania"])?.correct).toBe(true);
  });

  it("groups a full region sort into one board", () => {
    const sorts = COLONIES.map((colony) => ({ activity: "sort" as const, factId: colony.id }));
    expect(nextColoniesStep(sorts, 0)?.kind).toBe("board");
    expect(nextColoniesStep(sorts.slice(0, 3), 0)?.kind).toBe("one");
    const mixed: StudentQuestion[] = [];
    expect(nextColoniesStep(mixed, 0)).toBeNull();
  });

  it("is first on the plan until the test, then review with misses first", async () => {
    expect(validUpcoming({ id: "ss.colonies-2026-11-24", kind: "practice-test", refId: CH, title: "Social Studies: The 13 Original Colonies", testDate: "2026-11-24", startDate: "2026-11-18" })).toBe(true);
    expect(activeUpcomingTests(NOV18).map((t) => t.id)).toEqual(["ss.colonies-2026-11-24", "spelling-u2l10"]);
    expect(activeUpcomingTests(NOV24).find((t) => t.id === "ss.colonies-2026-11-24")?.isTestDay).toBe(true);
    expect(pastPracticeTests(NOV25)[0]?.chapterId).toBe(CH);

    resetMemoryRepo();
    const plan = (await todayPlan(repo, mae, null, NOV18, { ...noAi, upcoming: DEFAULT_UPCOMING }))!;
    expect(plan.blocks[0]?.locked).toBe(true);
    expect(plan.blocks[0]?.href).toBe("/study/ss.colonies/practice-test");
    expect(plan.blocks[0]?.title).toContain("The 13 original colonies");

    const missed = ["reg-pa", "spell-ct"];
    const reviews = factReviews(CH, "2026-11-24", { serverTs: NOV24, mode: "full", score: 30, total: 35, missed, misspelled: [] }, []);
    expect(dueFacts(reviews, NOV25).map((row) => row.targetId).sort()).toEqual(missed.sort());

    const before = await progressSummary(repo, mae, NOV25, DEFAULT_UPCOMING);
    await recordEvents(repo, mae, {
      now: NOV24,
      events: [{ type: "game_event", activityId: CH, payload: coloniesFinishedPayload({ chapterId: CH, mode: "full", score: 33, total: 35, exactSpelling: 33, byLesson: [], missed, misspelled: [], formats: [], minutes: 12 }) }],
    } as never);
    const after = await progressSummary(repo, mae, NOV25, DEFAULT_UPCOMING);
    const ring = (summary: typeof after, id: string) => summary.rings.find((item) => item.id === id)?.pct ?? 0;
    expect(ring(after, "subject:social")).toBeGreaterThan(ring(before, "subject:social"));
    expect(ring(after, CH)).toBeGreaterThan(0);

    const payload = coloniesFinishedPayload({
      chapterId: CH,
      mode: "full",
      score: 35,
      total: COLONIES_FACTS.length,
      exactSpelling: 35,
      byLesson: [{ lesson: 1, right: 13, total: 13 }],
      missed: COLONIES_FACTS.map((fact) => fact.id),
      misspelled: [],
      formats: COLONIES_FACTS.map((fact) => `${fact.id}:choice`),
      minutes: 20,
    });
    expect(payloadFits(payload)).toBe(true);
  });

  it("speaks the new lines from the chapter and the practice pack", () => {
    const spoken = coloniesSpokenLines().join(" ");
    for (const colony of COLONIES) expect(spoken).toContain(colony.name);
    expect(readFileSync("db/migrations/014_colonies_test.sql", "utf8")).toContain("2026-11-24");
    for (const file of ["components/ColoniesStudio.tsx", "components/ColoniesPracticeTest.tsx", "components/ColoniesMap.tsx", "components/ColonySpell.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from "@\/lib\/content\/colonies"/);
      expect(source, file).not.toContain("The 13 original colonies sat along");
    }
  });
});
