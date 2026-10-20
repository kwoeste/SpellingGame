export type ReadableWord = { sentenceIdx: number; start: number; text: string };

export function splitReadableWords(text: string, sentenceIdx: number): ReadableWord[] {
  const words: ReadableWord[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) words.push({ sentenceIdx, start: match.index, text: match[0] });
  return words;
}

export function flattenPassage(sentences: { text: string }[]): ReadableWord[] {
  return sentences.flatMap((sentence, idx) => splitReadableWords(sentence.text, idx));
}

export function allWordsRevealed(total: number, revealed: Iterable<number>): boolean {
  if (total === 0) return true;
  const set = revealed instanceof Set ? revealed : new Set(revealed);
  return set.size >= total;
}

/** Longer pause (4-5 seconds) so Mae reads the question before tapping an answer. */
export function answerUnlockMs(wordCount: number): number {
  return Math.min(5000, 4000 + wordCount * 50);
}
