import { toStudentChapter } from "@/lib/content/student";
import { toNextItem } from "@/lib/engine/dto";
import { engineActor, engineFailure, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { chapterProgressFor, visibleChapter } from "@/lib/engine/service";

/** The next unanswered step of a chapter, as the student sees it (no answers). */
export async function POST(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const body = await readJson(req);
  if (typeof body.chapterId !== "string") return engineJson({ error: "chapter_required" }, 400);
  try {
    const chapter = visibleChapter(body.chapterId, gate.actor.role);
    const progress = await chapterProgressFor(engineRepo(), gate.actor, chapter.id);
    const step = toStudentChapter(chapter).steps[progress?.nextStep ?? 0];
    if (!step) return engineJson({ done: true, chapter: progress });
    const item = chapter.items.find((row) => row.id === step.itemId);
    const options = step.kind === "proof" ? step.options : step.kind === "vocab" ? step.definitions : step.cards.map((card) => card.label);
    return engineJson({
      item: toNextItem({
        item_id: step.itemId,
        activity_id: item?.activityId ?? chapter.id,
        type: item?.type ?? step.kind,
        prompt: step.prompt,
        options,
        sentences: chapter.sentences,
        scaffold_level: 0,
        theme: null,
        read_aloud_text: step.prompt,
      }),
      chapter: progress,
    });
  } catch (error) {
    return engineFailure(error);
  }
}
