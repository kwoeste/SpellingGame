/** Spelling List D-2 (short i, short o, short u). Words from Mae's school list; sentences and tricks are ours. */
export type Vowel = "i" | "o" | "u";
export type WordGroup = "spelling" | "review" | "challenge";
export type SpellingWord = {
  word: string;
  group: WordGroup;
  vowel: Vowel;
  /** Start index and length of the letters that make the short vowel sound. */
  at: number;
  len: number;
  sentence: string;
  trick: string;
  /** A common misspelling for "Fix the misspelling". */
  oops: string;
};

export const LIST_ID = "spelling-d2";
export const LIST_TITLE = "Spelling List D-2: short i, short o, short u";
export const LIST_SHORT_TITLE = "Spelling List D-2";
export const LIST_HREF = "/study/spelling-d2";
export const VOWEL_KEY: Record<Vowel, { label: string; example: string }> = {
  i: { label: "short i", example: "i as in inch" },
  o: { label: "short o", example: "o as in October" },
  u: { label: "short u", example: "u as in funny" },
};

const w = (word: string, group: WordGroup, vowel: Vowel, at: number, len: number, sentence: string, trick: string, oops: string): SpellingWord => ({ word, group, vowel, at, len, sentence, trick, oops });

export const D2_WORDS: SpellingWord[] = [
  w("costume", "spelling", "o", 1, 1, "Mae wore a dragon costume to the school parade.", "cost + ume: that costume cost a lot! Don't forget the e at the end.", "costum"),
  w("swift", "spelling", "i", 2, 1, "The swift rabbit zipped across the yard.", "s-w-i-f-t: it ends just like gift. Look at every letter.", "swfit"),
  w("cotton", "spelling", "o", 1, 1, "My favorite shirt is made of soft cotton.", "cot + ton: double t in the middle, like two cotton balls side by side.", "coton"),
  w("imitate", "spelling", "i", 0, 1, "My little brother likes to imitate everything I do.", "im-i-tate: one m, then i, then tate. The i shows up twice.", "immitate"),
  w("suddenly", "spelling", "u", 1, 1, "Suddenly, the lights went out and everyone gasped.", "sudden + ly, with double d: sud-den-ly.", "sudenly"),
  w("building", "spelling", "i", 1, 2, "Our school is the big brick building on the corner.", "U and I are building it together: b-u-i-l-d-ing. The u and i make the short i sound.", "bilding"),
  w("kitchen", "spelling", "i", 1, 1, "Dad is making pancakes in the kitchen.", "kit + chen: a sneaky t hides before the ch, just like in itch.", "kichen"),
  w("cousin", "spelling", "u", 1, 2, "My cousin is coming to visit for the weekend.", "cous-in: the o-u sounds like u, and my cousin is IN the house!", "cuzin"),
  w("window", "spelling", "i", 1, 1, "A bird landed right outside my window.", "wind + ow: the wind blows on the window. Ow!", "windo"),
  w("shock", "spelling", "o", 2, 1, "It was a big shock when our team won.", "Short o then c-k, just like rock and sock: sh-o-c-k.", "shok"),
  w("fling", "spelling", "i", 2, 1, "I like to fling the ball for my dog to chase.", "fl + ing: it rhymes with sing and swing.", "flin"),
  w("crunch", "spelling", "u", 2, 1, "The leaves crunch under my boots in the fall.", "cr + unch: it rhymes with lunch and munch.", "crunsh"),
  w("shrimp", "spelling", "i", 3, 1, "We ate shrimp at a restaurant by the beach.", "sh + r + imp: don't skip the h or the r. A tiny imp ate the shrimp!", "srimp"),
  w("switch", "spelling", "i", 2, 1, "Please switch off the light when you leave.", "A silent t hides before the ch: s-w-i-t-c-h, just like witch and itch.", "swich"),
  w("fudge", "spelling", "u", 1, 1, "Grandma makes the best chocolate fudge.", "A silent d hides before the g-e: f-u-d-g-e, just like judge and badge.", "fuge"),
  w("prompt", "spelling", "o", 2, 1, "Please be prompt and get to class on time.", "p-r-o-m-p-t: there are two p's. Don't skip the p before the t!", "promt"),
  w("olive", "spelling", "o", 0, 1, "I put a green olive on my pizza.", "Short o like in October: ol-ive. It ends with a quiet e, like give.", "oliv"),
  w("follower", "spelling", "o", 1, 1, "The puppy is a loyal follower who goes everywhere I go.", "follow + er: double l in follow, then add e-r.", "folower"),
  w("octopus", "spelling", "o", 0, 1, "An octopus has eight long arms.", "Short o like October. Oct means eight, and an octopus has eight arms: oct-o-pus.", "octapus"),
  w("important", "spelling", "i", 0, 1, "It is important to wear a helmet when you ride your bike.", "im-POR-tant: say every part. It ends in t-a-n-t, like an ant.", "importent"),
  w("twister", "review", "i", 2, 1, "The twister spun across the field.", "twist + er: first twist, then add e-r.", "twistor"),
  w("plump", "review", "u", 2, 1, "The plump puppy waddled over to its bowl.", "pl + ump: it rhymes with jump and bump.", "plum"),
  w("stomp", "review", "o", 2, 1, "The kids stomp their feet to the music.", "st + omp: it rhymes with romp and chomp.", "stom"),
  w("chimpanzee", "challenge", "i", 2, 1, "The chimpanzee swung from branch to branch.", "chim-pan-zee: three chunks, and it ends with double e.", "chimpanzie"),
  w("obstacle", "challenge", "o", 0, 1, "We raced through the obstacle course at recess.", "ob-sta-cle: three chunks, and it ends in c-l-e, like circle.", "obstical"),
];

export function findWord(word: unknown): SpellingWord | null {
  return typeof word === "string" ? D2_WORDS.find((x) => x.word === word.trim().toLowerCase()) ?? null : null;
}

/** The read-aloud clip for a word: the word, a sentence, then the word again. */
export function wordClip(x: SpellingWord): string {
  return `${x.word}. ${x.sentence} ${x.word}.`;
}
export function trickClip(x: SpellingWord): string {
  return `${x.word}. ${x.trick}`;
}
export function revealClip(x: SpellingWord): string {
  return `${x.word} is spelled ${x.word.split("").join(", ")}.`;
}

/** Fixed read-aloud lines the spelling pages use (all prewarmed). */
export const SPELLING_LINES = {
  right: "Yes! Spelled just right.",
  again: "Not quite. Look at every letter and try again.",
  sort: "Which short vowel sound do you hear?",
  mockStart: "Get ready. I will say each word, use it in a sentence, and say it again. Spell it carefully.",
  mockDone: "All done! Let's see how you did.",
};

/** Spoken on a right answer (rotates). */
export const SPELLING_YAYS = ["Yes! Spelled just right.", "You got it!", "Awesome spelling!", "Perfect!", "Nailed it!"];
export const SPELLING_SO_CLOSE = "So close! Just one letter is off.";
export const SPELLING_BREATHE = "Take a breath and look at each letter.";

/** Guided session lines ("Next up" per game, start and end), all prewarmed. */
export const SESSION_NEXT_UP: Record<string, string> = {
  listen: "Next up: Listen & spell!",
  flash: "Next up: Flashcards!",
  tiles: "Next up: Letter tiles!",
  fix: "Next up: Fix the misspelling!",
  sort: "Next up: Sort by sound!",
  mock: "Next up: Quick spelling check!",
};
/** Sort by sound praise (no spelling involved). */
export const SORT_RIGHT: Record<Vowel, string> = { i: "Yes! That's the short i sound.", o: "Yes! That's the short o sound.", u: "Yes! That's the short u sound." };
/** Right after one or more misses: softer than first-try praise. */
export const SPELLING_GOT_IT = "You got it!";
export const SESSION_LINES = {
  start: "Here's today's spelling mix. I'll pick the games!",
  done: "You finished today's spelling session. Great work!",
};

export function allSpellingClips(): string[] {
  return [...new Set([...Object.values(SPELLING_LINES), ...Object.values(SESSION_NEXT_UP), ...Object.values(SESSION_LINES), ...Object.values(SORT_RIGHT), SPELLING_GOT_IT, ...SPELLING_YAYS, SPELLING_SO_CLOSE, SPELLING_BREATHE]), ...D2_WORDS.flatMap((x) => [wordClip(x), trickClip(x), revealClip(x)])];
}
