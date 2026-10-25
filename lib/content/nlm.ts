/**
 * NotebookLM "Watch & listen" media per chapter. Video/audio files live in a PRIVATE Vercel Blob
 * store (never in git, never public); the manifest below only records which chapters have them.
 * Flashcards are small JSON files in lib/content/flashcards/<chapterId>.json.
 * scripts/nlm-import.ts uploads media and rewrites both.
 */
import manifest from "@/lib/content/nlm-media.json";
import { FLASHCARDS } from "@/lib/content/flashcards";

export type Flashcard = { front: string; back: string };
export type MediaKind = "video" | "audio";
export type MediaEntry = { pathname: string; contentType: string; size: number };
export type ChapterMedia = { video?: MediaEntry; audio?: MediaEntry };

const MEDIA = manifest as Record<string, ChapterMedia>;

export function isMediaKind(value: string): value is MediaKind {
  return value === "video" || value === "audio";
}

export function isFlashcardList(value: unknown): value is Flashcard[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((c) => c && typeof c === "object" && typeof c.front === "string" && c.front.trim() !== "" && typeof c.back === "string" && c.back.trim() !== "" && Object.keys(c).length === 2)
  );
}

export function mediaEntry(chapterId: string, kind: MediaKind): MediaEntry | null {
  return MEDIA[chapterId]?.[kind] ?? null;
}

export function flashcardsFor(chapterId: string): Flashcard[] {
  const cards = FLASHCARDS[chapterId];
  return isFlashcardList(cards) ? cards : [];
}

export type WatchListen = { chapterId: string; video: string | null; audio: string | null; flashcards: Flashcard[] };

/** What the study page shows; null hides the step entirely (no media yet). */
export function watchListenFor(chapterId: string): WatchListen | null {
  const video = mediaEntry(chapterId, "video") ? `/api/engine/media/${chapterId}/video` : null;
  const audio = mediaEntry(chapterId, "audio") ? `/api/engine/media/${chapterId}/audio` : null;
  const flashcards = flashcardsFor(chapterId);
  if (!video && !audio && flashcards.length === 0) return null;
  return { chapterId, video, audio, flashcards };
}
