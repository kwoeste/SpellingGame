import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtSpan, formatEtTime, formatPct } from "@/lib/admin/format";
import type { SessionHistoryView } from "@/lib/admin/types";

export function SessionTimeline({ data }: { data: SessionHistoryView }) {
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Study history</p>
      <h1>Each time she sat down</h1>
      <p className="pd-lead">
        How long she really worked, how many she got right on the first try, and whether she was
        reading too fast (faster than about 240 words a minute) or rushing (quick wrong taps under 1.5 seconds).
      </p>
      {data.sessions.length === 0 ? (
        <EmptyState title="No sessions yet" body="When Mae opens Study or a game, a timeline row will appear here." />
      ) : (
        <div className="pd-timeline">
          {data.sessions.map((session) => (
            <article className="pd-card pd-session" key={session.id}>
              <time className="pd-session-time" dateTime={new Date(session.startedAt).toISOString()}>{formatEtSpan(session.startedAt, session.endedAt ?? session.lastActivityAt)}</time>
              <div>
                <strong>
                  {placeLabel(session.entryPoint)} · {session.engagedMinutes} min working
                </strong>
                <div className="pd-legend" style={{ marginTop: 6 }}>
                  <span>{session.items} answers</span>
                  <span>Right first try {formatPct(session.firstTryAccuracy)}</span>
                  <span>{session.xp} XP</span>
                  {session.neededHelp ? <span className="pd-pill">Got stuck on {session.neededHelp} question{session.neededHelp === 1 ? "" : "s"}</span> : null}
                  <span className={`pd-pill ${session.pace}`}>Pace: {PACE_LABEL[session.pace] ?? session.pace}</span>
                </div>
                <p className="pd-lead" style={{ margin: "8px 0 0" }}>
                  {sessionNote(session)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Questions 8:58 – 9:55 AM. Ended 9:55 AM (went idle)." in ET; no engine wording. */
export function sessionNote(session: SessionHistoryView["sessions"][number]): string {
  const parts: string[] = [];
  if (session.firstQuestionAt !== null && session.firstQuestionAt - session.startedAt > 5 * 60_000) {
    parts.push(`Opened ${formatEtTime(session.startedAt)}, first question ${formatEtTime(session.firstQuestionAt)}.`);
  }
  if (session.endedAt) parts.push(`Ended ${formatEtTime(session.endedAt)}.`);
  else parts.push(`Ended ${formatEtTime(session.lastActivityAt)} (went idle).`);
  if (session.idleMinutes >= 5) parts.push(`About ${session.idleMinutes} min of breaks.`);
  return parts.join(" ");
}

const PACE_LABEL: Record<string, string> = { ok: "Good pace", skim: "Read too fast", skip: "Skipped ahead", rush: "Rushing" };

function placeLabel(entry: string | null | undefined): string {
  if (!entry || entry === "study") return "Study";
  if (entry.startsWith("game") || entry.includes("game")) return "Game";
  if (entry.includes("watch")) return "Watch it";
  return entry.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}
