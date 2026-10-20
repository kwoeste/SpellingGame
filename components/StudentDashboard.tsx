import Link from "next/link";
import { GameArcade } from "@/components/GameArcade";
import { LikesPicker } from "@/components/LikesPicker";
import { Mascot } from "@/components/ui/Mascot";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { VoicePicker } from "@/components/ui/VoicePicker";
import type { ArcadeTile } from "@/lib/games/arcade";

export type DashChapter = {
  id: string;
  number: number;
  titleKid: string;
  subject: "science" | "ela" | "religion" | "math";
};

const SUBJECT_LABEL = { science: "Science", ela: "Reading", religion: "Religion", math: "Math" } as const;

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

  return (
    <div className="kid-shell">
      <section className="kid-hero">
        <Mascot mood={streakDays > 0 ? "cheer" : "idle"} size={108} />
        <div>
          <p className="kid-kicker">Today&apos;s quest</p>
          <h1 style={{ margin: "0 0 8px" }}>Hi {displayName}!</h1>
          {quest ? (
            <>
              <p style={{ fontWeight: 800, fontSize: "1.15rem" }}>{quest.titleKid}</p>
              <Link className="btn" href={`/study/${quest.chapterId}`} style={{ display: "inline-block", marginTop: 8, textDecoration: "none" }}>
                {resume ? "Continue where I left off" : "Start this quest"}
              </Link>
            </>
          ) : (
            <p>You cleared today&apos;s chapters. Play a game or pick a new pack.</p>
          )}
        </div>
      </section>

      <div className="stat-row" style={{ margin: "16px 0" }}>
        <div className="stat-card">
          <strong>{xpToday}</strong>
          XP today
          <div style={{ color: "var(--muted)", fontWeight: 700 }}>{xpTotal} all time</div>
        </div>
        <div className="stat-card">
          <strong>{streakDays}</strong>
          Day streak
          <div style={{ color: "var(--muted)", fontWeight: 700 }}>{streakDays ? "Keep it glowing!" : "Play to start a streak"}</div>
        </div>
        <div className="stat-card" style={{ display: "grid", placeItems: "center" }}>
          <ProgressRing pct={week?.pct ?? 0} label="This week" size={96} />
        </div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <p className="kid-kicker">Your voice</p>
        <h2>Read-aloud settings</h2>
        <p>Pick a voice and speed. Games and Study both use this.</p>
        <VoicePicker />
      </section>

      <section style={{ marginBottom: 22 }}>
        <p className="kid-kicker">Progress map</p>
        <h2>Chapter packs</h2>
        <div className="subject-map">
          {subjects.map((subject) => {
            const group = chapters.filter((chapter) => chapter.subject === subject);
            const ring = subjectRings.find((row) => row.id === `subject:${subject}`);
            return (
              <div key={subject} className={`subject-card ${subject}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0 }}>{SUBJECT_LABEL[subject]}</h3>
                  <ProgressRing pct={ring?.pct ?? 0} label="" size={64} />
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
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ marginBottom: 22 }}>
        <LikesPicker initialLiked={likes} heading={likes.length ? "Update what you like" : "What do you like?"} />
      </div>

      <GameArcade tiles={arcadeTiles} resumeHref={null} />

      <p style={{ marginTop: 28 }}>
        <Link href="/store">Visit Mae&apos;s 3D print shop</Link>
      </p>
    </div>
  );
}
