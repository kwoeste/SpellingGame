import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import type { StudentProgress } from "@/lib/engine/service";

type Props = {
  displayName: string;
  progress: StudentProgress;
  allChapters: { id: string; titleKid: string; subject: string }[];
};

export function ProgressView({ displayName, progress, allChapters }: Props) {
  const hasProgress = progress.starsEarned > 0 || progress.streakDays > 0 || progress.xpTotal > 0;
  const earnedIds = new Set(progress.chaptersCompleted);
  
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
        <p style={{ color: "var(--muted)", marginBottom: 14 }}>
          {progress.badges.length === 0 
            ? "Complete chapters to earn star badges. Each chapter you master gives you a star!"
            : `You've earned ${progress.badges.length} of ${allChapters.length} badges!`}
        </p>
        <div className="badges-grid">
          {allChapters.map((chapter) => {
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
  const today = new Date();
  const xpByDate = new Map(dailyXp.map((d) => [d.date, d.xp]));

  const days: { date: Date; key: string; xp: number; dayOfWeek: number }[] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 34);
  while (start.getDay() !== 0) {
    start.setDate(start.getDate() - 1);
  }

  const cursor = new Date(start);
  while (cursor <= today || days.length % 7 !== 0) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: new Date(cursor), key, xp: xpByDate.get(key) ?? 0, dayOfWeek: cursor.getDay() });
    cursor.setDate(cursor.getDate() + 1);
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="streak-calendar-full">
      <div className="streak-header">
        {dayLabels.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="streak-cells">
        {days.map((day) => {
          const future = day.date > today;
          const level = future ? 0 : day.xp === 0 ? 0 : day.xp < 30 ? 1 : day.xp < 60 ? 2 : day.xp < 100 ? 3 : 4;
          const dayNum = day.date.getDate();
          return (
            <div
              key={day.key}
              className={`streak-cell level-${level}${future ? " future" : ""}`}
              title={future ? "" : `${day.key}: ${day.xp} XP`}
              aria-label={future ? "Future" : `${day.key}: ${day.xp} XP`}
            >
              <span className="cell-day">{dayNum}</span>
              {day.xp > 0 && !future && <span className="cell-xp">{day.xp}</span>}
            </div>
          );
        })}
      </div>
      <div className="streak-legend-full">
        <span>Less activity</span>
        <div className="legend-cells">
          <div className="streak-cell level-0 mini" />
          <div className="streak-cell level-1 mini" />
          <div className="streak-cell level-2 mini" />
          <div className="streak-cell level-3 mini" />
          <div className="streak-cell level-4 mini" />
        </div>
        <span>More activity</span>
      </div>
    </div>
  );
}
