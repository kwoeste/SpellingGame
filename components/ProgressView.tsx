import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { etDateKey } from "@/lib/engine/scheduler";
import type { StudentProgress } from "@/lib/engine/service";

type Props = {
  displayName: string;
  progress: StudentProgress;
  allChapters: { id: string; titleKid: string; subject: string }[];
};

const SUBJECT_LABEL: Record<string, string> = {
  science: "🔬 Science",
  ela: "📚 Reading",
  religion: "✝️ Religion",
  math: "🔢 Math",
};

const SUBJECT_ORDER = ["science", "math", "ela", "religion"];

export function ProgressView({ displayName, progress, allChapters }: Props) {
  const hasProgress = progress.starsEarned > 0 || progress.streakDays > 0 || progress.xpTotal > 0;
  const earnedIds = new Set(progress.chaptersCompleted);
  
  const chaptersBySubject = SUBJECT_ORDER
    .map(subject => ({
      subject,
      label: SUBJECT_LABEL[subject] ?? subject,
      chapters: allChapters.filter(ch => ch.subject === subject),
    }))
    .filter(group => group.chapters.length > 0);
  
  return (
    <>
      <section className="progress-hero">
        <Mascot mood={hasProgress ? "cheer" : "idle"} size={80} />
        <div>
          <h2 style={{ margin: 0 }}>
            {hasProgress ? `Great work, ${displayName}!` : `Welcome, ${displayName}!`}
          </h2>
          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
            {hasProgress 
              ? "Keep earning stars and growing your streak." 
              : "Let's earn your first star! Complete a chapter to get started."}
          </p>
        </div>
      </section>

      <div className="progress-stats">
        <div className="progress-stat-card stars">
          <span className="progress-stat-icon">⭐</span>
          <div>
            <strong>{progress.starsEarned}</strong>
            <span>Stars earned</span>
          </div>
        </div>
        <div className="progress-stat-card chapters">
          <span className="progress-stat-icon">📚</span>
          <div>
            <strong>
              {progress.chaptersCompleted.length} / {progress.totalChapters}
            </strong>
            <span>Chapters done</span>
          </div>
        </div>
        <div className="progress-stat-card xp">
          <span className="progress-stat-icon">✨</span>
          <div>
            <strong>{progress.xpTotal}</strong>
            <span>XP total</span>
          </div>
        </div>
        <div className="progress-stat-card streak">
          <span className="progress-stat-icon">🔥</span>
          <div>
            <strong>{progress.streakDays}</strong>
            <span>Day streak</span>
          </div>
        </div>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <h3>Streak Calendar</h3>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>
          Days you played are highlighted. Keep the streak going!
        </p>
        <StreakCalendar dailyXp={progress.dailyXp} />
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h3>Badges</h3>
        {progress.badges.length === 0 ? (
          <div className="badges-empty">
            <Mascot mood="idle" size={64} />
            <p>Complete chapters to earn star badges!</p>
            <p className="badges-empty-hint">Each chapter you master gives you a shiny star.</p>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", marginBottom: 14 }}>
            You&apos;ve earned {progress.badges.length} of {allChapters.length} badges!
          </p>
        )}
        {chaptersBySubject.map(group => (
          <div key={group.subject} className="badges-group">
            <h4 className="badges-group-label">{group.label}</h4>
            <div className="badges-grid">
              {group.chapters.map((chapter) => {
                const earned = earnedIds.has(chapter.id);
                const badge = progress.badges.find(b => b.id === `${chapter.id}-star`);
                return (
                  <div key={chapter.id} className={`badge-card ${earned ? "earned" : "locked"}`}>
                    <span className="badge-icon">{earned ? "⭐" : "🔒"}</span>
                    <div className="badge-info">
                      <span className="badge-label">{chapter.titleKid}</span>
                      {earned && badge ? (
                        <span className="badge-date">Earned {badge.earnedAt}</span>
                      ) : (
                        <span className="badge-hint">Complete this chapter</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/study" className="btn">
          Back to Study
        </Link>
      </div>
    </>
  );
}

function StreakCalendar({ dailyXp }: { dailyXp: { date: string; xp: number }[] }) {
  // Work in America/New_York calendar days (matching the server's etDateKey XP buckets),
  // using UTC-noon Date objects so arithmetic is independent of the runtime's timezone.
  const todayKey = etDateKey(new Date());
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td, 12));
  const xpByDate = new Map(dailyXp.map((d) => [d.date, d.xp]));

  const days: { date: Date; key: string; xp: number; isToday: boolean }[] = [];
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 34);
  while (start.getUTCDay() !== 0) {
    start.setUTCDate(start.getUTCDate() - 1);
  }

  const cursor = new Date(start);
  while (cursor <= today || days.length % 7 !== 0) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      date: new Date(cursor),
      key,
      xp: xpByDate.get(key) ?? 0,
      isToday: key === todayKey,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="streak-calendar-compact">
      <div className="streak-header-compact">
        {dayLabels.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="streak-cells-compact">
        {days.map((day) => {
          const future = day.date > today;
          const played = day.xp > 0 && !future;
          const dayNum = day.date.getUTCDate();
          return (
            <div
              key={day.key}
              className={`streak-cell-compact${played ? " played" : ""}${day.isToday ? " today" : ""}${future ? " future" : ""}`}
              title={future ? "" : `${day.key}: ${day.xp} XP`}
              aria-label={day.isToday ? `Today: ${day.xp} XP` : future ? "Future" : `${day.key}: ${day.xp} XP`}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
      <div className="streak-legend-compact">
        <span className="streak-cell-compact played mini" /> Played
        <span className="streak-cell-compact today mini" style={{ marginLeft: 12 }} /> Today
      </div>
    </div>
  );
}
