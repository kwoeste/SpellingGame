import { D2_WORDS, LIST_HREF as D2_HREF, LIST_ID as D2_ID, LIST_SHORT_TITLE as D2_SHORT, LIST_TITLE as D2_TITLE, VOWEL_KEY, type SpellingWord, type Vowel } from "@/lib/spelling/list-d2";
import { LIST_HREF as U2_HREF, LIST_ID as U2_ID, LIST_SHORT_TITLE as U2_SHORT, LIST_TITLE as U2_TITLE, SYLLABLE_CHOICES, U2L10_WORDS, syllableCount } from "@/lib/spelling/list-u2l10";

export type SortChoice = { id: string; label: string; hint: string };

/** One spelling list: the words plus how its Sort game and help ladder work. */
export type SpellingList = {
  id: string;
  title: string;
  shortTitle: string;
  href: string;
  /** Kid-facing line under the title. */
  hook: string;
  words: SpellingWord[];
  sortPrompt: string;
  sortChoices: SortChoice[];
  sortKey: (word: SpellingWord) => string;
};

const VOWELS: Vowel[] = ["i", "o", "u"];

export const D2_LIST: SpellingList = {
  id: D2_ID,
  title: D2_TITLE,
  shortTitle: D2_SHORT,
  href: D2_HREF,
  hook: "Short i as in inch · short o as in October · short u as in funny",
  words: D2_WORDS,
  sortPrompt: "Which short vowel sound do you hear?",
  sortChoices: VOWELS.map((v) => ({ id: v, label: `short ${v}`, hint: VOWEL_KEY[v].example })),
  sortKey: (word) => word.vowel ?? "",
};

export const U2L10_LIST: SpellingList = {
  id: U2_ID,
  title: U2_TITLE,
  shortTitle: U2_SHORT,
  href: U2_HREF,
  hook: "Say each word one syllable at a time, then spell it.",
  words: U2L10_WORDS,
  sortPrompt: "How many syllables do you hear?",
  sortChoices: [...SYLLABLE_CHOICES],
  sortKey: (word) => String(syllableCount(word)),
};

const LISTS = [U2L10_LIST, D2_LIST];

export function spellingLists(): SpellingList[] {
  return LISTS;
}

export function spellingList(id: string | null | undefined): SpellingList | null {
  return LISTS.find((list) => list.id === id) ?? null;
}

export function spellingListFromHref(href: string): SpellingList | null {
  const path = href.split("?")[0];
  return LISTS.find((list) => list.href === path) ?? null;
}

export function isSpellingListId(id: unknown): id is string {
  return typeof id === "string" && LISTS.some((list) => list.id === id);
}

export function findListWord(list: SpellingList, word: unknown): SpellingWord | null {
  if (typeof word !== "string") return null;
  const key = word.trim().toLowerCase();
  return list.words.find((item) => item.word === key) ?? null;
}

export function isVowelId(id: string | null | undefined): id is Vowel {
  return id === "i" || id === "o" || id === "u";
}
