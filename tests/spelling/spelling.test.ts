import { beforeEach, describe, expect, it } from "vitest";
import { decideRequest } from "@/lib/auth/decide";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { rotateSubjects, todayPlan } from "@/lib/engine/plan";
import { startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { getChapter } from "@/lib/content/catalog";
const DAY = 86_400_000;
import { DEFAULT_UPCOMING, SPELLING_D2_TEST_DATE, activeUpcomingTests, validUpcoming, type UpcomingTest } from "@/lib/practice/upcoming";
import { daysUntil, gradeSpelling, masteredCount, practiceQueue, spellingHelp, wordStats, type SpellingAttempt } from "@/lib/spelling/engine";
import { D2_WORDS, allSpellingClips, findWord, wordClip } from "@/lib/spelling/list-d2";
import { SPELLING_EVENT, checkSpelling, spellingSummary } from "@/lib/spelling/service";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const at = (iso: string) => Date.parse(iso);
const noAi = { ai: async () => null };
const W = (w: string) => findWord(w)!;

beforeEach(() => resetMemoryRepo());

describe("word list", () => {
  it("has 20 spelling, 3 review and 2 challenge words with valid highlights", () => {
    expect(D2_WORDS).toHaveLength(25);
    expect(D2_WORDS.filter((w) => w.group === "spelling")).toHaveLength(20);
    expect(D2_WORDS.filter((w) => w.group === "review").map((w) => w.word).sort()).toEqual(["plump", "stomp", "twister"]);
    expect(D2_WORDS.filter((w) => w.group === "challenge").map((w) => w.word).sort()).toEqual(["chimpanzee", "obstacle"]);
    for (const w of D2_WORDS) {
      expect(w.at + w.len).toBeLessThanOrEqual(w.word.length);
      expect(w.oops).not.toBe(w.word);
      expect(w.sentence.toLowerCase()).toContain(w.word);
    }
  });
  it("clips say the word, a sentence, then the word again; all are prewarmable", () => {
    expect(wordClip(W("cotton"))).toMatch(/^cotton\. .+ cotton\.$/);
    expect(allSpellingClips().length).toBeGreaterThanOrEqual(75);
    expect(allSpellingClips().every((t) => t.length <= 400)).toBe(true);
  });
});

describe("grading and help", () => {
  it("grades exactly, ignoring case and spaces only", () => {
    expect(gradeSpelling(W("kitchen"), " Kitchen ")).toBe(true);
    expect(gradeSpelling(W("kitchen"), "kichen")).toBe(false);
    expect(gradeSpelling(W("kitchen"), 42)).toBe(false);
  });
  it("gives a sound hint at misses 1-2, letters at 3-5, the answer at 6", () => {
    expect(spellingHelp(W("swift"), 0).level).toBe("none");
    const hint = spellingHelp(W("swift"), 2);
    expect(hint.level).toBe("hint");
    expect(hint.answer).toBeUndefined();
    expect(spellingHelp(W("swift"), 3)).toMatchObject({ level: "letters", letters: 1 });
    expect(spellingHelp(W("swift"), 6)).toMatchObject({ level: "reveal", answer: "swift" });
  });
});

describe("mastery and spacing", () => {
  const a = (word: string, correct: boolean, t: number, firstTry = correct): SpellingAttempt => ({ word, correct, firstTry, mode: "listen", at: t });
  const day1 = at("2026-10-29T20:00:00Z");
  const day2 = at("2026-10-30T20:00:00Z");
  it("needs 3 first-try right in a row across 2 sessions", () => {
    const sameSession = wordStats([a("swift", true, day1), a("swift", true, day1 + 60_000), a("swift", true, day1 + 120_000)]);
    expect(sameSession.find((s) => s.word === "swift")?.mastered).toBe(false);
    const twoSessions = wordStats([a("swift", true, day1), a("swift", true, day1 + 60_000), a("swift", true, day2)]);
    expect(twoSessions.find((s) => s.word === "swift")?.mastered).toBe(true);
    expect(masteredCount(twoSessions)).toBe(1);
  });
  it("a miss resets the streak", () => {
    const s = wordStats([a("swift", true, day1), a("swift", true, day1 + 1), a("swift", false, day2), a("swift", true, day2 + 1)]);
    expect(s.find((x) => x.word === "swift")?.streak).toBe(1);
  });
  it("queues missed words first and spaces right answers out", () => {
    const stats = wordStats([a("cotton", false, day1), a("swift", true, day1)]);
    const q = practiceQueue(stats, day1 + 1000);
    expect(q[0]).toBe("cotton");
    expect(q).not.toContain("swift");
    expect(q).toHaveLength(10);
  });
  it("counts days to the test in ET", () => {
    expect(daysUntil("2026-11-06", at("2026-10-29T14:00:00Z"))).toBe(8);
    expect(daysUntil("2026-11-06", at("2026-11-07T02:00:00Z"))).toBe(0); // 9pm ET Nov 6
  });
});

describe("server grading stores attempts per word in the DB", () => {
  it("grades on the server, reveals only at 6 misses, and logs spelling_attempt events", async () => {
    const now = at("2026-10-29T20:00:00Z");
    const miss = await checkSpelling(memoryEngineRepo, mae, { word: "cousin", typed: "cuzin", mode: "listen", misses: 0 }, now);
    expect(miss).toMatchObject({ correct: false, help: { level: "hint" } });
    const fifth = await checkSpelling(memoryEngineRepo, mae, { word: "cousin", typed: "cuzen", mode: "listen", misses: 5 }, now + 1000);
    expect(fifth?.help).toMatchObject({ level: "reveal", answer: "cousin" });
    const ok = await checkSpelling(memoryEngineRepo, mae, { word: "cousin", typed: "cousin", mode: "listen", misses: 0 }, now + 2000);
    expect(ok?.correct).toBe(true);
    expect(ok?.stat?.streak).toBe(1);
    expect(await checkSpelling(memoryEngineRepo, mae, { word: "notaword", typed: "x", mode: "listen", misses: 0 }, now)).toBeNull();
    const events = await memoryAdminRepo.eventsOfType(SPELLING_EVENT, 100);
    expect(events).toHaveLength(3);
    expect(events[0].payload).toMatchObject({ word: "cousin", first_try: true });
    const summary = await spellingSummary(memoryEngineRepo, mae, now + 3000);
    expect(summary?.total).toBe(25);
  });
});

describe("dated items on the Today plan", () => {
  it("pins Spelling D-2 first with days left and mastered count, until the test date", async () => {
    const plan = await todayPlan(memoryEngineRepo, mae, null, at("2026-10-29T20:00:00Z"), noAi);
    expect(plan?.blocks[0]).toMatchObject({ id: "upcoming:spelling-d2", href: "/study/spelling-d2", locked: true, detail: "8 days left · 0 of 25 mastered" });
    const testDay = await todayPlan(memoryEngineRepo, mae, null, at("2026-11-06T13:00:00Z"), noAi);
    expect(testDay?.blocks[0].id).toBe("upcoming:spelling-d2");
    const after = await todayPlan(memoryEngineRepo, mae, null, at("2026-11-07T13:00:00Z"), noAi);
    expect(after?.blocks.some((b) => b.id === "upcoming:spelling-d2")).toBe(false);
  });
  it("coexists with other pins (soonest test first) and expired pins drop off", () => {
    const extra: UpcomingTest[] = [...DEFAULT_UPCOMING, { id: "ch4", kind: "chapter", refId: "savvas.ch4", title: "Ch 4 test", startDate: "2026-10-29", testDate: "2026-11-03" }];
    const ids = activeUpcomingTests(at("2026-10-30T14:00:00Z"), extra).map((t) => t.id);
    expect(ids).toEqual(["ch4", "spelling-d2"]);
    expect(activeUpcomingTests(at("2026-10-29T14:00:00Z")).map((t) => t.id)).toEqual(["spelling-d2"]); // ch3 expired 10/28
    expect(activeUpcomingTests(at("2026-10-28T14:00:00Z")).map((t) => t.id)).toEqual(["savvas.ch3-2026-10-28"]); // spelling not pinned yet
  });
  it("the test date is one config value", () => {
    expect(SPELLING_D2_TEST_DATE).toBe("2026-11-06");
    expect(DEFAULT_UPCOMING.find((t) => t.id === "spelling-d2")?.testDate).toBe(SPELLING_D2_TEST_DATE);
    const moved = DEFAULT_UPCOMING.map((t) => (t.id === "spelling-d2" ? { ...t, testDate: "2026-11-13" } : t));
    expect(activeUpcomingTests(at("2026-11-10T14:00:00Z"), moved).map((t) => t.id)).toEqual(["spelling-d2"]);
  });
  it("validates admin edits", () => {
    expect(validUpcoming({ id: "x", kind: "chapter", refId: "savvas.ch4", title: "T", startDate: "2026-11-01", testDate: "2026-11-03" })).toBe(true);
    expect(validUpcoming({ id: "x", kind: "chapter", refId: "savvas.ch4", title: "T", startDate: "2026-11-04", testDate: "2026-11-03" })).toBe(false);
    expect(validUpcoming({ id: "x", kind: "quiz" as never, refId: "a", title: "T", startDate: "2026-11-01", testDate: "2026-11-03" })).toBe(false);
  });
  it("within a day of the test, the dated item takes the whole session", async () => {
    const plan = await todayPlan(memoryEngineRepo, mae, null, at("2026-11-05T20:00:00Z"), noAi);
    expect(plan?.blocks[0].id).toBe("upcoming:spelling-d2");
    expect(plan?.blocks.some((b) => b.kind === "chapter")).toBe(false);
  });
});

describe("subject rotation", () => {
  it("puts the least recently worked subject first", () => {
    expect(rotateSubjects(["math", "science", "ela", "religion"], {})).toEqual(["ela", "science", "religion", "math"]);
    expect(rotateSubjects(["math", "science", "ela"], { ela: 300, science: 100, math: 200 })).toEqual(["science", "math", "ela"]);
    expect(rotateSubjects(["math", "ela"], { ela: 300 })).toEqual(["math", "ela"]);
  });
  it("uses her real activity history for the plan", async () => {
    const t = at("2026-10-29T20:00:00Z");
    const first = await todayPlan(memoryEngineRepo, mae, null, t, noAi);
    const rotation = first!.blocks.filter((b) => b.kind === "chapter");
    expect(rotation.length).toBeGreaterThanOrEqual(1);
    expect(first!.blocks[0].id).toBe("upcoming:spelling-d2");
    expect(first!.blocks.indexOf(rotation[0])).toBeGreaterThan(0);
    // She works in the first rotated subject; next sign-in, a different subject leads.
    const ch = getChapter(rotation[0].href.split("/").pop()!)!;
    const s = await startSession(memoryEngineRepo, mae, { entry: "study", chapterId: ch.id, now: t + 1000 });
    await submitAnswer(memoryEngineRepo, mae, { sessionId: s.session_id, itemId: ch.items[0].id, response: "x", latencyMs: 8000, now: t + 2000 });
    const next = await todayPlan(memoryEngineRepo, mae, null, t + DAY, noAi);
    const lead = getChapter(next!.blocks.find((b) => b.kind === "chapter")!.href.split("/").pop()!)!;
    expect(lead.subject).not.toBe(ch.subject);
  });
});

describe("gating", () => {
  it("signed-out visitors are sent to sign-in and the API is 401", () => {
    expect(decideRequest({ pathname: "/study/spelling-d2", hasSession: false, role: null }).kind).toBe("redirect-signin");
    expect(decideRequest({ pathname: "/api/engine/spelling", hasSession: false, role: null }).kind).toBe("unauthorized");
    expect(decideRequest({ pathname: "/admin/upcoming-tests", hasSession: true, role: "student" }).kind).not.toBe("allow");
  });
});
