import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterPlayer } from "@/components/ChapterPlayer";
import { ChapterHeader } from "@/components/ChapterHeader";
import { NotAllowed } from "@/components/NotAllowed";
import { WatchListen } from "@/components/WatchListen";
import { watchListenFor } from "@/lib/content/nlm";
import { requirePageUser } from "@/lib/auth/server";
import { engineRepo } from "@/lib/engine/repos";
import { chooseFirstTeachModality, chooseReteachModality } from "@/lib/engine/modality";
import { getChapter, getNextChapter } from "@/lib/content/catalog";
import { chapterVisibleTo, toStudentChapter } from "@/lib/content/student";
import { hasPracticeTest } from "@/lib/practice/bank";
import { practiceTestHref } from "@/lib/practice/upcoming";

export async function generateMetadata({ params }: { params: Promise<{ chapterId: string }> }): Promise<Metadata> {
  const { chapterId } = await params;
  const chapter = getChapter(chapterId);
  if (!chapter) return { title: "Study | Mae's Lab" };
  return { title: `${chapter.titleKid} | Mae's Lab` };
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams?: Promise<{ reteach?: string | string[] }>;
}) {
  const { chapterId } = await params;
  const query = (await searchParams) ?? {};
  const reteachParam = Array.isArray(query.reteach) ? query.reteach[0] : query.reteach;
  const user = await requirePageUser(["student", "admin"], `/study/${chapterId}`);
  if (!user) return <NotAllowed />;
  const chapter = getChapter(chapterId);
  if (!chapter || !chapterVisibleTo(chapter, user.role)) notFound();
  const isAdmin = user.role === "admin";
  const nextChapter = getNextChapter(chapterId);
  const nextChapterHref = nextChapter && chapterVisibleTo(nextChapter, user.role) ? `/study/${nextChapter.id}` : null;
  const studentChapter = toStudentChapter(chapter);
  const reteachItemId = reteachParam && chapter.items.some((item) => item.id === reteachParam) ? reteachParam : null;
  const reteachStartWith = reteachItemId
    ? await chooseReteachModality(engineRepo(), { role: user.role, learnerId: user.learnerId }, reteachItemId).catch(() => null)
    : null;
  const watchListen = watchListenFor(chapter.id);
  // First teach: only for a chapter she hasn't answered anything in (the chooser checks).
  const firstTeachStartWith = reteachItemId
    ? null
    : await chooseFirstTeachModality(engineRepo(), { role: user.role, learnerId: user.learnerId }, chapter.id).catch(() => null);
  return (
    <div className="kid-shell">
      <p className="kid-kicker">Study pack</p>
      <ChapterHeader subject={chapter.subject} title={chapter.titleKid} />
      {hasPracticeTest(chapter.id) ? (
        <p>
          <a className="btn" href={practiceTestHref(chapter.id)}>📝 Practice test (like the Guided Notes)</a>
        </p>
      ) : null}
      {studentChapter.storyHook ? <p className="story-hook">{studentChapter.storyHook}</p> : null}
      {/* Admin-only banner, rendered on the server so the text never ships in a client bundle. */}
      {isAdmin && chapter.pendingReligionReview ? (
        <p className="notice">Admin note: Religion chapters are hidden from Mae until approved.</p>
      ) : null}
      <ChapterPlayer chapter={studentChapter} isAdmin={isAdmin} nextChapterHref={nextChapterHref} reteachItemId={reteachItemId} reteachStartWith={reteachStartWith} firstTeachStartWith={firstTeachStartWith} media={watchListen} />
      {watchListen ? <WatchListen data={watchListen} /> : null}
    </div>
  );
}
