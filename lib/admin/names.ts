import { subjectName } from "@/lib/admin/subject-names";
import { listChapters } from "@/lib/content/catalog";
import { MATH_CONCEPTS } from "@/lib/content/concepts";
import type { ChapterPack } from "@/lib/content/types";

/**
 * Plain names for anything the admin pages show. Parents never see raw ids like
 * "col.ch2.seq" or "ckla.u2.ch1.vocab"; they see "Christ Our Life Ch 2 – Put in order".
 */

export { SUBJECT_NAMES, subjectName } from "@/lib/admin/subject-names";

export const BOOK_NAMES: Record<string, string> = {
  savvas: "Savvas Science",
  ckla: "CKLA Reading",
  col: "Christ Our Life",
  math: "Math",
};


/** "Christ Our Life Ch 4" or "Math: Times 2" for the multiplication packs. */
export function chapterName(chapter: { book: string; number: number; titleKid?: string }): string {
  if (chapter.book === "math" && chapter.titleKid) return `Math: ${chapter.titleKid.split(":")[0]}`;
  return `${BOOK_NAMES[chapter.book] ?? chapter.book} Ch ${chapter.number}`;
}

/** Chapter name plus its title, e.g. "Christ Our Life Ch 4: Unit 1 looking back". */
export function chapterFullName(chapter: { book: string; number: number; titleKid: string }): string {
  if (chapter.book === "math") return `Math: ${chapter.titleKid}`;
  return `${chapterName(chapter)}: ${chapter.titleKid}`;
}

/** What kind of practice a suffix means, in parent words. */
export function partName(suffix: string): string | null {
  if (suffix === "seq" || suffix === "sequence") return "Put in order";
  if (suffix === "vocab") return "Word meanings";
  if (suffix === "knowledge") return "Big ideas";
  const q = suffix.match(/^q(\d+)$/);
  if (q) return `Question ${q[1]}`;
  const m = suffix.match(/^mult\.(\d+)$/);
  if (m) return `Fact ${m[1]}`;
  return null;
}

let chapterIndex: ChapterPack[] | null = null;
function chapters(): ChapterPack[] {
  if (!chapterIndex) chapterIndex = [...listChapters()].sort((a, b) => b.id.length - a.id.length);
  return chapterIndex;
}

export function findChapter(id: string | null | undefined): ChapterPack | null {
  if (!id) return null;
  return chapters().find((c) => c.id === id) ?? null;
}

function tidy(id: string): string {
  const words = id.replace(/[._-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Plain name for any item, concept, or chapter id. Unknown ids are tidied into words so a
 * raw dotted id never reaches the page.
 */
export function targetName(id: string | null | undefined): string {
  if (!id) return "—";
  const math = MATH_CONCEPTS.find((c) => c.id === id);
  if (math) return math.titleAdmin;
  const chapter = findChapter(id);
  if (chapter) return chapterName(chapter);
  const owner = chapters().find((c) => id.startsWith(`${c.id}.`));
  if (owner) {
    const part = partName(id.slice(owner.id.length + 1));
    return part ? `${chapterName(owner)} – ${part}` : chapterName(owner);
  }
  return tidy(id);
}

/** Chapter that an item or concept id belongs to, if any. */
export function chapterOfId(id: string | null | undefined): ChapterPack | null {
  if (!id) return null;
  return findChapter(id) ?? chapters().find((c) => id.startsWith(`${c.id}.`)) ?? null;
}
