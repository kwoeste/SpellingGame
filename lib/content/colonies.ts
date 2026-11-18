import { SPELL_CUE } from "@/lib/content/colonies-spell";

/**
 * The 13 original colonies. Our own simplified east-coast drawing (not a published map).
 * North is up. The ocean is east. Shapes share edges so neighbors touch.
 */
export const COLONIES_CHAPTER_ID = "ss.colonies";

export const COLONIES_FRAME = { viewBox: "0 0 460 900", oceanX: 382, compassX: 408, compassY: 78 };

export type RegionId = "new-england" | "middle" | "southern";
export type ColonyId = "nh" | "ma" | "ri" | "ct" | "ny" | "nj" | "pa" | "de" | "md" | "va" | "nc" | "sc" | "ga";
export type ColoniesPlay = "overview" | "sort" | "map" | "spell" | "cards";

export type ColonyShape = {
  id: ColonyId;
  points: readonly (readonly [number, number])[];
  /** A point that sits inside this shape, used for the name and for tests. */
  label: readonly [number, number];
};

type Pt = readonly [number, number];

function rect(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export const COLONY_SHAPES: readonly ColonyShape[] = [
  { id: "nh", points: rect(248, 16, 100, 80), label: [298, 56] },
  { id: "ma", points: rect(168, 96, 180, 80), label: [258, 136] },
  { id: "ri", points: rect(300, 176, 80, 74), label: [340, 213] },
  { id: "ct", points: rect(168, 176, 132, 74), label: [234, 213] },
  {
    id: "ny",
    points: [
      [40, 40],
      [248, 40],
      [248, 96],
      [168, 96],
      [168, 340],
      [40, 340],
    ],
    label: [110, 190],
  },
  { id: "nj", points: rect(168, 250, 212, 150), label: [270, 325] },
  {
    id: "pa",
    points: [
      [40, 340],
      [168, 340],
      [168, 400],
      [250, 400],
      [250, 490],
      [40, 490],
    ],
    label: [100, 420],
  },
  { id: "de", points: rect(250, 400, 80, 90), label: [290, 445] },
  { id: "md", points: rect(40, 490, 290, 90), label: [180, 535] },
  { id: "va", points: rect(40, 580, 290, 80), label: [180, 620] },
  { id: "nc", points: rect(48, 660, 292, 70), label: [190, 695] },
  { id: "sc", points: rect(56, 730, 284, 70), label: [190, 765] },
  { id: "ga", points: rect(64, 800, 260, 70), label: [190, 835] },
];

export function shapePath(points: readonly Pt[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";
}

export function shapeBounds(points: readonly Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Ray cast. Used to prove each label sits in its own colony and not a neighbor. */
export function pointInShape(x: number, y: number, points: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i]?.[0] ?? 0;
    const yi = points[i]?.[1] ?? 0;
    const xj = points[j]?.[0] ?? 0;
    const yj = points[j]?.[1] ?? 0;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export const REGION_FILL: Record<RegionId, string> = {
  "new-england": "#c5e4f8",
  middle: "#f8e3a8",
  southern: "#f8c9d6",
};

export const REGION_STROKE: Record<RegionId, string> = {
  "new-england": "#1d7fc4",
  middle: "#b7791f",
  southern: "#d9486f",
};

export type RegionInfo = {
  id: RegionId;
  name: string;
  blurb: string;
};

export const REGIONS: readonly RegionInfo[] = [
  {
    id: "new-england",
    name: "New England",
    blurb: "New England is farthest north. Winters were cold and the ground was rocky, so people fished and built ships.",
  },
  {
    id: "middle",
    name: "Middle Colonies",
    blurb: "The Middle Colonies had good soil for farms. They grew so much wheat that people called them the breadbasket.",
  },
  {
    id: "southern",
    name: "Southern Colonies",
    blurb: "The Southern Colonies are farthest south. The weather was warm, and the farms were large.",
  },
];

export type ColonyInfo = {
  id: ColonyId;
  name: string;
  regionId: RegionId;
  oops: string;
  trickyAt: number;
  trickyLen: number;
  /** Sentence format. The colony's own name is not in the sentence. */
  sentence: string;
};

export const COLONIES: readonly ColonyInfo[] = [
  { id: "nh", name: "New Hampshire", regionId: "new-england", oops: "New Hamshire", trickyAt: 7, trickyLen: 1, sentence: "The colony just north of Massachusetts is called ___." },
  { id: "ma", name: "Massachusetts", regionId: "new-england", oops: "Massachusets", trickyAt: 10, trickyLen: 2, sentence: "The New England colony just south of New Hampshire is called ___." },
  { id: "ri", name: "Rhode Island", regionId: "new-england", oops: "Road Island", trickyAt: 1, trickyLen: 1, sentence: "The small New England colony just east of Connecticut is called ___." },
  { id: "ct", name: "Connecticut", regionId: "new-england", oops: "Conneticut", trickyAt: 2, trickyLen: 2, sentence: "The New England colony just west of Rhode Island is called ___." },
  { id: "ny", name: "New York", regionId: "middle", oops: "New Yrok", trickyAt: 5, trickyLen: 2, sentence: "The large Middle colony just west of Connecticut is called ___." },
  { id: "nj", name: "New Jersey", regionId: "middle", oops: "New Jersy", trickyAt: 8, trickyLen: 1, sentence: "The Middle colony on the coast, just south of New York, is called ___." },
  { id: "pa", name: "Pennsylvania", regionId: "middle", oops: "Pensylvania", trickyAt: 2, trickyLen: 2, sentence: "The Middle colony west of New Jersey, known for wheat farms, is called ___." },
  { id: "de", name: "Delaware", regionId: "middle", oops: "Deleware", trickyAt: 3, trickyLen: 1, sentence: "The small Middle colony just south of New Jersey is called ___." },
  { id: "md", name: "Maryland", regionId: "southern", oops: "Marylind", trickyAt: 5, trickyLen: 1, sentence: "The Southern colony just south of Pennsylvania is called ___." },
  { id: "va", name: "Virginia", regionId: "southern", oops: "Virgina", trickyAt: 6, trickyLen: 1, sentence: "The Southern colony just south of Maryland is called ___." },
  { id: "nc", name: "North Carolina", regionId: "southern", oops: "North Caralina", trickyAt: 9, trickyLen: 1, sentence: "The Southern colony just south of Virginia is called ___." },
  { id: "sc", name: "South Carolina", regionId: "southern", oops: "South Caralina", trickyAt: 9, trickyLen: 1, sentence: "The Southern colony between North Carolina and Georgia is called ___." },
  { id: "ga", name: "Georgia", regionId: "southern", oops: "Gerogia", trickyAt: 2, trickyLen: 2, sentence: "The colony farthest south is called ___." },
];

export const MAP_NAME_IDS: readonly ColonyId[] = ["nh", "ma", "ri", "ct", "pa", "nc", "sc"];
export const MAP_TAP_IDS: readonly ColonyId[] = ["ny", "nj", "de", "md", "va", "ga"];
export const SPELL_TEST_IDS: readonly ColonyId[] = ["pa", "ct", "ma", "ri"];

export function regionById(id: RegionId): RegionInfo {
  const region = REGIONS.find((item) => item.id === id);
  if (!region) throw new Error(`Unknown region ${id}`);
  return region;
}

export function colonyById(id: ColonyId): ColonyInfo {
  const colony = COLONIES.find((item) => item.id === id);
  if (!colony) throw new Error(`Unknown colony ${id}`);
  return colony;
}

export function coloniesInRegion(id: RegionId): ColonyInfo[] {
  return COLONIES.filter((colony) => colony.regionId === id);
}

export function labelLines(name: string): string[] {
  if (name === "New Hampshire" || name === "Rhode Island" || name === "North Carolina" || name === "South Carolina") {
    return name.split(" ");
  }
  return [name];
}

export type QuizMap = {
  viewBox: string;
  oceanX: number;
  compassX: number;
  compassY: number;
  shapes: { id: ColonyId; d: string }[];
};

/** Shapes only. No names and no region colors, so a practice question cannot be read off the payload. */
export function coloniesMapPublic(): QuizMap {
  return {
    viewBox: COLONIES_FRAME.viewBox,
    oceanX: COLONIES_FRAME.oceanX,
    compassX: COLONIES_FRAME.compassX,
    compassY: COLONIES_FRAME.compassY,
    shapes: COLONY_SHAPES.map((shape) => ({ id: shape.id, d: shapePath(shape.points) })),
  };
}

export const COLONIES_PROMPTS = {
  sort: "Sort each colony into its region. Tap a colony, then tap New England, the Middle Colonies, or the Southern Colonies.",
  mapName: "This colony is lit up on the map. Pick or type its name.",
  mapTap: "Read the colony name. Then tap that colony on the map.",
  spell: "Spell the colony name. Read the question before you answer.",
  cards: "Read every word on the card. Then flip it.",
  overview: "These 13 colonies sat on the east coast. North is up. The ocean is east.",
} as const;

export const COLONIES_CARDS: { front: string; back: string }[] = [
  ...COLONIES.map((colony) => ({ front: `Which region is ${colony.name} in?`, back: regionById(colony.regionId).name })),
  { front: "Which region is farthest south?", back: "The Southern Colonies." },
  { front: "Which colony is farthest south?", back: "Georgia." },
  { front: "Which direction is the top of the map?", back: "North." },
];

export function coloniesPlayFrom(value: string | undefined): ColoniesPlay {
  if (value === "sort" || value === "map" || value === "spell" || value === "cards") return value;
  return "overview";
}

export function coloniesPlayIsGame(play: ColoniesPlay): boolean {
  switch (play) {
    case "overview":
      return false;
    case "sort":
    case "map":
    case "spell":
    case "cards":
      return true;
    default: {
      const unreachable: never = play;
      return unreachable;
    }
  }
}

export function coloniesStudioProps(play: ColoniesPlay) {
  const shapeById = new Map(COLONY_SHAPES.map((shape) => [shape.id, shape]));
  const labels: Record<string, { x: number; y: number; lines: string[] }> = {};
  const fills: Record<string, string> = {};
  const strokes: Record<string, string> = {};
  for (const colony of COLONIES) {
    const shape = shapeById.get(colony.id);
    if (!shape) continue;
    labels[colony.id] = { x: shape.label[0], y: shape.label[1], lines: labelLines(colony.name) };
    fills[colony.id] = REGION_FILL[colony.regionId];
    strokes[colony.id] = REGION_STROKE[colony.regionId];
  }
  return {
    play,
    chapterId: COLONIES_CHAPTER_ID,
    frame: COLONIES_FRAME,
    shapes: COLONY_SHAPES.map((shape) => ({ id: shape.id, d: shapePath(shape.points) })),
    labels,
    fills,
    strokes,
    regions: REGIONS.map((region) => ({
      id: region.id,
      name: region.name,
      blurb: region.blurb,
      colonies: coloniesInRegion(region.id).map((colony) => colony.name),
    })),
    colonies: COLONIES.map((colony) => ({
      id: colony.id,
      name: colony.name,
      regionId: colony.regionId,
      regionName: regionById(colony.regionId).name,
      oops: colony.oops,
      trickyAt: colony.trickyAt,
      trickyLen: colony.trickyLen,
      sentence: colony.sentence,
    })),
    cards: COLONIES_CARDS,
    prompts: COLONIES_PROMPTS,
  };
}

/** Extra lines for scripts/tts-prewarm.ts --area=practice (chapter sentences come from --area=study). */
export function coloniesSpokenLines(): string[] {
  const cues = [...Object.values(COLONIES_PROMPTS), ...Object.values(SPELL_CUE)];
  return [
    ...cues,
    ...REGIONS.map((region) => region.blurb),
    ...COLONIES.map((colony) => colony.name),
    ...COLONIES.map((colony) => colony.sentence.replace(/___/g, "blank")),
    ...COLONIES_CARDS.flatMap((card) => [card.front, card.back]),
  ];
}
