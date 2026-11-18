import { COLONIES, MAP_NAME_IDS, MAP_TAP_IDS, REGIONS, SPELL_TEST_IDS, coloniesInRegion, colonyById, regionById, type ColonyId } from "@/lib/content/colonies";
import type { PracticeFact } from "@/lib/practice/types";

/**
 * Social studies: the 13 original colonies. Our own short wording.
 * The full practice test is one of each fact: region sort, map labeling,
 * the farthest-south question, compass items, and a few spellings.
 */
const REGION_OPTIONS = REGIONS.map((region) => region.name);

function sortFact(id: ColonyId): PracticeFact {
  const colony = colonyById(id);
  const region = regionById(colony.regionId);
  return {
    id: `reg-${id}`,
    lesson: 1,
    kind: "choice",
    activity: "sort",
    card: colony.name,
    answers: [[region.name]],
    options: [...REGION_OPTIONS],
    phrasings: [`Which region does ${colony.name} belong in?`, `Sort ${colony.name} into its region.`],
    why: `${colony.name} is in ${region.name === "New England" ? "New England" : `the ${region.name}`}.`,
  };
}

function mapNameFact(id: ColonyId): PracticeFact {
  const colony = colonyById(id);
  const region = regionById(colony.regionId);
  return {
    id: `map-${id}`,
    lesson: 2,
    kind: "blank",
    activity: "map-name",
    highlightId: id,
    exactOnly: true,
    wordBank: "always",
    answers: [[colony.name]],
    phrasings: ["Name the colony that is lit up on the map.", "The highlighted colony is which colony?"],
    why: `That shape is ${colony.name}. It is in ${region.name === "New England" ? "New England" : `the ${region.name}`}.`,
  };
}

function mapTapFact(id: ColonyId): PracticeFact {
  const colony = colonyById(id);
  return {
    id: `tap-${id}`,
    lesson: 2,
    kind: "tap",
    activity: "map-tap",
    card: colony.name,
    answers: [[id]],
    phrasings: [`Tap ${colony.name} on the map.`, `Find ${colony.name}. Tap its shape.`],
    why: `${colony.name} is the shape for that name. North is up and the ocean is east.`,
  };
}

function spellFact(id: ColonyId): PracticeFact {
  const colony = colonyById(id);
  return {
    id: `spell-${id}`,
    lesson: 4,
    kind: "spell",
    activity: "spell",
    answers: [[colony.name]],
    oops: colony.oops,
    trickyAt: colony.trickyAt,
    trickyLen: colony.trickyLen,
    phrasings: [colony.sentence],
    why: `${colony.name} is spelled just like that. ${colony.oops} is a miss.`,
  };
}

const CHALLENGES: PracticeFact[] = [
  {
    id: "ch-region-south",
    lesson: 3,
    kind: "choice",
    answers: [["Southern Colonies"]],
    options: ["New England", "Middle Colonies", "Southern Colonies"],
    phrasings: ["Which region was farthest south?", "Which group of colonies sat farthest south?"],
    why: "The Southern Colonies were farthest south. Georgia was the colony at the bottom.",
  },
  {
    id: "ch-colony-south",
    lesson: 3,
    kind: "choice",
    answers: [["Georgia"]],
    options: ["Georgia", "Virginia", "Massachusetts", "Pennsylvania"],
    phrasings: ["Which colony is farthest south?", "Which colony sits at the bottom of the map?"],
    why: "Georgia is the farthest south of the 13 colonies.",
  },
  {
    id: "ch-compass-north",
    lesson: 3,
    kind: "choice",
    compass: true,
    answers: [["North"]],
    options: ["North", "South", "East", "West"],
    phrasings: ["The letter N is at the top of the compass. Which direction is that?", "Which direction is the top of our map?"],
    why: "N means north. On our map, north is up.",
  },
  {
    id: "ch-compass-east",
    lesson: 3,
    kind: "choice",
    compass: true,
    answers: [["East"]],
    options: ["North", "South", "East", "West"],
    phrasings: ["The ocean is on the right side of our map. Which direction is that?", "Which direction points toward the ocean?"],
    why: "East points toward the ocean. E is on the right side of the compass.",
  },
  {
    id: "ch-north-neighbor",
    lesson: 3,
    kind: "choice",
    answers: [["New Hampshire"]],
    options: ["New Hampshire", "Georgia", "Virginia", "Pennsylvania"],
    phrasings: ["Which colony is just north of Massachusetts?", "Which colony touches Massachusetts on its north side?"],
    why: "New Hampshire is just north of Massachusetts. Both are in New England.",
  },
];

export const COLONIES_FACTS: PracticeFact[] = [
  ...COLONIES.map((colony) => sortFact(colony.id)),
  ...MAP_NAME_IDS.map(mapNameFact),
  ...MAP_TAP_IDS.map(mapTapFact),
  ...CHALLENGES,
  ...SPELL_TEST_IDS.map(spellFact),
];

const lists = {
  "new-england": coloniesInRegion("new-england").map((colony) => colony.name).join(", "),
  middle: coloniesInRegion("middle").map((colony) => colony.name).join(", "),
  southern: coloniesInRegion("southern").map((colony) => colony.name).join(", "),
};

export const COLONIES_LESSONS: { lesson: number; title: string; learn: { term: string; explain: string }[] }[] = [
  {
    lesson: 1,
    title: "Three regions",
    learn: [
      { term: "New England", explain: `${regionById("new-england").blurb} The colonies are ${lists["new-england"]}.` },
      { term: "Middle Colonies", explain: `${regionById("middle").blurb} The colonies are ${lists.middle}.` },
      { term: "Southern Colonies", explain: `${regionById("southern").blurb} The colonies are ${lists.southern}.` },
    ],
  },
  {
    lesson: 2,
    title: "The east-coast map",
    learn: [
      { term: "North to south", explain: "On the map, north is up and south is down. New Hampshire is toward the top. Georgia is at the bottom." },
      { term: "Neighbors", explain: "Colonies that touch are neighbors. Massachusetts is just south of New Hampshire. North Carolina is just south of Virginia." },
      { term: "The ocean", explain: "The ocean is on the east side of the map. West is inland, away from the ocean." },
    ],
  },
  {
    lesson: 3,
    title: "Farthest south and the compass",
    learn: [
      { term: "Farthest south", explain: "The Southern Colonies are the region farthest south. Georgia is the colony farthest south." },
      { term: "Compass", explain: "A compass rose shows four directions. N means north, S means south, E means east, and W means west. North is the top of our map." },
    ],
  },
  {
    lesson: 4,
    title: "Spell the tricky names",
    learn: [
      { term: "Pennsylvania", explain: "Pennsylvania has two n's right together near the start." },
      { term: "Connecticut", explain: "Connecticut has two n's too, right after the Co." },
      { term: "Massachusetts", explain: "Massachusetts has two s's near the start and two t's near the end." },
      { term: "Rhode Island", explain: "Rhode Island is two words. It starts with Rh, not Road." },
    ],
  },
];
