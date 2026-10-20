import Link from "next/link";
import { LikesPicker } from "@/components/LikesPicker";
import { SettingsPopover } from "@/components/SettingsPopover";
import { Mascot } from "@/components/ui/Mascot";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { ArcadeTile } from "@/lib/games/arcade";

export type DashChapter = {
  id: string;
  number: number;
  titleKid: string;
  subject: "science" | "ela" | "religion" | "math";
};

const SUBJECT_LABEL = { science: "Science", ela: "Reading", religion: "Religion", math: "Math" } as const;
const SUBJECT_EMOJI = { science: "🔬", ela: "📚", religion: "✝️", math: "🔢" } as const;

export function StudentDashboard({
  displayName,
  resume,
  rings,
  xpToday,
  xpTotal,
  streakDays,
  chapters,
  likes,
  arcadeTiles,
}: {
  displayName: string;
  resume: { chapterId: string; titleKid: string } | null;
  rings: { id: string; label: string; pct: number }[];
  xpToday: number;
  xpTotal: number;
  streakDays: number;
  chapters: DashChapter[];
  likes: string[];
  arcadeTiles: ArcadeTile[];
}) {
  const week = rings.find((ring) => ring.id === "week");
  const subjectRings = rings.filter((ring) => ring.id.startsWith("subject:"));
  const chapterPct = new Map(rings.filter((ring) => !ring.id.startsWith("subject:") && ring.id !== "week").map((ring) => [ring.id, ring.pct]));
  const firstOpen = chapters.find((chapter) => (chapterPct.get(chapter.id) ?? 0) < 100);
  const quest = resume ?? (firstOpen ? { chapterId: firstOpen.id, titleKid: firstOpen.titleKid } : null);
  const subjects = [...new Set(chapters.map((chapter) => chapter.subject))];

  const numberMatch = arcadeTiles.find(t => t.href === "/number-match");
  const spellingFirst = arcadeTiles.find(t => t.group === "spelling");
  const otherGames = arcadeTiles.filter(t => t.group !== "spelling" && t.href !== "/number-match").slice(0, 2);
  const gamesPreview = [numberMatch, spellingFirst, ...otherGames].filter(Boolean).slice(0, 4) as typeof arcadeTiles;

  return (
    <div className="kid-shell">
      {/* Settings gear in top-right */}
      <div className="settings-corner">
        <SettingsPopover />
      </div>

      {/* Hero with bigger mascot and quest */}
      <section className="kid-hero kid-hero-large">
        <Mascot mood={streakDays > 0 ? "cheer" : "idle"} size={140} />
        <div>
          <p className="kid-kicker">Today&apos;s quest</p>
          <h1 style={{ margin: "0 0 8px" }}>Hi {displayName}!</h1>
          {quest ? (
            <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>{quest.titleKid}</p>
          ) : (
            <p style={{ margin: 0 }}>You cleared today&apos;s chapters!</p>
          )}
        </div>
      </section>

      {/* Continue card */}
      {quest && (
        <Link href={`/study/${quest.chapterId}`} className="continue-card">
          <span className="continue-icon">▶</span>
          <span className="continue-text">
            <strong>{resume ? "Continue where you left off" : "Start today's quest"}</strong>
            <span>{quest.titleKid}</span>
          </span>
          <span className="continue-arrow">→</span>
        </Link>
      )}

      {/* Progress & badges button - prominent */}
      <Link href="/my-progress" className="progress-btn">
        <span className="progress-btn-icon">🏆</span>
        <span>My progress &amp; badges</span>
        <span className="progress-btn-stats">
          {streakDays > 0 && <span className="streak-badge">🔥 {streakDays}</span>}
          <span>{xpTotal} XP</span>
        </span>
      </Link>

      {/* Stats row - compact */}
      <div className="stat-row stat-row-compact">
        <div className="stat-card stat-card-compact">
          <strong>{xpToday}</strong>
          <span>XP today</span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>{streakDays}</strong>
          <span>Day streak</span>
        </div>
        <div className="stat-card stat-card-compact">
          <ProgressRing pct={week?.pct ?? 0} label="Week" size={56} />
        </div>
      </div>

      {/* Chapter packs as big cards */}
      <section style={{ marginBottom: 22 }}>
        <p className="kid-kicker">Chapter packs</p>
        <h2>Pick a subject</h2>
        <div className="chapter-packs">
          {subjects.map((subject) => {
            const group = chapters.filter((chapter) => chapter.subject === subject);
            const ring = subjectRings.find((row) => row.id === `subject:${subject}`);
            const nextChapter = group.find((ch) => (chapterPct.get(ch.id) ?? 0) < 100);
            return (
              <div key={subject} className={`pack-card ${subject}`}>
                <div className="pack-header">
                  <span className="pack-emoji">{SUBJECT_EMOJI[subject]}</span>
                  <h3>{SUBJECT_LABEL[subject]}</h3>
                  <ProgressRing pct={ring?.pct ?? 0} label="" size={56} />
                </div>
                <div className="path-dots">
                  {group.map((chapter) => {
                    const pct = chapterPct.get(chapter.id) ?? 0;
                    const cls = pct >= 100 ? "done" : quest?.chapterId === chapter.id ? "now" : "";
                    return (
                      <Link
                        key={chapter.id}
                        href={`/study/${chapter.id}`}
                        className={`path-dot ${cls}`}
                        title={chapter.titleKid}
                        aria-label={`${chapter.number}. ${chapter.titleKid}, ${Math.round(pct)} percent`}
                      >
                        {pct >= 100 ? "★" : chapter.number}
                      </Link>
                    );
                  })}
                </div>
                {nextChapter && (
                  <Link href={`/study/${nextChapter.id}`} className="pack-next-btn">
                    <span className="pack-next-arrow">→</span>
                    <span>Next: {nextChapter.titleKid}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Games teaser */}
      <section className="games-teaser">
        <div className="games-teaser-header">
          <div>
            <p className="kid-kicker">Game arcade</p>
            <h2>Ready for fun?</h2>
          </div>
          <Link href="/games" className="btn">See all games</Link>
        </div>
        <div className="games-preview-grid">
          {gamesPreview.map((tile) => (
            <Link key={tile.id} href={tile.href} className={`games-preview-tile ${tile.tint}`}>
              <span className="preview-icon">{tile.icon}</span>
              <span className="preview-title">{tile.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Likes */}
      <div style={{ marginBottom: 22 }}>
        <LikesPicker initialLiked={likes} heading={likes.length ? "Update what you like" : "What do you like?"} />
      </div>

      <p style={{ marginTop: 28 }}>
        <Link href="/store">Visit Mae&apos;s 3D print shop</Link>
      </p>
    </div>
  );
}
