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
  {
    id: "ss.colonies",
    book: "ss",
    number: 2,
    titleKid: "The 13 original colonies",
    subject: "social",
    bigQuestion: "Where were the 13 original colonies, and which region was farthest south?",
    storyHook: "Thirteen colonies lined the east coast. Can you sort them into three regions and find them on the map?",
    paragraphs: [
      "The 13 original colonies sat along the east coast of North America. People group them into three regions: the New England Colonies, the Middle Colonies, and the Southern Colonies.",
      "The New England Colonies were New Hampshire, Massachusetts, Rhode Island, and Connecticut. They were farthest north. Winters were cold and the ground was rocky, so many people fished and built ships.",
      "The Middle Colonies were New York, New Jersey, Pennsylvania, and Delaware. The soil was good for farms. They grew so much wheat that people called this region the breadbasket.",
      "The Southern Colonies were Maryland, Virginia, North Carolina, South Carolina, and Georgia. This region was farthest south. The weather was warm, and the farms were large. Georgia was the colony farthest south.",
      "On our map, north is up, south is down, east is toward the ocean, and west is inland. A compass rose shows those four directions. New Hampshire is just north of Massachusetts. North Carolina is just south of Virginia.",
    ],
    vocab: [
      { word: "colony", definition: "a place people from far away started on this coast" },
      { word: "region", definition: "a group of colonies in one part of the land" },
      { word: "breadbasket", definition: "a nickname for a place that grows lots of grain" },
      { word: "compass", definition: "a drawing that shows north, south, east, and west" },
    ],
    sequence: [
      "New England is farthest north",
      "The Middle Colonies grow lots of wheat",
      "The Southern Colonies are farthest south",
      "Georgia is the farthest south colony",
    ],
    proofs: [
      {
        stem: "Which region was farthest south?",
        options: ["The Southern Colonies", "The Middle Colonies", "New England", "The colonies by the Great Lakes"],
        answer: 0,
        evidence: 9,
        why: "Not yet. Find the sentence that says this region was farthest south.",
      },
      {
        stem: "Which colonies were in New England?",
        options: ["New Hampshire, Massachusetts, Rhode Island, and Connecticut", "New York, New Jersey, Pennsylvania, and Delaware", "Only Georgia", "Maryland and Virginia"],
        answer: 0,
        evidence: 2,
        why: "Not yet. Find the sentence that lists the New England Colonies.",
      },
      {
        stem: "What did people call the Middle Colonies for growing so much wheat?",
        options: ["the breadbasket", "the shipyard", "the rocky north", "the compass"],
        answer: 0,
        evidence: 7,
        why: "Not yet. Find the sentence about wheat and the breadbasket.",
      },
      {
        stem: "Which direction is toward the ocean on our map?",
        options: ["East", "West", "North", "South"],
        answer: 0,
        evidence: 12,
        why: "Not yet. Find the sentence that says east is toward the ocean.",
      },
    ],
  },
];

export const ssChapters = ss.map(buildChapter);
