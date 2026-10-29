import type { Metadata } from "next";
import { adminRepo } from "@/lib/engine/repos";
import { activeUpcomingTests } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { MASTERY_STREAK, masteredCount, wordStats } from "@/lib/spelling/engine";
import { D2_WORDS, LIST_ID, LIST_TITLE } from "@/lib/spelling/list-d2";
import { SPELLING_EVENT, attemptsFromEvents } from "@/lib/spelling/service";

export const metadata: Metadata = { title: "Admin · Spelling | Mae's Lab" };
export const dynamic = "force-dynamic";

const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default async function SpellingAdminPage() {
  const repo = adminRepo();
  const [events, games, tests] = await Promise.all([repo.eventsOfType(SPELLING_EVENT, 5000), repo.eventsOfType("game_event", 1000), loadUpcomingTests("admin")]);
  // One learner (Mae): use whoever has the most attempts so an admin's tryouts don't mix in.
  const byLearner = new Map<string, typeof events>();
  for (const e of events) byLearner.set(e.learnerId, [...(byLearner.get(e.learnerId) ?? []), e]);
  const mine = [...byLearner.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const learnerId = mine[0]?.learnerId;
  const stats = wordStats(attemptsFromEvents(mine));
  const mocks = games.filter((g) => g.learnerId === learnerId && g.payload?.game_id === LIST_ID && g.payload?.mode === "mock").slice(0, 5);
  const test = tests.find((t) => t.kind === "spelling" && t.refId === LIST_ID);
  const active = test ? activeUpcomingTests(Date.now(), [test]).length > 0 : false;
  return (
    <div>
      <h1>{LIST_TITLE}</h1>
      <p>
        Test date: <b>{test?.testDate ?? "not set"}</b> {active ? "(pinned on her Today plan)" : "(not pinned)"} · change it on <a href="/admin/upcoming-tests">Test dates</a>.
      </p>
      <p>
        <b>{masteredCount(stats)} of {D2_WORDS.length}</b> mastered (mastered = {MASTERY_STREAK} first-try right in a row, across 2+ separate sessions).
      </p>
      {mocks.length ? (
        <section className="pd-card">
          <h2>Mock tests</h2>
          <ul>{mocks.map((m) => <li key={m.id}>{fmt(m.serverTs)}: {String(m.payload?.score ?? "?")} / {String(m.payload?.total ?? "?")}{Array.isArray(m.payload?.missed) && m.payload.missed.length ? `, missed ${(m.payload.missed as string[]).join(", ")}` : ""}</li>)}</ul>
        </section>
      ) : null}
      <section className="pd-card">
        <h2>Per word</h2>
        <table className="pd-table">
          <thead><tr><th>Word</th><th>Group</th><th>Status</th><th>Streak</th><th>Right / tries</th><th>Last practiced</th></tr></thead>
          <tbody>
            {D2_WORDS.map((w) => {
              const s = stats.find((x) => x.word === w.word);
              return (
                <tr key={w.word}>
                  <td><b>{w.word}</b></td>
                  <td>{w.group}</td>
                  <td>{s?.mastered ? "⭐ mastered" : s?.attempts ? "learning" : "not started"}</td>
                  <td>{s?.streak ?? 0}</td>
                  <td>{s ? `${s.correct} / ${s.attempts}` : "0 / 0"}</td>
                  <td>{fmt(s?.lastAt ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
