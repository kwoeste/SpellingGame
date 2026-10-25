import { beforeEach, describe, expect, it } from "vitest";
import { getChapter } from "@/lib/content/catalog";
import { resetMemoryRepo, memoryEngineRepo as repo } from "@/lib/engine/repo-memory";
import { startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";
import { buildRushMeter } from "@/lib/admin/dashboard";
import type { AdminEventRow } from "@/lib/admin/types";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";

const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const T0 = Date.parse("2026-10-19T14:00:00Z");
beforeEach(() => resetMemoryRepo());

describe("rush nudges", () => {
  it("nudges after two rapid wrong guesses in three answers, not after one or slow misses", async () => {
    const ch = getChapter("savvas.ch1")!;
    const s = await startSession(repo, mae, { entry: "study", chapterId: ch.id, now: T0 });
    const [a, b, c] = ch.items;
    const slow = await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: a.id, response: "nope", latencyMs: 9000, now: T0 + 1000 });
    expect(slow.nudge).toBeNull();
    const one = await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: b.id, response: "nope", latencyMs: 600, now: T0 + 2000 });
    expect(one.nudge).toBeNull();
    const two = await submitAnswer(repo, mae, { sessionId: s.session_id, itemId: c.id, response: "nope", latencyMs: 500, now: T0 + 3000 });
    expect(two.nudge).toBe("slow_down");
  });
});

describe("rush meter", () => {
  const ev = (ts: number, latencyMs: number, isCorrect: boolean) => ({ serverTs: ts, latencyMs, isCorrect }) as AdminEventRow;
  it("is none with no answers and scores the 7-day share of rapid misses", () => {
    expect(buildRushMeter([], T0).level).toBe("none");
    const calm = buildRushMeter(Array.from({ length: 20 }, (_, i) => ev(T0 - i * 1000, 8000, true)), T0);
    expect(calm.level).toBe("calm");
    const rows = [...Array.from({ length: 7 }, (_, i) => ev(T0 - i * 1000, 8000, true)), ev(T0, 400, false), ev(T0, 400, false), ev(T0 - 10 * 86_400_000, 400, false)];
    const m = buildRushMeter(rows, T0);
    expect(m.answers7d).toBe(9);
    expect(m.rushed7d).toBe(2);
    expect(m.level).toBe("rushing");
    expect(m.rushedToday).toBe(2);
    expect(m.daily).toHaveLength(7);
  });
});
