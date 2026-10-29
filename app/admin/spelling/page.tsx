import type { Metadata } from "next";
import { adminRepo } from "@/lib/engine/repos";
import { activeUpcomingTests } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { MASTERY_STREAK, masteredCount, wordStats } from "@/lib/spelling/engine";
import { D2_WORDS, LIST_ID, LIST_TITLE } from "@/lib/spelling/list-d2";
import { SPELLING_EVENT, attemptsFromEvents } from "@/lib/spelling/service";
import { PRACTICE_MODES, buildMix, modeLabel, parseMix, type SpellingMix } from "@/lib/spelling/mix";
import { PREVIEW_LOGIN_PREFIX } from "@/lib/engine/plan";
import { etDateKey } from "@/lib/engine/scheduler";

export const metadata: Metadata = { title: "Admin · Spelling | Mae's Lab" };
export const dynamic = "force-dynamic";

const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default async function SpellingAdminPage() {
  const repo = adminRepo();
  const since = etDateKey(new Date(Date.now() - 14 * 86_400_000));
  const [events, games, tests, plans] = await Promise.all([repo.eventsOfType(SPELLING_EVENT, 5000), repo.eventsOfType("game_event", 1000), loadUpcomingTests("admin"), repo.sessionPlans(since).catch(() => [])]);
  // One learner (Mae): use whoever has the most attempts so an admin's tryouts don't mix in.
  const byLearner = new Map<string, typeof events>();
  for (const e of events) byLearner.set(e.learnerId, [...(byLearner.get(e.learnerId) ?? []), e]);
  const mine = [...byLearner.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const learnerId = mine[0]?.learnerId;
  const attempts = attemptsFromEvents(mine);
  const stats = wordStats(attempts);
  // Latest mix stored with one of Mae's own sign-in plans (not a parent preview), else computed now.
  const stored = plans
    .filter((p) => p.learnerId === learnerId && !p.loginId.startsWith(PREVIEW_LOGIN_PREFIX))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => parseMix((p.plan as { spellingMix?: unknown }).spellingMix))
    .find(Boolean);
  const mix: SpellingMix = stored ?? (await buildMix(attempts, stats, Date.now(), null));
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
      <p className="pd-card" role="note" style={{ padding: 12 }}>
        These stats are Mae&apos;s answers only{events.length ? "" : " (none recorded yet)"}. Admin accounts have no learner profile, so practice done while signed in as an admin runs in preview mode and is never saved. To see data here, practice from Mae&apos;s account.
      </p>
      <section className="pd-card">
        <h2>Game mix (how Mae learns best)</h2>
        <p><b>{mix.source === "ai" ? `Grok note (${mix.model ?? "xAI"})` : "Note (deterministic)"}:</b> {mix.note}</p>
        <p style={{ fontSize: "0.9rem" }}>
          {mix.phase === "explore" ? "Exploring: near-equal shares until every game has enough later checks." : "Exploiting: games whose words stay right later get more of the session."} Every game keeps at least 12%.
          {" "}{stored ? `Built at sign-in ${fmt(mix.createdAt)}.` : "Not stored yet (computed now; it is saved with her next sign-in plan)."}
        </p>
        <table className="pd-table">
          <thead><tr><th>Game</th><th>Weight now</th><th>Tries</th><th>Right first try (in game)</th><th>Right later (effectiveness)</th><th>Score</th></tr></thead>
          <tbody>
            {mix.stats.map((m) => (
              <tr key={m.mode}>
                <td><b>{modeLabel(m.mode)}</b></td>
                <td>{(PRACTICE_MODES as readonly string[]).includes(m.mode) ? `${Math.round(mix.weights[m.mode as (typeof PRACTICE_MODES)[number]] * 100)}%` : "end-of-session check"}</td>
                <td>{m.attempts}</td>
                <td>{m.in_game_accuracy === null ? "—" : `${Math.round(m.in_game_accuracy * 100)}%`}</td>
                <td>{m.later_accuracy === null ? "— (0 checks)" : `${Math.round(m.later_accuracy * 100)}% of ${m.later_n}`}</td>
                <td>{m.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: "0.85rem" }}>&quot;Right later&quot; = the next first try at that word in Listen &amp; spell or a mock test, in a later session. In-game accuracy is shown but not used (easy games like tiles inflate it).</p>
      </section>
      {mocks.length ? (
        <section className="pd-card">
          <h2>Mock tests</h2>
          <ul>{mocks.map((m) => <li key={m.id}>{fmt(m.serverTs)}: {String(m.payload?.score ?? "?")} / {String(m.payload?.total ?? "?")}{Array.isArray(m.payload?.missed) && m.payload.missed.length ? `, missed ${(m.payload.missed as string[]).join(", ")}` : ""}</li>)}</ul>
        </section>
      ) : null}
      <section className="pd-card">
        <h2>Per word</h2>
        <table className="pd-table">
          <thead><tr><th>Word</th><th>Group</th><th>Status</th><th>Streak</th><th>Right / wrong / tries</th><th>Last practiced</th></tr></thead>
          <tbody>
            {D2_WORDS.map((w) => {
              const s = stats.find((x) => x.word === w.word);
              return (
                <tr key={w.word}>
                  <td><b>{w.word}</b></td>
                  <td>{w.group}</td>
                  <td>{s?.mastered ? "⭐ mastered" : s?.attempts ? "learning" : "not started"}</td>
                  <td>{s?.streak ?? 0}</td>
                  <td>{s ? `${s.correct} / ${s.attempts - s.correct} / ${s.attempts}` : "0 / 0 / 0"}</td>
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
