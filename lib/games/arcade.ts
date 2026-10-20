import type { AppRole } from "@/lib/auth/allowlist";
import { NAMED_GAMES } from "@/lib/content/catalog";
import { gameVisibleTo, type GameId } from "@/lib/content/games";
import { SPELLING_LISTS } from "@/lib/games/spelling-lists";

export type ArcadeGroup = "spelling" | "math" | "history" | "science" | "words" | "religion";

export type ArcadeBadge = "new" | "recommended" | "star";

export type ArcadeTile = {
  id: string;
  href: string;
  title: string;
  tagline: string;
  icon: string;
  group: ArcadeGroup;
  groupLabel: string;
  tint: "coral" | "teal" | "gold" | "sky" | "violet" | "rose";
  badge?: ArcadeBadge;
  stars: number;
  progress: number;
};

export const ARCADE_GROUPS: { id: ArcadeGroup | "all"; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "spelling", label: "Spelling" },
  { id: "math", label: "Math" },
  { id: "history", label: "History" },
  { id: "science", label: "Science" },
  { id: "words", label: "Word play" },
  { id: "religion", label: "Religion" },
];

const NAMED_META: Record<
  GameId,
  { tagline: string; icon: string; group: ArcadeGroup; tint: ArcadeTile["tint"] }
> = {
  "feudal-pyramid": {
    tagline: "Stack kings, nobles, knights, and serfs.",
    icon: "🏰",
    group: "history",
    tint: "gold",
  },
  "castle-siege": {
    tagline: "Match siege words to the job they do.",
    icon: "🛡️",
    group: "history",
    tint: "gold",
  },
  "market-day": {
    tagline: "Help the merchant before curfew.",
    icon: "🧺",
    group: "history",
    tint: "coral",
  },
  "battle-1066": {
    tagline: "Replay Hastings on a tapestry.",
    icon: "⚔️",
    group: "history",
    tint: "rose",
  },
  "magna-carta": {
    tagline: "Fair or unfair? Court is in session.",
    icon: "⚖️",
    group: "history",
    tint: "violet",
  },
  "prefix-forge": {
    tagline: "Hammer un-, non-, and en- onto words.",
    icon: "🔨",
    group: "words",
    tint: "sky",
  },
  "ten-commandments": {
    tagline: "Love God or love neighbor?",
    icon: "📜",
    group: "religion",
    tint: "violet",
  },
  beatitudes: {
    tagline: "Match the blessing to the promise.",
    icon: "💛",
    group: "religion",
    tint: "gold",
  },
  "church-year": {
    tagline: "Place the day on the Church-year wheel.",
    icon: "🕯️",
    group: "religion",
    tint: "violet",
  },
  "prayer-builder": {
    tagline: "Build the Lord's Prayer in order.",
    icon: "🙏",
    group: "religion",
    tint: "rose",
  },
  "saint-cards": {
    tagline: "Who am I? Sort the saint to the clue.",
    icon: "🕊️",
    group: "religion",
    tint: "sky",
  },
  "stream-steepness": {
    tagline: "A steeper stream carries more.",
    icon: "🌊",
    group: "science",
    tint: "teal",
  },
  "circuit-builder": {
    tagline: "Close the loop. What happens?",
    icon: "💡",
    group: "science",
    tint: "gold",
  },
};

const GROUP_LABEL: Record<ArcadeGroup, string> = {
  spelling: "Spelling",
  math: "Math",
  history: "History",
  science: "Science",
  words: "Word play",
  religion: "Religion",
};

export function numberMatchTile(stars = 0, badge?: ArcadeBadge): ArcadeTile {
  return {
    id: "number-match",
    href: "/number-match",
    title: "Number Match",
    tagline: "Hide a number. First to 3, 5, or 10.",
    icon: "🎲",
    group: "math",
    groupLabel: GROUP_LABEL.math,
    tint: "sky",
    badge,
    stars,
    progress: stars > 0 ? 100 : 0,
  };
}

export function spellingTiles(starredIds: Set<string>, recommendedId?: string): ArcadeTile[] {
  return SPELLING_LISTS.map((list, index) => {
    const starred = starredIds.has(`spelling:${list.id}`);
    const recommended = list.id === recommendedId;
    return {
      id: `spelling:${list.id}`,
      href: list.id === "d1" ? "/spelling-game" : `/spelling-game/${list.id}`,
      title: list.shortTitle,
      tagline: list.tagline,
      icon: list.icon,
      group: "spelling" as const,
      groupLabel: GROUP_LABEL.spelling,
      tint: index === 0 ? "coral" : index % 2 === 0 ? "gold" : "rose",
      badge: recommended ? "recommended" : index === 0 ? "new" : undefined,
      stars: starred ? 3 : 0,
      progress: starred ? 100 : 0,
    };
  });
}

export function namedGameTiles(role: AppRole, badges: string[]): ArcadeTile[] {
  const stars = new Set(badges);
  return NAMED_GAMES.filter((game) => gameVisibleTo(game.id, role)).map((game) => {
    const meta = NAMED_META[game.id];
    const starred = stars.has(`${game.id}-star`) || stars.has(`game:${game.id}`);
    return {
      id: game.id,
      href: `/games/${game.id}`,
      title: game.title,
      tagline: meta.tagline,
      icon: meta.icon,
      group: meta.group,
      groupLabel: GROUP_LABEL[meta.group],
      tint: meta.tint,
      badge: starred ? "star" : undefined,
      stars: starred ? 3 : 0,
      progress: starred ? 100 : 0,
    };
  });
}

export function arcadeTiles(args: {
  role: AppRole;
  badges: string[];
  recommendedSpellingId?: string;
}): ArcadeTile[] {
  return [
    ...spellingTiles(new Set(args.badges), args.recommendedSpellingId),
    numberMatchTile(args.badges.includes("number-match-star") ? 3 : 0),
    ...namedGameTiles(args.role, args.badges),
  ];
}

export function featuredTile(tiles: ArcadeTile[], resumeHref?: string | null): ArcadeTile {
  const resume = resumeHref ? tiles.find((tile) => tile.href === resumeHref) : undefined;
  if (resume) return { ...resume, badge: "recommended" };
  const recommended = tiles.find((tile) => tile.badge === "recommended");
  if (recommended) return recommended;
  return tiles[0];
}

export function groupArcade(tiles: ArcadeTile[]): { group: ArcadeGroup; label: string; tiles: ArcadeTile[] }[] {
  const order: ArcadeGroup[] = ["spelling", "math", "history", "science", "words", "religion"];
  return order
    .map((group) => ({
      group,
      label: GROUP_LABEL[group],
      tiles: tiles.filter((tile) => tile.group === group),
    }))
    .filter((row) => row.tiles.length > 0);
}
