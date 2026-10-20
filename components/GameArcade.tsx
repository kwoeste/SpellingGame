"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ARCADE_GROUPS,
  featuredTile,
  groupArcade,
  type ArcadeGroup,
  type ArcadeTile,
} from "@/lib/games/arcade";

function Stars({ count }: { count: number }) {
  if (count === 0) return null;
  return <div className="stars" aria-label={`${count} of 3 stars`}>{`${"★".repeat(count)}${"☆".repeat(3 - count)}`}</div>;
}

function TileCard({ tile }: { tile: ArcadeTile }) {
  const reduce = useReducedMotion();
  return (
    <motion.div whileHover={reduce ? undefined : { y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
    <Link href={tile.href} className={`arcade-tile arcade-tile-big ${tile.tint}`}>
      {tile.badge ? <span className={`badge ${tile.badge}`}>{tile.badge === "star" ? "★" : tile.badge === "new" ? "New" : "Play next"}</span> : null}
      <div className="icon" aria-hidden="true">
        {tile.icon}
      </div>
      <h3>{tile.title}</h3>
      <p>{tile.tagline}</p>
      <Stars count={tile.stars} />
      <span className="chip">{tile.groupLabel}</span>
    </Link>
    </motion.div>
  );
}

export function GameArcade({ tiles, resumeHref }: { tiles: ArcadeTile[]; resumeHref?: string | null }) {
  const [filter, setFilter] = useState<ArcadeGroup | "all" | "more">("all");
  const visible = useMemo(
    () => {
      if (filter === "all") return tiles;
      if (filter === "more") return tiles.filter((tile) => tile.group === "words");
      return tiles.filter((tile) => tile.group === filter);
    },
    [filter, tiles],
  );
  const groups = groupArcade(visible);
  const featured = featuredTile(tiles, resumeHref);
  const hasWords = tiles.some((tile) => tile.group === "words");
  const filterIds = ARCADE_GROUPS.filter((group) => {
    if (group.id === "all") return true;
    if (group.id === "more") return hasWords;
    return tiles.some((tile) => tile.group === group.id);
  });

  return (
    <section aria-labelledby="arcade-heading">
      <p className="kid-kicker">Game arcade</p>
      <h2 id="arcade-heading">Pick a game</h2>
      {featured ? (
        <Link href={featured.href} className="arcade-hero-banner">
          <div className="arcade-hero-icon">
            {featured.icon}
          </div>
          <div className="arcade-hero-content">
            <span className="arcade-hero-label">▶ Play next</span>
            <h3>{featured.title}</h3>
            <p>{featured.tagline}</p>
          </div>
          <span className="arcade-hero-btn">Play</span>
        </Link>
      ) : null}
      <div className="arcade-filters" role="group" aria-label="Filter games">
        {filterIds.map((group) => (
          <button key={group.id} type="button" aria-pressed={filter === group.id} onClick={() => setFilter(group.id)}>
            {group.label}
          </button>
        ))}
      </div>
      {(() => {
        const smallGroups = groups.filter((g) => g.tiles.length === 1);
        const regularGroups = groups.filter((g) => g.tiles.length > 1);
        const moreGames = smallGroups.flatMap((g) => g.tiles);
        return (
          <>
            {regularGroups.map((group) => (
              <div key={group.group} style={{ marginBottom: 22 }}>
                <h3>{group.label}</h3>
                <div className="arcade-grid">
                  {group.tiles.map((tile) => (
                    <TileCard key={tile.id} tile={tile} />
                  ))}
                </div>
              </div>
            ))}
            {moreGames.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <h3>More games</h3>
                <div className="arcade-grid">
                  {moreGames.map((tile) => (
                    <TileCard key={tile.id} tile={tile} />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </section>
  );
}
