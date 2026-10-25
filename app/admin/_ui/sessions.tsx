import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import type { SessionHistoryView } from "@/lib/admin/types";

export function SessionTimeline({ data }: { data: SessionHistoryView }) {
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Sessions</p>
      <h1>History</h1>
      <p className="pd-lead">
        Each sitting, with engaged minutes, first-try accuracy, and a reading-pace / skipping
        indicator. Skim means reading items came in faster than about 240 words per minute. Rush
        means several sub-1.5s wrong answers.
      </p>
      {data.sessions.length === 0 ? (
        <EmptyState title="No sessions yet" body="When Mae opens Study or a game, a timeline row will appear here." />
      ) : (
        <div className="pd-timeline">
          {data.sessions.map((session) => (
            <article className="pd-card pd-session" key={session.id}>
              <time dateTime={new Date(session.startedAt).toISOString()}>{formatEtDateTime(session.startedAt)}</time>
              <div>
                <strong>
                  {session.entryPoint || "study"} · {session.engagedMinutes} engaged min
                </strong>
                <div className="pd-legend" style={{ marginTop: 6 }}>
                  <span>{session.items} items</span>
                  <span>Accuracy {formatPct(session.firstTryAccuracy)}</span>
                  <span>{session.xp} XP</span>
                  {session.neededHelp ? <span className="pd-pill rush">Needed help on {session.neededHelp}</span> : null}
                  <span className={`pd-pill ${session.pace}`}>{session.pace}</span>
                </div>
                <p className="pd-lead" style={{ margin: "8px 0 0" }}>
                  {session.paceNote}
                  {session.endedAt ? ` Ended ${formatEtDateTime(session.endedAt)}.` : " Still open or idle-closed later."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
