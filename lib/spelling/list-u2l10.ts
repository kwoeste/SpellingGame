/**
 * Spelling: Middle Ages words (CKLA Grade 4, Unit 2, Lesson 10).
 * Words are from Mae's content list. Definitions, sentences, and memory tricks are ours.
 */
import type { SpellingWord } from "@/lib/spelling/list-d2";

export const LIST_ID = "spelling-u2l10";
export const LIST_TITLE = "Spelling: Middle Ages words (Unit 2, Lesson 10)";
export const LIST_SHORT_TITLE = "Spelling: Middle Ages words";
export const LIST_HREF = "/study/spelling-u2l10";
/** Pinned on the Today plan from this day until an admin sets a test date. */
export const LIST_START_DATE = "2026-11-11";

const w = (
  word: string,
  at: number,
  len: number,
  syllables: string,
  definition: string,
  sentence: string,
  trick: string,
  hint: string,
  oops: string,
): SpellingWord => ({ word, group: "spelling", at, len, syllables, definition, sentence, trick, hint, oops });

export const U2L10_WORDS: SpellingWord[] = [
  w(
    "acquire",
    1,
    1,
    "ac·quire",
    "to get something and keep it as your own",
    "The monastery hoped to acquire a new book of maps for its library.",
    "ac-quire. Don't skip the c before the q. aquire is missing that c.",
    "Two beats. Don't skip the c in the first beat.",
    "aquire",
  ),
  w(
    "establish",
    2,
    3,
    "es·tab·lish",
    "to set something up so it can last",
    "The king worked to establish a school so children in the castle town could learn to read.",
    "es-tab-lish. Three beats, and the middle beat is tab. Don't drop the a.",
    "Three beats. Say the middle beat clearly.",
    "establsh",
  ),
  w(
    "fatal",
    2,
    3,
    "fa·tal",
    "so serious that a plan cannot go on",
    "A leak in the mill roof was fatal to the baker's plan to store flour all winter.",
    "fa-tal. One t, and it ends in t-a-l, like the end of metal. Not fatel.",
    "Two beats. It ends with tal, like the end of metal.",
    "fatel",
  ),
  w(
    "promote",
    4,
    3,
    "pro·mote",
    "to help something succeed, or to give someone a higher job",
    "The guild voted to promote the hardest-working apprentice to journeyman.",
    "pro-mote. One m, then ote. The quiet e at the end makes the o say its name.",
    "Two beats. A quiet e at the end makes the o say its name.",
    "promot",
  ),
  w(
    "retreat",
    4,
    2,
    "re·treat",
    "to go back to a safer place",
    "When the river rose, the travelers had to retreat to higher ground by the abbey.",
    "re-treat. It is re plus treat, with e-a in the second beat. Not retreet.",
    "Two beats. The second beat has a long e.",
    "retreet",
  ),
  w(
    "seize",
    1,
    2,
    "seize",
    "to grab something and hold on",
    "The market guards hurried to seize a loose cart before it rolled down the hill.",
    "seize. The sound is long e, but the letters are e then i, not i then e. s-ei-ze. sieze is the trap.",
    "One beat. The vowel sound is long e, and the letters are e then i.",
    "sieze",
  ),
  w(
    "surrender",
    2,
    2,
    "sur·ren·der",
    "to give something up, or to stop a fight and hand it over",
    "The two lords agreed to surrender the meadow and share its hay.",
    "sur-ren-der. Double r in the middle, like two r's holding on. surender is missing one.",
    "Three beats. The middle has a double r.",
    "surender",
  ),
  w(
    "thrive",
    5,
    1,
    "thrive",
    "to grow strong and do well",
    "Port towns began to thrive as ships brought spices, silk, and new ideas.",
    "thrive. One beat. The quiet e at the end makes the i say its name, just like drive and five.",
    "One beat. A quiet e makes the i say its name.",
    "thriv",
  ),
  w(
    "transform",
    0,
    5,
    "trans·form",
    "to change something into a new form",
    "Masons could transform a small chapel into a tall stone church.",
    "trans-form. Say both beats. The s stays in trans. Don't write tranform.",
    "Two beats. You can hear trans at the start and form at the end.",
    "tranform",
  ),
  w(
    "unravel",
    2,
    5,
    "un·rav·el",
    "to come undone, or to figure out a tangled problem",
    "A loose thread began to unravel the banner hanging in the great hall.",
    "un-rav-el. It starts with un, like undo, then ravel. One n, and it ends in e-l.",
    "Three beats. It starts like undo.",
    "unravle",
  ),
];

/** How many syllable beats a word has (1 when it is not split). */
export function syllableCount(word: SpellingWord): number {
  return word.syllables?.includes("·") ? word.syllables.split("·").length : 1;
}

export const SYLLABLE_CHOICES = [
  { id: "1", label: "1 syllable", hint: "One beat. Clap once." },
  { id: "2", label: "2 syllables", hint: "Two beats. Clap twice." },
  { id: "3", label: "3 syllables", hint: "Three beats. Clap three times." },
] as const;
