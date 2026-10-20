import { notFound } from "next/navigation";
import { ChapterPlayer } from "@/components/ChapterPlayer";
import { NotAllowed } from "@/components/NotAllowed";
import { requirePageUser } from "@/lib/auth/server";
import { getChapter } from "@/lib/content/catalog";
import { chapterVisibleTo, toStudentChapter } from "@/lib/content/student";

export default async function ChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const user = await requirePageUser(["student", "admin"], `/study/${chapterId}`);
  if (!user) return <NotAllowed />;
  const chapter = getChapter(chapterId);
  if (!chapter || !chapterVisibleTo(chapter, user.role)) notFound();
  return (
    <div className="kid-shell">
      <p className="kid-kicker">Study pack</p>
      <h1>{chapter.titleKid}</h1>
      <ChapterPlayer chapter={toStudentChapter(chapter)} isAdmin={user.role === "admin"} />
    </div>
  );
}
