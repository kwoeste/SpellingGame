import type { Metadata } from "next";
import { SpellingDateForm } from "@/app/admin/spelling/date-form";
import type { StoredEvent } from "@/lib/engine/repo";
import { adminRepo } from "@/lib/engine/repos";
import { PREVIEW_LOGIN_PREFIX } from "@/lib/engine/plan";
import { etDateKey } from "@/lib/engine/scheduler";
import { activeUpcomingTests, pastSpellingLists, type UpcomingTest } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { spellingList, spellingLists, type SpellingList } from "@/lib/spelling/catalog";
import { MASTERY_STREAK, masteredCount, wordStats } from "@/lib/spelling/engine";
import { PRACTICE_MODES, buildMix, modeLabel, parseMix, type SpellingMix } from "@/lib/spelling/mix";
import { SPELLING_EVENT, attemptsFromEvents } from "@/lib/spelling/service";

export const metadata: Metadata = { title: "Admin · Spelling | Mae's Lab" };
export const dynamic = "force-dynamic";

const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

function dateStatus(test: UpcomingTest | undefined, active: boolean, inReview: boolean): string {
  if (!test?.testDate) return "no date yet";
  if (active) return `${test.testDate} (pinned on her Today plan)`;
  if (inReview) return `${test.testDate} (in review)`;
  return test.testDate;
}

export default async function SpellingAdminPage() {
  const repo = adminRepo();
  const since = etDateKey(new Date(Date.now() - 14 * 86_400_000));
  const [events, games, tests, plans] = await Promise.all([repo.eventsOfType(SPELLING_EVENT, 5000), repo.eventsOfType("game_event", 1000), loadUpcomingTests("admin"), repo.sessionPlans(since).catch(() => [])]);
  const byLearner = new Map<string, typeof events>();
  for (const e of events) byLearner.set(e.learnerId, [...(byLearner.get(e.learnerId) ?? []), e]);
  const mine = [...byLearner.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const learnerId = mine[0]?.learnerId;
  const now = Date.now();
  const active = activeUpcomingTests(now, tests);
  const past = pastSpellingLists(now, tests);
  const priority = spellingList(active.find((t) => t.kind === "spelling")?.refId) ?? spellingLists()[0];
  const stored = plans
    .filter((p) => p.learnerId === learnerId && !p.loginId.startsWith(PREVIEW_LOGIN_PREFIX))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => parseMix((p.plan as { spellingMix?: unknown }).spellingMix))
    .find((mix) => mix && (!mix.listId || mix.listId === priority.id));
  const priorityAttempts = attemptsFromEvents(mine, priority.id);
  const priorityStats = wordStats(priorityAttempts, priority.words);
  const mix: SpellingMix = (stored?.listId === priority.id ? stored : null) ?? (await buildMix(priorityAttempts, priorityStats, now, null));

  return (
    <div>
      <h1>Spelling</h1>
      <p>The list with no date yet stays at the top of her Today plan. Set a date here or on <a href="/admin/upcoming-tests">Test dates</a>. After the date passes, that list moves into her spaced-review rotation.</p>
      {spellingLists().map((list) => (
        <ListSection
          key={list.id}
          list={list}
          test={tests.find((t) => t.kind === "spelling" && t.refId === list.id)}
          active={active.some((t) => t.kind === "spelling" && t.refId === list.id)}
          inReview={past.some((t) => t.refId === list.id)}
          attempts={mine}
          events={events}
          games={games}
          learnerId={learnerId}
        />
      ))}
      <MixSection list={priority} mix={mix} stored={Boolean(stored && stored.listId === priority.id)} />
      <p className="pd-card" role="note" style={{ padding: 12 }}>
        These stats are Mae&apos;s answers only{events.length ? "" : " (none recorded yet)"}. Admin accounts have no learner profile, so practice done while signed in as an admin runs in preview mode and is never saved. To see data here, practice from Mae&apos;s account.
      </p>
    </div>
  );
}

function ListSection({
  list,
  test,
  active,
  inReview,
  attempts,
  events,
  games,
  learnerId,
}: {
  list: SpellingList;
  test: UpcomingTest | undefined;
  active: boolean;
  inReview: boolean;
  attempts: Parameters<typeof attemptsFromEvents>[0];
  events: { length: number };
  games: StoredEvent[];
  learnerId: string | undefined;
}) {
  const stats = wordStats(attemptsFromEvents(attempts, list.id), list.words);
  const mocks = games.filter((g) => g.learnerId === learnerId && g.payload?.game_id === list.id && g.payload?.mode === "mock").slice(0, 5);
  const row: UpcomingTest = test ?? { id: list.id, kind: "spelling", refId: list.id, title: list.title, startDate: "2026-11-11", testDate: null };
  return (
    <section className="pd-card">
      <h2>{list.title}</h2>
      <p>
        Test date: <b>{dateStatus(test, active, inReview)}</b>
        {inReview ? " · quick review on her Today plan" : active ? "" : " · not pinned"}
      </p>
      <SpellingDateForm test={row} />
      <p>
        <b>{masteredCount(stats)} of {list.words.length}</b> mastered (mastered = {MASTERY_STREAK} first-try right in a row, across 2+ separate sessions).
        {events.length ? "" : " No answers yet."}
      </p>
      {mocks.length ? (
        <ul>{mocks.map((m) => <li key={m.id}>{fmt(m.serverTs)}: {String(m.payload?.score ?? "?")} / {String(m.payload?.total ?? "?")}{Array.isArray(m.payload?.missed) && m.payload.missed.length ? `, missed ${(m.payload.missed as string[]).join(", ")}` : ""}</li>)}</ul>
      ) : null}
      <table className="pd-table">
        <thead><tr><th>Word</th><th>Syllables</th><th>Status</th><th>Streak</th><th>Needed help</th><th>Right / wrong / tries</th><th>Last practiced</th></tr></thead>
        <tbody>
          {list.words.map((w) => {
            const s = stats.find((x) => x.word === w.word);
            return (
              <tr key={w.word}>
                <td><b>{w.word}</b></td>
                <td>{w.syllables ?? "—"}</td>
                <td>{s?.mastered ? "⭐ mastered" : s?.neededHelp ? "weak (needed help)" : s?.attempts ? "learning" : "not started"}</td>
                <td>{s?.streak ?? 0}</td>
                <td>{s?.neededHelp ? `🆘 ${s.neededHelp}` : "—"}</td>
                <td>{s ? `${s.correct} / ${s.attempts - s.correct} / ${s.attempts}` : "0 / 0 / 0"}</td>
                <td>{fmt(s?.lastAt ?? null)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function MixSection({ list, mix, stored }: { list: SpellingList; mix: SpellingMix; stored: boolean }) {
  return (
    <section className="pd-card">
      <h2>Game mix for {list.shortTitle}</h2>
      <p><b>{mix.source === "ai" ? `Grok note (${mix.model ?? "xAI"})` : "Note (deterministic)"}:</b> {mix.note}</p>
      <p style={{ fontSize: "0.9rem" }}>
        {mix.phase === "explore" ? "Exploring: near-equal shares until every game has enough later checks." : "Exploiting: games whose words stay right later get more of the session."} Every game keeps at least 12%.
        {" "}{stored ? `Built at sign-in ${fmt(mix.createdAt)}.` : "Not stored for this list yet (computed now; it is saved with her next sign-in plan)."}
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
  );
}
