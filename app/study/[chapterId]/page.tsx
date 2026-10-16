import { notFound } from "next/navigation";
import { ChapterPlayer } from "@/components/ChapterPlayer";
import { getChapter } from "@/lib/content/catalog";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const chapter = getChapter(chapterId);
  if (!chapter) notFound();
  return (
    <div className="wrap">
      <h1>{chapter.titleKid}</h1>
      <ChapterPlayer chapter={chapter} />
    </div>
  );
}
