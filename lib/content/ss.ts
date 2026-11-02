import { buildChapter, type CompactChapter } from "@/lib/content/build";

/** Social studies (Ohio studies newspaper). Our own short wording, kid level. */
const ss: CompactChapter[] = [
  {
    id: "ss.ohio-tribes",
    book: "ss",
    number: 1,
    titleKid: "Ohio's Native American tribes",
    subject: "social",
    bigQuestion: "How did the tribes of Ohio live, and how did they get along?",
    storyHook: "Long ago, six tribes made their homes in Ohio's forests and river valleys. How did they work together, and what happened when they disagreed?",
    paragraphs: [
      "The Delaware, Miami, Ottawa, Seneca, Shawnee, and Wyandot are the historic tribes of Ohio. Forests gave them wood for homes and canoes. Rivers helped them travel and trade.",
      "The Delaware, Wyandot, and Seneca were matrilineal, which means family was traced through the mother. The Shawnee were patrilineal, which means family was traced through the father.",
      "Cooperation is working together for a shared goal. A conflict is a disagreement. In a compromise, each side gives up a little to reach a solution.",
    ],
    vocab: [
      { word: "cooperation", definition: "working together for a shared goal" },
      { word: "conflict", definition: "a disagreement between groups or people" },
      { word: "compromise", definition: "each side gives up a little to agree" },
      { word: "matrilineal", definition: "family traced through the mother" },
    ],
    sequence: ["The Wyandot and Seneca become enemies", "They fight for over 100 years", "The Seneca let the Wyandot settle in Ohio", "The two tribes have peace"],
    proofs: [
      {
        stem: "What does matrilineal mean?",
        options: ["Family is traced through the mother", "Family is traced through the father", "Moving a lot", "Living in a wigwam"],
        answer: 0,
        evidence: 3,
        why: "Not yet. Find the sentence that tells what matrilineal means.",
      },
      {
        stem: "What is a compromise?",
        options: ["Each side gives up a little", "A big fight", "A kind of canoe", "A tribal chief"],
        answer: 0,
        evidence: 7,
        why: "Not yet. Find the sentence about a compromise.",
      },
    ],
  },
];

export const ssChapters = ss.map(buildChapter);
