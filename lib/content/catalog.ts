import { cklaChapters } from "@/lib/content/ckla";
import { colChapters } from "@/lib/content/col";
import { savvasChapters } from "@/lib/content/savvas";
import type { ChapterPack } from "@/lib/content/types";

const chapters: ChapterPack[] = [...savvasChapters, ...cklaChapters, ...colChapters];

export function listChapters(): ChapterPack[] {
  return chapters;
}

export function getChapter(id: string): ChapterPack | null {
  return chapters.find((chapter) => chapter.id === id) ?? null;
}

export function chaptersBySubject(subject: ChapterPack["subject"]): ChapterPack[] {
  return chapters.filter((chapter) => chapter.subject === subject);
}

export function getNextChapter(currentId: string): ChapterPack | null {
  const current = getChapter(currentId);
  if (!current) return null;
  const sameBook = chapters.filter((chapter) => chapter.book === current.book);
  const sortedByNumber = [...sameBook].sort((a, b) => a.number - b.number);
  const currentIndex = sortedByNumber.findIndex((chapter) => chapter.id === currentId);
  if (currentIndex === -1 || currentIndex >= sortedByNumber.length - 1) return null;
  return sortedByNumber[currentIndex + 1];
}

export function chapterCount(): { total: number; savvas: number; ckla: number; col: number } {
  return {
    total: chapters.length,
    savvas: savvasChapters.length,
    ckla: cklaChapters.length,
    col: colChapters.length,
  };
}

export const NAMED_GAMES = [
  { id: "feudal-pyramid", title: "Feudal Pyramid Builder", status: "playable" },
  { id: "castle-siege", title: "Castle Siege Defense", status: "playable" },
  { id: "market-day", title: "Market Day Merchant", status: "playable" },
  { id: "battle-1066", title: "1066 Battle Replay", status: "playable" },
  { id: "magna-carta", title: "Magna Carta Courtroom", status: "playable" },
  { id: "prefix-forge", title: "Prefix Forge", status: "playable" },
  { id: "ten-commandments", title: "Ten Commandments Sorter", status: "playable" },
  { id: "beatitudes", title: "Beatitudes Match", status: "playable" },
  { id: "church-year", title: "Church-Year Wheel", status: "playable" },
  { id: "prayer-builder", title: "Prayer Builder", status: "playable" },
  { id: "saint-cards", title: "Saint Cards", status: "playable" },
  { id: "stream-steepness", title: "Stream Steepness Slider", status: "playable" },
  { id: "circuit-builder", title: "Circuit Builder", status: "playable" },
] as const;
