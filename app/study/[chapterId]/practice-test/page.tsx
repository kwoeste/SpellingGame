import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterHeader } from "@/components/ChapterHeader";
import { NotAllowed } from "@/components/NotAllowed";
import { PracticeTest } from "@/components/PracticeTest";
import { requirePageUser } from "@/lib/auth/server";
import { getChapter } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import { bankSize, practiceBank } from "@/lib/practice/bank";
import { activeUpcomingTests } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";

export const metadata: Metadata = { title: "Practice test | Mae's Lab" };

export default async function PracticeTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams?: Promise<{ mode?: string | string[] }>;
}) {
  const { chapterId } = await params;
  const query = (await searchParams) ?? {};
  const mode = (Array.isArray(query.mode) ? query.mode[0] : query.mode) === "retry" ? "retry" : "full";
  const user = await requirePageUser(["student", "admin"], `/study/${chapterId}/practice-test`);
  if (!user) return <NotAllowed />;
  const chapter = getChapter(chapterId);
  const bank = practiceBank(chapterId);
  if (!chapter || !bank || !chapterVisibleTo(chapter, user.role)) notFound();
  const upcoming = activeUpcomingTests(Date.now(), await loadUpcomingTests()).find((t) => t.kind !== "spelling" && t.refId === chapter.id);
  const weekday = upcoming ? new Date(`${upcoming.testDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }) : "";
  const testNote = upcoming ? (upcoming.isTestDay ? "Your test is today. You've got this!" : `Your class test is on ${weekday}.`) : null;
  return (
    <div className="kid-shell">
      <p className="kid-kicker">Practice test</p>
      <ChapterHeader subject={chapter.subject} title={chapter.titleKid} />
      {testNote ? <p className="story-hook">{testNote}</p> : null}
      <PracticeTest chapterId={chapter.id} lessons={bank.lessons} startMode={mode} bankSize={bankSize(chapter.id)} />
    </div>
  );
}
