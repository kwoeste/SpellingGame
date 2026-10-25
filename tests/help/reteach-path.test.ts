import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { getChapter, listChapters } from "@/lib/content/catalog";
import { getRecap } from "@/lib/content/recaps";
import { chapterVisibleTo } from "@/lib/content/student";
import type { ChapterItem, ChapterPack } from "@/lib/content/types";
import { chapterItemHelp } from "@/lib/engine/help";
import { memoryAdminRepo, memoryEngineRepo, resetMemoryRepo } from "@/lib/engine/repo-memory";
import { RETEACH_TARGET, reteachQueue, startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { reteachStart } from "@/components/ChapterPlayer";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-19T14:00:00Z");
const DAY = 24 * 3600_000;

function wrong(item: ChapterItem): unknown {
  if (item.type === "tap_evidence") return { choice: "definitely not it", evidence: item.evidenceSentenceId };
  if (item.type === "drag_order") return [...(item.answer as string[])].reverse();
  if (item.type === "drag_match") return {};
  return "nope";
}

async function getStuck(chapter: ChapterPack, item: ChapterItem, misses = 4) {
  const { sessionId } = await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: chapter.id, now: T0 });
  for (let n = 1; n <= misses; n += 1) {
    await submitAnswer(memoryEngineRepo, mae, { sessionId, itemId: item.id, response: wrong(item), latencyMs: 8000, now: T0 + n * 5000 });
  }
}

async function nextDayAnswer(chapter: ChapterPack, item: ChapterItem, response: unknown, at: number, hintLevel = 0) {
  const { sessionId } = await startSession(memoryEngineRepo, mae, { entryPoint: "study", chapterId: chapter.id, now: at });
  return submitAnswer(memoryEngineRepo, mae, { sessionId, itemId: item.id, response, hintLevel, latencyMs: 8000, now: at + 5000 });
}

const right = (chapter: ChapterPack, item: ChapterItem) => chapterItemHelp(chapter, item, 5)!.reveal!.response;

describe("re-teach next-session path", () => {
  beforeEach(() => resetMemoryRepo());

  it("miss 3 does not queue anything", async () => {
    const ch = getChapter("savvas.ch1")!;
    await getStuck(ch, ch.items[1], 3);
    expect(await reteachQueue(memoryEngineRepo, mae, T0 + 2 * DAY)).toEqual([]);
  });

  it("miss 4 → hidden the same day, surfaced next day with the Watch it recap first, cleared by a later right answer", async () => {
    const ch = getChapter("savvas.ch1")!;
    expect(getRecap(ch.id)).toBeTruthy();
    const item = ch.items[2];
    await getStuck(ch, item);

    expect(await reteachQueue(memoryEngineRepo, mae, T0 + 3600_000)).toEqual([]);
    const nextDay = T0 + DAY + 3600_000;
    const queue = await reteachQueue(memoryEngineRepo, mae, nextDay);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      itemId: item.id,
      chapterId: ch.id,
      stepIndex: 2,
      startWith: "watch_recap",
      href: `/study/${encodeURIComponent(ch.id)}?reteach=${encodeURIComponent(item.id)}`,
    });
    expect(reteachStart(true)).toEqual({ kind: "watch" });

    // A wrong first try next day keeps the flag.
    await nextDayAnswer(ch, item, wrong(item), nextDay);
    expect(await reteachQueue(memoryEngineRepo, mae, nextDay + 60_000)).toHaveLength(1);

    // Right on the first try in a later session clears it.
    const later = nextDay + 2 * 3600_000;
    const ok = await nextDayAnswer(ch, item, right(ch, item), later);
    expect(ok.correct).toBe(true);
    expect(await reteachQueue(memoryEngineRepo, mae, later + 60_000)).toEqual([]);
    const flag = await memoryEngineRepo.withLearner(SEEDED_LEARNER_ID, (tx) => tx.getReview(RETEACH_TARGET, item.id));
    expect(flag?.lastResult).toBe("pass");
    const decisions = await memoryAdminRepo.decisions(100);
    expect(decisions.some((d) => d.decision === "reteach_cleared")).toBe(true);
  });

  it("a right answer that used Show me does not clear the flag", async () => {
    const ch = getChapter("savvas.ch1")!;
    const item = ch.items[0];
    await getStuck(ch, item);
    await nextDayAnswer(ch, item, right(ch, item), T0 + DAY + 3600_000, 3);
    expect(await reteachQueue(memoryEngineRepo, mae, T0 + DAY + 7200_000)).toHaveLength(1);
  });

  it("chapters without a recap start with the Careful Read", async () => {
    const ch = listChapters().find((c) => !getRecap(c.id) && chapterVisibleTo(c, "student") && c.items.length > 0)!;
    expect(ch).toBeTruthy();
    const item = ch.items[0];
    await getStuck(ch, item);
    const [row] = await reteachQueue(memoryEngineRepo, mae, T0 + DAY + 3600_000);
    expect(row.startWith).toBe("careful_read");
    expect(reteachStart(false)).toEqual({ kind: "read" });
  });

  it("wires the dashboard card and the chapter page", () => {
    const page = readFileSync("app/study/page.tsx", "utf8");
    expect(page).toMatch(/reteachQueue\(/);
    expect(page).toMatch(/tryAgain=/);
    const dash = readFileSync("components/StudentDashboard.tsx", "utf8");
    expect(dash).toMatch(/Let&apos;s try this again/);
    const chapterPage = readFileSync("app/study/[chapterId]/page.tsx", "utf8");
    expect(chapterPage).toMatch(/reteachItemId=\{reteachItemId\}/);
    const player = readFileSync("components/ChapterPlayer.tsx", "utf8");
    expect(player).toMatch(/reteachStart\(Boolean\(chapter\.recap\), reteachStartWith, reteachIndex\)/);
    expect(player).toMatch(/setView\(\{ kind: "step", index: reteachIndex \}\)/);
  });
});
