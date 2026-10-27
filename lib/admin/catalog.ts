import { listChapters, NAMED_GAMES } from "@/lib/content/catalog";
import { HARD_PREREQS, MATH_CONCEPTS, type ConceptNode } from "@/lib/content/concepts";
import { chapterName, partName, targetName } from "@/lib/admin/names";
import type { ChapterItem, ChapterPack, SubjectId } from "@/lib/content/types";

export type CatalogConcept = ConceptNode & { chapterId?: string };

export type LocatedItem = {
  chapter: ChapterPack;
  item: ChapterItem;
};

let itemIndex: Map<string, LocatedItem> | null = null;
let conceptIndex: Map<string, CatalogConcept> | null = null;

function conceptKind(conceptId: string): ConceptNode["kind"] {
  if (conceptId.endsWith(".vocab")) return "vocab";
  if (conceptId.endsWith(".sequence")) return "reading_skill";
  if (conceptId.includes("prayer")) return "prayer";
  return "knowledge";
}

/** Plain chapter name for parents, e.g. "Christ Our Life Ch 4". */
export function chapterDisplayName(chapter: Pick<ChapterPack, "book" | "number"> & { titleKid?: string }): string {
  return chapterName(chapter);
}

/** Chapter name from an id like "col.ch4", falling back to the id. */
export function chapterLabelById(chapterId: string | null | undefined): string {
  if (!chapterId) return "—";
  const chapter = listChapters().find((c) => c.id === chapterId);
  return chapter ? chapterDisplayName(chapter) : targetName(chapterId);
}

function conceptTitle(conceptId: string, chapter: ChapterPack): { kid: string; admin: string } {
  const name = chapterName(chapter);
  const suffix = conceptId.slice(conceptId.lastIndexOf(".") + 1);
  const part = partName(suffix);
  const kid = suffix === "vocab" ? `${chapter.titleKid} words` : suffix === "sequence" ? `${chapter.titleKid} order` : suffix === "knowledge" ? chapter.bigQuestion : conceptId;
  return { kid, admin: part ? `${name} – ${part}` : targetName(conceptId) };
}

function buildIndexes(): void {
  itemIndex = new Map();
  conceptIndex = new Map();
  for (const node of MATH_CONCEPTS) conceptIndex.set(node.id, node);
  for (const chapter of listChapters()) {
    for (const item of chapter.items) {
      itemIndex.set(item.id, { chapter, item });
      if (!conceptIndex.has(item.conceptId)) {
        const titles = conceptTitle(item.conceptId, chapter);
        conceptIndex.set(item.conceptId, {
          id: item.conceptId,
          subject: chapter.subject,
          titleKid: titles.kid,
          titleAdmin: titles.admin,
          standardCodes: [],
          milestoneLevel: 4.0,
          kind: conceptKind(item.conceptId),
          chapterId: chapter.id,
        });
      }
    }
  }
}

export function locateAdminItem(itemId: string): LocatedItem | null {
  if (!itemIndex) buildIndexes();
  return itemIndex?.get(itemId) ?? null;
}

export function catalogConcepts(): CatalogConcept[] {
  if (!conceptIndex) buildIndexes();
  return [...(conceptIndex?.values() ?? [])];
}

export function catalogConcept(id: string): CatalogConcept | null {
  if (!conceptIndex) buildIndexes();
  return conceptIndex?.get(id) ?? null;
}

export function catalogChapters(): ChapterPack[] {
  return listChapters();
}

export function hardPrereqs(): Array<{ from: string; to: string }> {
  return HARD_PREREQS;
}

export function subjectOfConcept(conceptId: string): SubjectId | "unknown" {
  return catalogConcept(conceptId)?.subject ?? "unknown";
}

export function knownGame(gameId: string): boolean {
  return NAMED_GAMES.some((game) => game.id === gameId);
}

export function gameTitle(gameId: string): string {
  if (gameId === "practice-test") return "Practice test";
  return NAMED_GAMES.find((game) => game.id === gameId)?.title ?? gameId;
}

export function assignmentTitle(targetType: "concept" | "chapter" | "game", targetId: string): string {
  if (targetType === "chapter") {
    const chapter = catalogChapters().find((c) => c.id === targetId);
    return chapter ? `${chapterName(chapter)}: ${chapter.titleKid}` : targetName(targetId);
  }
  if (targetType === "game") return gameTitle(targetId);
  return catalogConcept(targetId)?.titleAdmin ?? targetName(targetId);
}
