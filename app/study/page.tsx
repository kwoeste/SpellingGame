import Link from "next/link";
import { LikesPicker } from "@/components/LikesPicker";
import { NotAllowed } from "@/components/NotAllowed";
import { requirePageUser } from "@/lib/auth/server";
import { listChapters, NAMED_GAMES } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import { engineRepo } from "@/lib/engine/repos";
import { resumePoint } from "@/lib/engine/service";
import { gameVisibleTo } from "@/lib/content/games";

const SUBJECT_LABEL = { science: "Science", ela: "Reading", religion: "Religion", math: "Math" } as const;

export default async function StudyIndexPage() {
  const user = await requirePageUser(["student", "admin"], "/study");
  if (!user) return <NotAllowed />;
  const chapters = listChapters().filter((chapter) => chapterVisibleTo(chapter, user.role));
  const subjects = [...new Set(chapters.map((chapter) => chapter.subject))];
  const resume = await resumePoint(engineRepo(), { role: user.role, learnerId: user.learnerId }).catch(() => null);
  const games = NAMED_GAMES.filter((game) => gameVisibleTo(game.id, user.role));
  return (
    <div className="wrap">
      <h1>Study</h1>
      <p>10–15 minute drop-ins. No timers on screen.</p>
      {resume ? (
        <p>
          <Link className="btn" href={`/study/${resume.chapterId}`}>
            Continue where I left off: {resume.titleKid}
          </Link>
        </p>
      ) : null}
      <LikesPicker />
      <div className="grid cols-2">
        {subjects.map((subject) => (
          <div key={subject} className="card">
            <h2>{SUBJECT_LABEL[subject]}</h2>
            {chapters
              .filter((chapter) => chapter.subject === subject)
              .map((chapter) => (
                <p key={chapter.id}>
                  <Link href={`/study/${chapter.id}`}>
                    {chapter.number}. {chapter.titleKid}
                  </Link>
                  {chapter.pendingReligionReview ? " · pending review (admins only)" : ""}
                </p>
              ))}
          </div>
        ))}
      </div>
      <h2>Chapter games</h2>
      <div className="chips">
        {games.map((game) => (
          <Link key={game.id} className="chip" href={`/games/${game.id}`}>
            {game.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
