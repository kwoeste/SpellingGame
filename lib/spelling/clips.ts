import { spellingList, spellingLists } from "@/lib/spelling/catalog";
import { allSpellingClips as d2Clips, revealClip, trickClip, wordClip } from "@/lib/spelling/list-d2";
import { praiseFor } from "@/lib/spelling/feedback";

/**
 * Every spelling read-aloud string, for scripts/tts-prewarm.ts --area=spelling.
 * D-2's lines stay in allSpellingClips(); this adds the Middle Ages list (word, syllables,
 * sentence, memory trick, letter-by-letter reveal, and syllable-sort praise).
 * Missing clips are not bundled: read-aloud falls back to the device voice, the same as today.
 */
export function prewarmSpellingClips(): string[] {
  const extra = spellingLists()
    .filter((list) => list.id !== "spelling-d2")
    .flatMap((list) => [
      ...list.words.flatMap((word) => [wordClip(word), trickClip(word), revealClip(word)]),
      ...list.sortChoices.map((choice) => praiseFor("sort", true, 0, null, choice.label)),
    ]);
  return [...new Set([...d2Clips(), ...extra])];
}

/** Syllable-sort praise for the Middle Ages list, so tests can match the spoken line. */
export function u2SortPraise(): string[] {
  return (spellingList("spelling-u2l10")?.sortChoices ?? []).map((choice) => praiseFor("sort", true, 0, null, choice.label));
}
