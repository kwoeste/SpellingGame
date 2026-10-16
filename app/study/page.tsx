import Link from "next/link";
import { LikesPicker } from "@/components/LikesPicker";
import { listChapters, NAMED_GAMES } from "@/lib/content/catalog";

export default function StudyIndexPage() {
  const chapters = listChapters();
  return (
    <div className="wrap">
      <h1>Study</h1>
      <p>10–15 minute drop-ins. Continue where you left off. No timers on screen.</p>
      <LikesPicker />
      <div className="grid cols-2">
        {(["science", "ela", "religion"] as const).map((subject) => (
          <div key={subject} className="card">
            <h2>{subject === "ela" ? "Reading" : subject[0].toUpperCase() + subject.slice(1)}</h2>
            {chapters
              .filter((chapter) => chapter.subject === subject)
              .map((chapter) => (
                <p key={chapter.id}>
                  <Link href={`/study/${chapter.id}`}>
                    {chapter.number}. {chapter.titleKid}
                  </Link>
                  {chapter.pendingReligionReview ? " · pending review" : ""}
                </p>
              ))}
          </div>
        ))}
      </div>
      <h2>Chapter games</h2>
      <div className="chips">
        {NAMED_GAMES.map((game) => (
          <Link key={game.id} className="chip" href={`/games/${game.id}`}>
            {game.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
