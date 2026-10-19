import type { AppRole } from "@/lib/auth/allowlist";

export type GameId =
  | "feudal-pyramid"
  | "castle-siege"
  | "market-day"
  | "battle-1066"
  | "magna-carta"
  | "prefix-forge"
  | "ten-commandments"
  | "beatitudes"
  | "church-year"
  | "prayer-builder"
  | "saint-cards"
  | "stream-steepness"
  | "circuit-builder";

export type GameSpec = {
  prompt: string;
  bins: string[];
  items: { label: string; bin: string }[];
  /** Religion games stay admin-only until Kevin (or the school) approves them. */
  pendingReligionReview?: boolean;
};

const GAME_DATA: Record<GameId, GameSpec> = {
  "feudal-pyramid": {
    prompt: "Build the feudal pyramid. Who stands where?",
    bins: ["King", "Nobles", "Knights", "Serfs"],
    items: [
      { label: "Gives land and expects loyalty", bin: "King" },
      { label: "Hold land from the king", bin: "Nobles" },
      { label: "Fight and protect the manor", bin: "Knights" },
      { label: "Farm the land and share crops", bin: "Serfs" },
    ],
  },
  "castle-siege": {
    prompt: "Repair the wall. Match the word to the job it does.",
    bins: ["siege", "armor", "ransom", "enclose"],
    items: [
      { label: "An army traps people inside", bin: "siege" },
      { label: "Metal covering in a fight", bin: "armor" },
      { label: "Money to free a captive", bin: "ransom" },
      { label: "Shut in on all sides", bin: "enclose" },
    ],
  },
  "market-day": {
    prompt: "Help the merchant before curfew. Sort the jobs.",
    bins: ["merchant", "apprentice", "curfew", "market"],
    items: [
      { label: "Buys and sells goods", bin: "merchant" },
      { label: "Learns a craft", bin: "apprentice" },
      { label: "Time to be indoors", bin: "curfew" },
      { label: "Place where stalls open", bin: "market" },
    ],
  },
  "battle-1066": {
    prompt: "Replay 1066. Put each move on the tapestry.",
    bins: ["claim", "battle", "tactic", "after"],
    items: [
      { label: "Two leaders want the crown", bin: "claim" },
      { label: "Armies meet near Hastings", bin: "battle" },
      { label: "A feigned retreat", bin: "tactic" },
      { label: "A new ruler tells the story", bin: "after" },
    ],
  },
  "magna-carta": {
    prompt: "Court is in session. Fair or unfair?",
    bins: ["fair", "unfair"],
    items: [
      { label: "A king must follow written limits", bin: "fair" },
      { label: "A king seizes land with no talk", bin: "unfair" },
      { label: "Judges hear a case", bin: "fair" },
      { label: "A person is punished with no hearing", bin: "unfair" },
    ],
  },
  "prefix-forge": {
    prompt: "Forge a word. Attach the prefix.",
    bins: ["un-", "non-", "en-"],
    items: [
      { label: "happy → not happy", bin: "un-" },
      { label: "sense → not sense", bin: "non-" },
      { label: "able → make able", bin: "en-" },
      { label: "danger → put in danger", bin: "en-" },
    ],
  },
  "ten-commandments": {
    pendingReligionReview: true,
    prompt: "Love God (1–3) or love neighbor (4–10)?",
    bins: ["Love God", "Love Neighbor"],
    items: [
      { label: "Keep God's name holy", bin: "Love God" },
      { label: "Keep the Lord's Day", bin: "Love God" },
      { label: "Honor family", bin: "Love Neighbor" },
      { label: "Tell the truth", bin: "Love Neighbor" },
    ],
  },
  beatitudes: {
    pendingReligionReview: true,
    prompt: "Match the blessing to the promise.",
    bins: ["merciful", "peacemakers", "poor in spirit", "those who mourn"],
    items: [
      { label: "They will be shown mercy", bin: "merciful" },
      { label: "They will be called children of God", bin: "peacemakers" },
      { label: "The kingdom of heaven is theirs", bin: "poor in spirit" },
      { label: "They will be comforted", bin: "those who mourn" },
    ],
  },
  "church-year": {
    pendingReligionReview: true,
    prompt: "Place the day on the Church-year wheel.",
    bins: ["Advent", "Christmas", "Lent", "Easter"],
    items: [
      { label: "We wait and hope (purple)", bin: "Advent" },
      { label: "Jesus is born (white)", bin: "Christmas" },
      { label: "We prepare with prayer (purple)", bin: "Lent" },
      { label: "Jesus is risen (white)", bin: "Easter" },
    ],
  },
  "prayer-builder": {
    pendingReligionReview: true,
    prompt: "Build the Lord's Prayer in order.",
    bins: ["1", "2", "3", "4"],
    items: [
      { label: "Our Father who art in heaven", bin: "1" },
      { label: "hallowed be thy name", bin: "2" },
      { label: "thy kingdom come", bin: "3" },
      { label: "thy will be done", bin: "4" },
    ],
  },
  "saint-cards": {
    pendingReligionReview: true,
    prompt: "Who am I? Sort the saint to the clue.",
    bins: ["Joan of Arc", "John Bosco", "Francis", "Martha"],
    items: [
      { label: "Brave helper of France", bin: "Joan of Arc" },
      { label: "Friend of young people", bin: "John Bosco" },
      { label: "Loved creation and the poor", bin: "Francis" },
      { label: "Welcomed Jesus in her home", bin: "Martha" },
    ],
  },
  "stream-steepness": {
    prompt: "A steeper stream carries more. Sort the result.",
    bins: ["gentle slope", "steep slope"],
    items: [
      { label: "Water moves slowly", bin: "gentle slope" },
      { label: "Little soil is carried", bin: "gentle slope" },
      { label: "Water races downhill", bin: "steep slope" },
      { label: "More soil is eroded", bin: "steep slope" },
    ],
  },
  "circuit-builder": {
    prompt: "Close the loop. What happens?",
    bins: ["complete loop", "open loop"],
    items: [
      { label: "The bulb can light", bin: "complete loop" },
      { label: "Electricity can flow", bin: "complete loop" },
      { label: "The bulb stays dark", bin: "open loop" },
      { label: "The path is broken", bin: "open loop" },
    ],
  },
};

export function isGameId(value: string): value is GameId {
  return Object.hasOwn(GAME_DATA, value);
}

export function gameSpec(id: GameId): GameSpec {
  return GAME_DATA[id];
}

export function gameVisibleTo(id: string, role: AppRole): boolean {
  if (!isGameId(id)) return false;
  return role === "admin" || !GAME_DATA[id].pendingReligionReview;
}
