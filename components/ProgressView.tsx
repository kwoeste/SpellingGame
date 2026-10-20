import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import type { StudentProgress } from "@/lib/engine/service";

type Props = {
  displayName: string;
  progress: StudentProgress;
};

export function ProgressView({ displayName, progress }: Props) {
  return (
    <>
      <section className="progress-hero">
        <Mascot mood={progress.streakDays > 0 ? "cheer" : "idle"} size={96} />
        <div>
          <h2 style={{ margin: 0 }}>Great work, {displayName}!</h2>
          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
            Keep earning stars and growing your streak.
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
          <p style={{ color: "var(--muted)" }}>
            Complete chapters to earn star badges. Each chapter you master gives you a star!
          </p>
        ) : (
          <div className="badges-grid">
            {progress.badges.map((badge) => (
              <div key={badge.id} className="badge-card">
                <span className="badge-icon">⭐</span>
                <span className="badge-label">{badge.label}</span>
              </div>
            ))}
          </div>
        )}
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

  const weeks: { date: Date; key: string; xp: number }[][] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 41);
  while (start.getDay() !== 0) {
    start.setDate(start.getDate() - 1);
  }

  let week: { date: Date; key: string; xp: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    week.push({ date: new Date(cursor), key, xp: xpByDate.get(key) ?? 0 });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length > 0) {
    weeks.push(week);
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="streak-calendar">
      <div className="streak-day-labels">
        {dayLabels.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="streak-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="streak-week">
            {week.map((day) => {
              const future = day.date > today;
              const level = future ? 0 : day.xp === 0 ? 0 : day.xp < 30 ? 1 : day.xp < 60 ? 2 : day.xp < 100 ? 3 : 4;
              return (
                <div
                  key={day.key}
                  className={`streak-day level-${level}${future ? " future" : ""}`}
                  title={future ? "" : `${day.key}: ${day.xp} XP`}
                  aria-label={future ? "Future" : `${day.key}: ${day.xp} XP`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="streak-legend">
        <span>Less</span>
        <div className="streak-day level-0" />
        <div className="streak-day level-1" />
        <div className="streak-day level-2" />
        <div className="streak-day level-3" />
        <div className="streak-day level-4" />
        <span>More</span>
      </div>
    </div>
  );
}
