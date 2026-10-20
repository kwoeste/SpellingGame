import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import type { SessionHistoryView } from "@/lib/admin/types";

export function SessionTimeline({ data }: { data: SessionHistoryView }) {
  return (
    <div className="ad-wrap">
      <p className="ad-kicker">Sessions</p>
      <h1>History</h1>
      <p className="ad-lead">
        Each sitting, with engaged minutes, first-try accuracy, and a reading-pace / skipping
        indicator. Skim means reading items came in faster than about 240 words per minute. Rush
        means several sub-1.5s wrong answers.
      </p>
      {data.sessions.length === 0 ? (
        <EmptyState title="No sessions yet" body="When Mae opens Study or a game, a timeline row will appear here." />
      ) : (
        <div className="ad-timeline">
          {data.sessions.map((session) => (
            <article className="ad-card ad-session" key={session.id}>
              <time dateTime={new Date(session.startedAt).toISOString()}>{formatEtDateTime(session.startedAt)}</time>
              <div>
                <strong>
                  {session.entryPoint || "study"} · {session.engagedMinutes} engaged min
                </strong>
                <div className="ad-legend" style={{ marginTop: 6 }}>
                  <span>{session.items} items</span>
                  <span>Accuracy {formatPct(session.firstTryAccuracy)}</span>
                  <span>{session.xp} XP</span>
                  <span className={`ad-pill ${session.pace}`}>{session.pace}</span>
                </div>
                <p className="ad-lead" style={{ margin: "8px 0 0" }}>
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
