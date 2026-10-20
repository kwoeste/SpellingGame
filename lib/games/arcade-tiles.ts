// Server-only: imports the chapter catalog, so never import this from a "use client" module.
import type { AppRole } from "@/lib/auth/allowlist";
import { NAMED_GAMES } from "@/lib/content/catalog";
import { gameVisibleTo } from "@/lib/content/games";
import {
  GROUP_LABEL,
  NAMED_META,
  numberMatchTile,
  spellingTiles,
  type ArcadeTile,
} from "@/lib/games/arcade";

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

