import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import { buildNeedsReteach } from "@/lib/admin/dashboard";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { gameSpec, type GameId } from "@/lib/content/games";
import { gradeRecapCheck, listRecaps } from "@/lib/content/recaps";
import type { ChapterItem } from "@/lib/content/types";
import { chapterItemHelp } from "@/lib/engine/help";
import type { AdminEventRow } from "@/lib/engine/repo";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { scoreItem } from "@/lib/engine/scoring";
import { RETEACH_P_MASTERY_CAP, skipItem, startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { SPELLING_LISTS } from "@/lib/games/spelling-lists";
import { binGameHelp, spellingHelp } from "@/lib/help/games";
import {
  HINT_AT_MISS,
  HINT_LEVEL_HINTED,
  HINT_LEVEL_REVEALED,
  SHOW_ME_AT_MISS,
  eliminateChoices,
  helpStage,
  hintLevelFor,
  letterHint,
  needsReteach,
  slowSpelling,
  type StuckHelp,
} from "@/lib/help/ladder";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const GAME_IDS: GameId[] = [
  "feudal-pyramid", "castle-siege", "market-day", "battle-1066", "magna-carta", "prefix-forge", "ten-commandments",
  "beatitudes", "church-year", "prayer-builder", "saint-cards", "stream-steepness", "circuit-builder",
];

describe("ladder constants and helpers", () => {
  it("gives nothing for misses 1-3, a hint at 4, Show me at 5+", () => {
    expect(HINT_AT_MISS).toBe(4);
    expect(SHOW_ME_AT_MISS).toBe(5);
    expect([0, 1, 2, 3].map(helpStage)).toEqual(["none", "none", "none", "none"]);
    expect(helpStage(4)).toBe("hint");
    expect(helpStage(5)).toBe("show_me");
    expect(helpStage(9)).toBe("show_me");
    expect(needsReteach(3)).toBe(false);
    expect(needsReteach(4)).toBe(true);
    expect(hintLevelFor("none", false)).toBe(0);
    expect(hintLevelFor("hint", false)).toBe(HINT_LEVEL_HINTED);
    expect(hintLevelFor("show_me", true)).toBe(HINT_LEVEL_REVEALED);
  });

  it("builds letter clues, slow spellings, and eliminations", () => {
    expect(letterHint("elephant")).toBe("e l e p _ _ _ _");
    expect(letterHint("cat")).toBe("c a _");
    expect(slowSpelling("cat")).toBe("cat. C, A, T. cat.");
    const removed = eliminateChoices(["a", "b", "c", "d"], "c", 1, "seed");
    expect(removed).toHaveLength(2);
    expect(removed).not.toContain("c");
    expect(eliminateChoices(["a", "b", "c", "d"], "c", 1, "seed")).toEqual(removed);
  });
});

function expectHint(help: StuckHelp | null) {
  expect(help?.stage).toBe("hint");
  expect(help?.hint.length).toBeGreaterThan(5);
  expect(help?.reveal).toBeUndefined();
}

describe("chapter steps (vocab, order, proof, math facts)", () => {
  const all = listChapters().flatMap((chapter) => chapter.items.map((item) => ({ chapter, item })));

  it("covers every step type that exists", () => {
    expect(new Set(all.map((x) => x.item.type))).toEqual(new Set(["drag_match", "drag_order", "tap_evidence", "mc"]));
  });

  it.each(all.map((x) => [x.item.id, x] as const))("%s: silent to miss 3, hint at 4, correct reveal at 5", (_id, { chapter, item }) => {
    for (const m of [1, 2, 3]) expect(chapterItemHelp(chapter, item, m)).toBeNull();
    const hint = chapterItemHelp(chapter, item, HINT_AT_MISS);
    expectHint(hint);
    if (item.options) {
      expect(hint?.removeChoices).not.toContain(item.answer);
      expect(item.options.length - (hint?.removeChoices?.length ?? 0)).toBe(Math.min(2, item.options.length));
    }
    if (item.type === "tap_evidence") expect(hint?.highlightSentenceId).toBe(item.evidenceSentenceId);
    if (item.type === "drag_match") expect(Object.keys(hint?.lockMatches ?? {}).length).toBeGreaterThan(0);
    if (item.type === "drag_order") expect(hint?.lockOrder?.first).toBe((item.answer as string[])[0]);
    const show = chapterItemHelp(chapter, item, SHOW_ME_AT_MISS);
    expect(show?.stage).toBe("show_me");
    expect(show?.reveal?.why.length).toBeGreaterThan(3);
    expect(scoreItem(chapter, item, show?.reveal?.response).correct).toBe(true);
  });
});

describe("Watch it quick check", () => {
  it.each(listRecaps().map((r) => [r.chapterId, r] as const))("%s ladders on the server", (_id, recap) => {
    const wrong = recap.check.choices.find((c) => c.id !== recap.check.answer)!.id;
    for (const before of [0, 1, 2]) expect(gradeRecapCheck(recap.chapterId, wrong, before)?.help).toBeNull();
    const hint = gradeRecapCheck(recap.chapterId, wrong, 3)!.help;
    expectHint(hint);
    expect(hint?.removeChoices).not.toContain(recap.check.answer);
    const show = gradeRecapCheck(recap.chapterId, wrong, 4)!.help;
    expect(show?.stage).toBe("show_me");
    expect(show?.reveal?.response).toBe(recap.check.answer);
    expect(gradeRecapCheck(recap.chapterId, String(show?.reveal?.response), 5)?.correct).toBe(true);
  });
});

describe("arcade games and spelling", () => {
  it.each(GAME_IDS)("%s: hint places wrong cards, Show me places all", (id) => {
    const spec = gameSpec(id);
    expect(binGameHelp(spec.items, {}, 3)).toBeNull();
    const hint = binGameHelp(spec.items, {}, 4)!;
    expect(hint.stage).toBe("hint");
    for (const [label, bin] of Object.entries(hint.place ?? {})) expect(spec.items.find((i) => i.label === label)?.bin).toBe(bin);
    const show = binGameHelp(spec.items, {}, 5)!;
    const placed = show.reveal!.response as Record<string, string>;
    expect(spec.items.every((i) => placed[i.label] === i.bin)).toBe(true);
  });

  it("spelling: letters + slow read at 4, whole word at 5, for every word", () => {
    for (const list of SPELLING_LISTS) {
      for (const word of list.words) {
        expect(spellingHelp(word, 3)).toBeNull();
        const hint = spellingHelp(word, 4)!;
        expect(hint.hint).toContain(letterHint(word));
        expect(hint.speak).toContain(word);
        expect(spellingHelp(word, 5)!.reveal!.response).toBe(word);
      }
    }
  });
});

describe("components wire the ladder", () => {
  const src = (f: string) => readFileSync(`components/${f}`, "utf8");
  it.each([
    ["ChapterPlayer.tsx", "hintLevelFor"],
    ["WatchIt.tsx", "misses"],
    ["NamedGame.tsx", "binGameHelp"],
    ["SpellingSafari.tsx", "spellingHelp"],
  ])("%s renders StuckHelpPanel and uses %s", (file, helper) => {
    const text = src(file);
    expect(text).toContain("<StuckHelpPanel");
    expect(text).toContain(helper);
  });
  it("NumberMatch is a chance game and has no ladder", () => {
    expect(src("NumberMatch.tsx")).not.toContain("StuckHelpPanel");
  });
  it("the panel shows a hint, then Show me plus Skip, then the reveal", () => {
    const hint: StuckHelp = { stage: "hint", hint: "Read the glowing sentence." };
    const r = (help: StuckHelp, revealed = false) =>
      renderToStaticMarkup(createElement(StuckHelpPanel, { help, revealed, onShowMe: () => {}, onSkip: () => {} }));
    expect(r(hint)).toContain("Read the glowing sentence.");
    expect(r(hint)).not.toContain("Show me");
    const show: StuckHelp = { stage: "show_me", hint: "x", reveal: { answer: "The answer is 12.", why: "3 × 4 = 12", response: "12" } };
    expect(r(show)).toContain("Get ready"); // Show me unlocks after a pause
    expect(r(show, true)).toContain("The answer is 12.");
    expect(r(show, true)).toContain("Why: 3 × 4 = 12");
    expect(renderToStaticMarkup(createElement(StuckHelpPanel, { help: null, revealed: false, onShowMe: () => {} }))).toBe("");
  });
});

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-19T14:00:00Z");

function wrong(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: "definitely not it", evidence: item.evidenceSentenceId };
  if (item.type === "drag_order") return [...(item.answer as string[])].reverse();
  if (item.type === "drag_match") return {};
  return "nope";
}

describe("engine: re-teach, reveal, skip", () => {
  beforeEach(() => resetMemoryRepo());

  it("marks the concept not learned at miss 4, re-queues it, and lets her skip at 5", async () => {
    const ch = getChapter("savvas.ch1")!;
    const item = ch.items[0];
    const { sessionId } = await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    const send = (n: number) =>
      submitAnswer(memoryEngineRepo, mae, { sessionId, itemId: item.id, response: wrong(item), latencyMs: 8000, now: T0 + n * 5000 });
    for (const n of [1, 2, 3]) expect((await send(n)).help).toBeNull();
    await expect(skipItem(memoryEngineRepo, mae, { sessionId, itemId: item.id, now: T0 + 18000 })).rejects.toThrow();
    const fourth = await send(4);
    expect(fourth.help?.stage).toBe("hint");
    expect(JSON.stringify(fourth)).not.toMatch(/misconception|p_mastery|theta/);
    const decisions = await memoryAdminRepo.decisions(50);
    expect(decisions.some((d) => d.decision === "reteach_queued" && (d.inputs as { item_id: string }).item_id === item.id)).toBe(true);
    const { mastery, review } = await memoryEngineRepo.withLearner(SEEDED_LEARNER_ID, async (tx) => ({
      mastery: await tx.getMastery(item.conceptId),
      review: await tx.getReview("item", item.id),
    }));
    expect(mastery?.state).toBe("missing");
    expect(mastery!.pMastery).toBeLessThanOrEqual(RETEACH_P_MASTERY_CAP);
    expect(review?.dueAt).toBeGreaterThan(T0 + 12 * 3600_000);

    const fifth = await send(5);
    expect(fifth.help?.reveal).toBeTruthy();
    const before = fifth.chapter!.nextStep;
    const skipped = await skipItem(memoryEngineRepo, mae, { sessionId, itemId: item.id, now: T0 + 40000 });
    expect(skipped.chapter!.nextStep).toBeGreaterThan(before);
    const events = await memoryAdminRepo.events(100);
    expect(events.some((e) => e.type === "item_skipped" && e.itemId === item.id)).toBe(true);
  });

  it("records a Show-me answer at hintLevel 3", async () => {
    const ch = getChapter("savvas.ch1")!;
    const item = ch.items[0];
    const { sessionId } = await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: ch.id, now: T0 });
    let last;
    for (let n = 1; n <= 5; n += 1) last = await submitAnswer(memoryEngineRepo, mae, { sessionId, itemId: item.id, response: wrong(item), latencyMs: 8000, now: T0 + n * 5000 });
    const ok = await submitAnswer(memoryEngineRepo, mae, { sessionId, itemId: item.id, response: last!.help!.reveal!.response, hintLevel: 3, latencyMs: 8000, now: T0 + 60000 });
    expect(ok.correct).toBe(true);
    const events = await memoryAdminRepo.events(100);
    expect(events.find((e) => e.type === "answer_submitted" && e.isCorrect)?.hintLevel).toBe(3);
    const rows = buildNeedsReteach(events);
    expect(rows[0]).toMatchObject({ key: `item:${item.id}`, maxMisses: 5, hints: 1, reveals: 1, cleared: false });
  });

  it("preview uses the browser's miss count", async () => {
    const ch = getChapter("savvas.ch1")!;
    const item = ch.items[0];
    const admin: EngineActor = { role: "admin", learnerId: null };
    const r = (misses: number) => submitAnswer(memoryEngineRepo, admin, { itemId: item.id, response: wrong(item), misses });
    expect((await r(2)).help).toBeNull();
    expect((await r(3)).help?.stage).toBe("hint");
    expect((await r(4)).help?.stage).toBe("show_me");
  });
});

describe("admin needs re-teach", () => {
  it("collects watch-check and game help events", () => {
    const base = { sessionId: "s1", learnerId: SEEDED_LEARNER_ID, seq: 0, clientTs: null, itemId: null, attemptNo: null, response: null, isCorrect: null, latencyMs: null, hintLevel: null, isPreview: false };
    const events = [
      { ...base, id: "1", serverTs: 1, type: "hint_requested", activityId: "savvas.ch1", payload: { source: "watch_check", detail: "hint_shown", misses: 4 } },
      { ...base, id: "2", serverTs: 2, type: "hint_requested", activityId: "savvas.ch1", payload: { source: "watch_check", detail: "revealed", misses: 5 } },
      { ...base, id: "3", serverTs: 3, type: "game_event", activityId: null, payload: { game_id: "spelling", item: "bridge", detail: "skipped", misses: 5 } },
    ] as unknown as AdminEventRow[];
    const rows = buildNeedsReteach(events);
    expect(rows.map((r) => r.key)).toEqual(["game:spelling:bridge", "watch:savvas.ch1"]);
    expect(rows[1]).toMatchObject({ hints: 1, reveals: 1, maxMisses: 5 });
  });
});
