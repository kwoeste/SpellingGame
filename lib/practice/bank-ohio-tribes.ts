import type { PracticeFact } from "@/lib/practice/types";

/**
 * Social studies: Ohio's Native American tribes (class newspaper "Week 20 of 32").
 * Our own short wording (no copied passages). **word** = bold key word. "___" = a blank.
 * kind "choice": answers[0][0] is the right option and must appear in `options`.
 */
export const OHIO_TRIBES_FACTS: PracticeFact[] = [
  // Lesson 1: Words to know
  { id: "w-cooperation", lesson: 1, answers: [["cooperation"]], wordBank: "always", phrasings: [
    "Working **together** to reach a shared goal is called ___.",
    "When tribes **work together** toward the same goal, that is ___.",
  ], why: "Cooperation means working together for a common goal." },
  { id: "w-conflict", lesson: 1, answers: [["conflict"]], wordBank: "always", phrasings: [
    "A **disagreement** between groups or people is a ___.",
  ], why: "A conflict is a disagreement between groups or people." },
  { id: "w-compromise", lesson: 1, kind: "choice", answers: [["Both sides give up something to reach a solution"]], options: [
    "Both sides give up something to reach a solution", "One side wins and the other loses", "Nobody talks to each other", "Everyone moves away",
  ], phrasings: ["What happens in a **compromise**?"], why: "In a compromise, both sides give up a little so they can agree on a solution." },
  { id: "w-alliance", lesson: 1, answers: [["alliance"]], wordBank: "always", phrasings: [
    "When groups **agree to work together**, they form an ___.",
  ], why: "An alliance is a relationship where groups agree to work together." },
  { id: "w-treaty", lesson: 1, kind: "choice", answers: [["A formal agreement between nations"]], options: [
    "A formal agreement between nations", "A kind of house", "A tribal chief", "A family group",
  ], phrasings: ["What is a **treaty**?"], why: "A treaty is a formal agreement between nations. Tribes made treaties to become allies." },
  { id: "w-match", lesson: 1, kind: "match", answers: [["cooperation"], ["conflict"], ["compromise"], ["alliance"]], prompts: [
    "working together", "a disagreement", "both sides give up something", "groups agree to work together",
  ], phrasings: ["Match each **word** to what it means."], why: "Cooperation = working together. Conflict = disagreement. Compromise = both give a little. Alliance = agreeing to work together." },
  { id: "w-matrilineal", lesson: 1, kind: "choice", answers: [["matrilineal"]], options: ["matrilineal", "patrilineal", "nomadic"], phrasings: [
    "Family is traced through the **mother's** side. That is called…",
  ], why: "Matrilineal means the family line goes through the mother. The Delaware, Wyandot, and Seneca were matrilineal." },

  // Lesson 2: The tribes
  { id: "t-shawnee-patri", lesson: 2, kind: "choice", answers: [["Shawnee"]], options: ["Shawnee", "Delaware", "Wyandot", "Seneca"], phrasings: [
    "Which tribe was **patrilineal** (family traced through the **father**)?",
  ], why: "The Shawnee were patrilineal. A person belonged to their father's clan." },
  { id: "t-lenape", lesson: 2, kind: "choice", answers: [["Delaware"]], options: ["Delaware", "Miami", "Ottawa", "Shawnee"], phrasings: [
    "Which tribe was also called the **Lenape**?",
  ], why: "The Delaware were also called the Lenape (or Lenni Lenape). They first lived along the Delaware River." },
  { id: "t-clans", lesson: 2, kind: "list", answers: [["Turtle"], ["Wolf"], ["Turkey"]], phrasings: [
    "**Find it:** Look at the Delaware part. Name the **3 clans** (any order).",
  ], why: "The Delaware had 3 clans: Turtle, Wolf, and Turkey. The head sachem always came from the Turtle clan." },
  { id: "t-sachem", lesson: 2, answers: [["sachem"]], wordBank: "always", phrasings: [
    "A Delaware **chief** was called a ___.",
  ], why: "Sachem is the Delaware word for chief." },
  { id: "t-hokima", lesson: 2, answers: [["hokima"]], wordBank: "always", phrasings: [
    "Each Shawnee group was led by a **chief** called a ___.",
  ], why: "The hokima led each Shawnee group and was in charge of everyday (civil) matters." },
  { id: "t-wigwam", lesson: 2, kind: "choice", answers: [["wigwams"]], options: ["wigwams", "longhouses", "log cabins", "tents made of stone"], phrasings: [
    "The Shawnee moved a lot. They lived in small, **dome-shaped** homes called…",
  ], why: "Wigwams were small, dome-shaped homes that were easy to move." },
  { id: "t-longhouse", lesson: 2, kind: "choice", answers: [["many families"]], options: ["many families", "one person", "only the chief", "horses"], phrasings: [
    "A Wyandot **longhouse** was a long wooden home covered in bark. Who lived inside?",
  ], why: "Longhouses were big enough for many families. A Seneca longhouse could hold up to 60 people!" },
  { id: "t-ottawa-trade", lesson: 2, kind: "choice", answers: [["to trade"]], options: ["to trade", "to fish", "big lake", "brave warrior"], phrasings: [
    "The name **Ottawa** comes from the word **Adawe**. What does it mean?",
  ], why: "Adawe means \"to trade.\" The Ottawa were known as traders." },
  { id: "t-miami-bands", lesson: 2, answers: [["bands", "band"]], wordBank: "always", phrasings: [
    "The **Miami** tribe was split into six small family groups called ___.",
  ], why: "The Miami had six bands. Each band had 10 to 50 people and its own chief." },
  { id: "t-match", lesson: 2, kind: "match", answers: [["Ottawa"], ["Seneca"], ["Miami"], ["Delaware"]], prompts: [
    "came from Manitoulin Island in Lake Huron", "came from New York and lived along the Sandusky River", "lived in the Maumee and Wabash river valleys", "came from the Delaware River in New Jersey",
  ], phrasings: ["Match each **tribe** to the fact about it."], why: "Ottawa: Manitoulin Island. Seneca: New York, then the Sandusky River. Miami: Maumee and Wabash valleys. Delaware: Delaware River, New Jersey." },

  // Lesson 3: The map
  { id: "m-toledo", lesson: 3, kind: "choice", answers: [["Ottawa"]], options: ["Ottawa", "Miami", "Mingo", "Shawnee"], phrasings: [
    "**Map:** Which tribe lived near **Toledo**?",
  ], why: "On the map, the Ottawa land (1760–1833) is right by Toledo, near Lake Erie." },
  { id: "m-zanesville", lesson: 3, kind: "choice", answers: [["Delaware and Shawnee"]], options: ["Delaware and Shawnee", "Ottawa and Miami", "Wyandot only", "Mingo only"], phrasings: [
    "**Map:** Which tribes shared land near **Zanesville**?",
  ], why: "Near Zanesville, the map shows Delaware & Shawnee land (1745–1781)." },
  { id: "m-chillicothe", lesson: 3, kind: "choice", answers: [["Shawnee"]], options: ["Shawnee", "Ottawa", "Wyandot", "Delaware"], phrasings: [
    "**Map:** Which tribe lived near **Chillicothe** in southern Ohio?",
  ], why: "The Shawnee (1735–1790) lived near Chillicothe in southern Ohio." },
  { id: "m-west", lesson: 3, kind: "choice", answers: [["Miami"]], options: ["Miami", "Mingo", "Delaware", "Ottawa"], phrasings: [
    "**Map:** Which tribe lived in **western** Ohio, near Dayton and Indiana?",
  ], why: "The Miami (1733–1791) lived in western Ohio, near Dayton and the Indiana border." },
  { id: "m-mingo", lesson: 3, kind: "choice", answers: [["eastern"]], options: ["eastern", "western", "northern, by Toledo", "the middle, by Columbus"], phrasings: [
    "**Map:** The **Mingo** lived along which edge of Ohio?",
  ], why: "The Mingo lived along the eastern edge of Ohio, near Pennsylvania and West Virginia." },

  // Lesson 4: Cooperation, conflict, and compromise
  { id: "c-allies", lesson: 4, kind: "choice", answers: [["Delaware and Shawnee"]], options: ["Delaware and Shawnee", "Wyandot and Seneca", "Iroquois and Wyandot", "Ottawa and Iroquois"], phrasings: [
    "Which two tribes became **allies** through a spoken treaty in the 1700s?",
  ], why: "The Delaware and Shawnee became allies with a verbal (spoken) treaty." },
  { id: "c-iroquois", lesson: 4, answers: [["Iroquois"]], wordBank: "always", phrasings: [
    "The ___ fought other tribes for control of land, so the Wyandot and Ottawa moved to Ohio.",
  ], why: "The Iroquois fought for land. That conflict pushed the Wyandot and Ottawa to Ohio." },
  { id: "c-enemies", lesson: 4, kind: "choice", answers: [["Wyandot and Seneca"]], options: ["Wyandot and Seneca", "Delaware and Shawnee", "Miami and Ottawa", "Mingo and Miami"], phrasings: [
    "**Find it:** Which two tribes were **enemies** for over 100 years?",
  ], why: "The Wyandot and Seneca were enemies for over 100 years. It started when a Seneca woman refused to marry a Wyandot man." },
  { id: "c-compromise", lesson: 4, kind: "choice", answers: [["peace"]], options: ["peace", "horses", "gold", "a new chief"], phrasings: [
    "**Compromise:** The Seneca let the Wyandot settle in Ohio. What did they get in exchange?",
  ], why: "The Seneca let the Wyandot settle in Ohio in exchange for peaceful relations. That's a compromise!" },
];

export const OHIO_TRIBES_LESSONS: { lesson: number; title: string; learn: { term: string; explain: string }[] }[] = [
  { lesson: 1, title: "Words to know", learn: [
    { term: "cooperation", explain: "Cooperation means working together to reach a shared goal." },
    { term: "conflict", explain: "A conflict is a disagreement between groups or people." },
    { term: "compromise", explain: "In a compromise, groups talk it over and each side gives up a little to reach a solution." },
    { term: "alliance and treaty", explain: "An alliance is when groups agree to work together. A treaty is a formal agreement between nations." },
    { term: "matrilineal and patrilineal", explain: "Matrilineal means family is traced through the mother. Patrilineal means it is traced through the father." },
  ] },
  { lesson: 2, title: "The tribes of Ohio", learn: [
    { term: "Delaware", explain: "The Delaware, also called the Lenape, came from the Delaware River in New Jersey. They were matrilineal. Their chief was a sachem. They had three clans: Turtle, Wolf, and Turkey." },
    { term: "Miami", explain: "The Miami lived in the Maumee and Wabash river valleys. Corn was very important. They had six bands, each with its own chief." },
    { term: "Ottawa", explain: "Ottawa comes from Adawe, which means to trade. They came from Manitoulin Island in Lake Huron and were great at fishing." },
    { term: "Wyandot", explain: "The Wyandot, first called the Wendat, came from Canada. They lived in longhouses, which held many families. They were matrilineal." },
    { term: "Seneca", explain: "The Seneca came from New York and lived along the Sandusky River. Their longhouses held up to 60 people. They were matrilineal." },
    { term: "Shawnee", explain: "The Shawnee moved a lot and lived in wigwams, small dome-shaped homes. Each group was led by a hokima. They were patrilineal." },
  ] },
  { lesson: 3, title: "The map: Tribal lands in Ohio", learn: [
    { term: "north", explain: "The Ottawa lived near Toledo. The Wyandot lived in north-central Ohio." },
    { term: "east", explain: "The Delaware lived in eastern Ohio, near Akron. The Mingo lived along the eastern border." },
    { term: "middle and south", explain: "The Delaware and Shawnee shared land near Zanesville. The Shawnee lived near Chillicothe." },
    { term: "west", explain: "The Miami lived in western Ohio, near Dayton and Indiana." },
  ] },
  { lesson: 4, title: "Cooperation, conflict, and compromise", learn: [
    { term: "cooperation", explain: "Tribes made alliances. Some marriages linked tribes in peace. The Delaware and Shawnee became allies with a spoken treaty." },
    { term: "conflict", explain: "The Iroquois fought for land, so the Wyandot and Ottawa moved to Ohio. The Wyandot and Seneca were enemies for over 100 years." },
    { term: "compromise", explain: "The Seneca let the Wyandot live in Ohio in exchange for peace. The Wyandot let the Delaware live in eastern Ohio for goods and help against enemies." },
  ] },
];
